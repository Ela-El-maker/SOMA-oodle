/**
 * core/CapabilityRegistry.js
 *
 * Pluggable capability system for SOMA.
 *
 * Capabilities augment the brain's context with real-world data — they never
 * replace reasoning. Each capability registers a trigger (returns true/false or
 * a 0–1 relevance score) and an async handler that returns data.
 *
 * Guarantees:
 *  - Capabilities run in parallel, never sequentially blocking each other
 *  - Each capability is independently timeout-isolated (default 5s)
 *  - Any capability failure is caught and logged — never propagates to chat
 *  - Trigger errors are silently skipped — a bad trigger can't break the pipeline
 *  - Formatted output is capped at maxChars to prevent prompt bloat
 */

import fs from 'fs/promises';
import path from 'path';

class CapabilityRegistry {
  constructor() {
    this._caps = new Map(); // name → capability definition + metrics
  }

  /**
   * Register a capability.
   *
   * @param {Object}   opts
   * @param {string}   opts.name        - Unique kebab-case identifier
   * @param {string}   opts.description - What it does (shown to the brain as label)
   * @param {string}   [opts.category]  - 'data' | 'tool' | 'knowledge' | 'action' (default: 'data')
   * @param {Function} opts.trigger     - (query: string, context: object) => boolean | number (0–1 relevance)
   * @param {Function} opts.handler     - async (query: string, context: object) => any  (return null to skip injection)
   * @param {number}   [opts.priority]  - 0–100, higher runs first (default: 50)
   * @param {number}   [opts.timeout]   - ms before handler is abandoned (default: 5000)
   * @param {boolean}  [opts.enabled]   - Start enabled? (default: true)
   * @param {string}   [opts.version]   - Semver string (default: '1.0.0')
   * @param {string}   [opts.author]    - Who registered it (default: 'system')
   */
  register(opts) {
    // Validate required fields
    if (!opts || typeof opts !== 'object') throw new Error('[CapabilityRegistry] register() requires an options object');
    if (!opts.name) throw new Error('[CapabilityRegistry] register() requires opts.name');
    if (typeof opts.trigger !== 'function') throw new Error(`[CapabilityRegistry] ${opts.name}: trigger must be a function`);
    if (typeof opts.handler !== 'function') throw new Error(`[CapabilityRegistry] ${opts.name}: handler must be a function`);

    this._caps.set(opts.name, {
      name:        opts.name,
      description: opts.description || opts.name,
      category:    opts.category    || 'data',
      trigger:     opts.trigger,
      handler:     opts.handler,
      priority:    typeof opts.priority === 'number' ? Math.min(100, Math.max(0, opts.priority)) : 50,
      timeout:     typeof opts.timeout  === 'number' ? opts.timeout : 5000,
      enabled:     opts.enabled !== false,
      version:     opts.version || '1.0.0',
      author:      opts.author  || 'system',
      registeredAt: Date.now(),
      metrics: { calls: 0, successes: 0, failures: 0, totalLatencyMs: 0, lastUsed: null }
    });
    console.log(`[CapabilityRegistry] ✓ Registered: ${opts.name} (${opts.category || 'data'}, priority ${opts.priority ?? 50})`);
    return this; // chainable
  }

  unregister(name) {
    const removed = this._caps.delete(name);
    if (removed) console.log(`[CapabilityRegistry] Unregistered: ${name}`);
    return removed;
  }

  enable(name) {
    const cap = this._caps.get(name);
    if (cap) { cap.enabled = true; console.log(`[CapabilityRegistry] Enabled: ${name}`); }
    return !!cap;
  }

  disable(name) {
    const cap = this._caps.get(name);
    if (cap) { cap.enabled = false; console.log(`[CapabilityRegistry] Disabled: ${name}`); }
    return !!cap;
  }

  get(name) { return this._caps.get(name); }

  getAll() { return Array.from(this._caps.values()); }

  /**
   * Find all capabilities whose trigger fires for the given query.
   * Returns matches sorted by (relevance × priority) descending.
   * Trigger errors are silently skipped.
   */
  async match(query, context = {}) {
    const matches = [];
    for (const cap of this._caps.values()) {
      if (!cap.enabled) continue;
      try {
        const raw = cap.trigger(query, context);
        // Support boolean (true→1.0) and numeric relevance (0–1)
        const relevance = raw === true ? 1.0 : raw === false || !raw ? 0 : Math.min(1, Math.max(0, Number(raw)));
        if (relevance > 0) matches.push({ cap, relevance });
      } catch (err) {
        // A broken trigger is logged once but never blocks the pipeline
        console.warn(`[CapabilityRegistry] Trigger error in "${cap.name}": ${err.message}`);
      }
    }
    // Sort by combined score: relevance (0–1) × priority (0–100)
    return matches
      .sort((a, b) => (b.relevance * b.cap.priority) - (a.relevance * a.cap.priority))
      .map(({ cap, relevance }) => ({ ...cap, relevance }));
  }

  /**
   * Run all matching capabilities IN PARALLEL, each timeout-isolated.
   * Returns an array of enrichment results — never throws.
   *
   * @param {string} query
   * @param {Object} context - Passed to trigger and handler. Include `system` for system-aware capabilities.
   * @returns {Promise<Array<{ name, description, data, latencyMs }>>}
   */
  async enrich(query, context = {}) {
    const matches = await this.match(query, context);
    if (!matches.length) return [];

    const tasks = matches.map(async cap => {
      const start = Date.now();
      cap.metrics.calls++;
      try {
        const result = await Promise.race([
          Promise.resolve(cap.handler(query, context)),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`timeout after ${cap.timeout}ms`)), cap.timeout)
          )
        ]);
        const latencyMs = Date.now() - start;
        // Null/undefined return means capability chose not to contribute
        if (result == null) return null;
        cap.metrics.successes++;
        cap.metrics.totalLatencyMs += latencyMs;
        cap.metrics.lastUsed = Date.now();
        return { name: cap.name, description: cap.description, data: result, latencyMs };
      } catch (err) {
        cap.metrics.failures++;
        console.warn(`[CapabilityRegistry] Handler failed for "${cap.name}": ${err.message}`);
        return null;
      }
    });

    return (await Promise.all(tasks)).filter(Boolean);
  }

  /**
   * Format enrichment results into a clearly-labeled prompt block.
   * Returns '' if nothing to inject. Caps total output at maxChars.
   *
   * @param {Array}  enrichments - Output of enrich()
   * @param {number} maxChars    - Hard cap on total injected characters (default: 2000)
   */
  formatForPrompt(enrichments, maxChars = 2000) {
    if (!enrichments || !enrichments.length) return '';

    const header = '[CAPABILITY DATA — use as factual context if relevant]\n';
    const footer = '[/CAPABILITY DATA]\n';
    let body = '';
    let used = header.length + footer.length;

    for (const e of enrichments) {
      let dataStr;
      try {
        dataStr = typeof e.data === 'string' ? e.data : JSON.stringify(e.data, null, 2);
      } catch {
        dataStr = String(e.data);
      }
      const entry = `\n[${e.name}] ${e.description}:\n${dataStr}\n`;
      if (used + entry.length > maxChars) break; // stop before exceeding budget
      body += entry;
      used += entry.length;
    }

    if (!body) return ''; // all entries exceeded budget
    return header + body + footer;
  }

  /**
   * Auto-load all capabilities from a directory.
   * Each .js file should export a default capability definition object.
   * Files starting with '_' are skipped (allow _disabled_*.js pattern).
   *
   * @param {string} dirPath - Absolute path to capabilities directory
   * @returns {Promise<number>} Count of successfully loaded capabilities
   */
  async loadDirectory(dirPath) {
    let files;
    try {
      files = await fs.readdir(dirPath);
    } catch {
      // Directory doesn't exist yet — not an error, just nothing to load
      console.log(`[CapabilityRegistry] No capabilities/ directory found — skipping auto-load (create ${dirPath} to add capabilities)`);
      return 0;
    }

    const jsFiles = files.filter(f => f.endsWith('.js') && !f.startsWith('_'));
    let loaded = 0;

    for (const file of jsFiles) {
      const fullPath = path.join(dirPath, file);
      try {
        // Dynamic ESM import — use file:// URL for Windows compatibility
        const mod = await import(`file://${fullPath}`);
        const def = mod.default;

        if (!def || typeof def !== 'object') {
          console.warn(`[CapabilityRegistry] ${file}: default export is not an object — skipped`);
          continue;
        }
        if (!def.name || !def.trigger || !def.handler) {
          console.warn(`[CapabilityRegistry] ${file}: missing required fields (name, trigger, handler) — skipped`);
          continue;
        }

        this.register(def);
        loaded++;
      } catch (err) {
        console.error(`[CapabilityRegistry] Failed to load ${file}: ${err.message}`);
      }
    }

    if (loaded > 0) {
      console.log(`[CapabilityRegistry] ✓ Auto-loaded ${loaded}/${jsFiles.length} capabilities from ${path.basename(dirPath)}/`);
    }
    return loaded;
  }

  /**
   * Returns stats for all registered capabilities — useful for dashboards and debugging.
   */
  getStats() {
    return Array.from(this._caps.values()).map(c => ({
      name:         c.name,
      description:  c.description,
      category:     c.category,
      enabled:      c.enabled,
      priority:     c.priority,
      timeout:      c.timeout,
      version:      c.version,
      author:       c.author,
      registeredAt: c.registeredAt,
      calls:        c.metrics.calls,
      successes:    c.metrics.successes,
      failures:     c.metrics.failures,
      avgLatencyMs: c.metrics.calls > 0
        ? Math.round(c.metrics.totalLatencyMs / c.metrics.calls)
        : null,
      successRate: c.metrics.calls > 0
        ? parseFloat((c.metrics.successes / c.metrics.calls).toFixed(2))
        : null,
      lastUsed: c.metrics.lastUsed
    }));
  }
}

// Singleton — one registry for the whole process
const registry = new CapabilityRegistry();
export { registry };
export default registry;
