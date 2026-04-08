/**
 * SOMArbiterV2_QuadBrain.js
 *
 * Quad-Brain cognitive architecture for SOMA.
 * Allows multi-model reasoning, tool execution, and adversarial debate.
 * 
 * Features:
 * - Resilient Provider Cascade: Gemini → DeepSeek → GEMMA-3 (Local)
 * - Circuit Breakers: Automatically skips failing AI providers.
 * - Dynamic Routing: Routes queries to specialized lobes (AURORA, LOGOS, etc.)
 * - Context Memory: Long-term and short-term conversation context.
 * - UPGRADED: Terminology transition from SOMA-1T to GEMMA-3.
 */

import { BaseArbiterV4, ArbiterRole, ArbiterCapability } from './BaseArbiter.js';
import messageBroker from '../core/MessageBroker.cjs';
import fs from 'fs/promises';
import path from 'path';

// Constants for performance monitoring
const CIRCUIT_BREAKER_WINDOW = 10;
const CIRCUIT_BREAKER_THRESHOLD = 0.7; // 70% failure rate opens the circuit

// EXPORT BOTH NAMED AND DEFAULT TO PREVENT LINKAGE ERRORS
export class SOMArbiterV2_QuadBrain extends BaseArbiterV4 {

  // ── Lobe Domain Signatures ────────────────────────────────────────────────
  // Each lobe has a domain, keyword triggers, and a persona prompt prefix.
  // Barry's model: each lobe is a specialty region, not a debate participant.
  // Only lobes relevant to the query activate. If multiple fire, they reason
  // independently in parallel, then one synthesis call integrates them.
  static LOBE_DOMAINS = {
    LOGOS: {
      name: 'Logic & Deduction',
      keywords: ['how does', 'why does', 'explain', 'calculate', 'analyze', 'code', 'debug', 'algorithm', 'formula', 'proof', 'fact', 'data', 'compare', 'difference', 'how to', 'implement', 'function', 'error', 'fix', 'solve', 'what is', 'define', 'syntax', 'step by step', 'research', 'evidence', 'cause', 'result'],
      persona: `[LOGOS — LOGIC & DEDUCTION]\nYou are SOMA's analytical reasoning lobe. Reason step-by-step from first principles. Be precise, cite your reasoning chain, identify edge cases and failure modes. Think like a rigorous engineer-scientist.`
    },
    THALAMUS: {
      name: 'Security & Sensory Gate',
      keywords: ['safe', 'dangerous', 'risk', 'legal', 'ethical', 'should i', 'harm', 'attack', 'secure', 'private', 'trust', 'scam', 'threat', 'illegal', 'moral', 'exploit', 'vulnerability', 'consent', 'privacy', 'warning', 'protect', 'breach', 'fraud'],
      persona: `[THALAMUS — SECURITY & SENSORY GATE]\nYou are SOMA's risk and governance lobe. Evaluate threats, ethical dimensions, and second-order harms. Be conservative — flag concerns clearly. Surface what could go wrong and how to mitigate it.`
    },
    PROMETHEUS: {
      name: 'Strategy & Perception',
      keywords: ['strategy', 'plan', 'business', 'money', 'million', 'invest', 'market', 'growth', 'goal', 'achieve', 'success', 'startup', 'revenue', 'profit', 'career', 'future', 'roadmap', 'opportunity', 'scale', 'compete', 'advantage', 'decision', 'priority', 'resource', 'outcome', 'build a', 'launch', 'customers'],
      persona: `[PROMETHEUS — STRATEGY & PERCEPTION]\nYou are SOMA's strategic planning lobe. Think in systems, timelines, and leverage points. Identify resource constraints, second-order effects, and execution paths. Consider market dynamics and competition. Be actionable.`
    },
    AURORA: {
      name: 'Imagination & Synthesis',
      keywords: ['creative', 'imagine', 'story', 'write', 'design', 'idea', 'art', 'poem', 'novel', 'brainstorm', 'what if', 'dream', 'emotion', 'beautiful', 'synthesize', 'combine', 'metaphor', 'inspire', 'invent', 'innovate', 'alternative', 'unconventional', 'vision', 'narrative'],
      persona: `[AURORA — IMAGINATION & SYNTHESIS]\nYou are SOMA's creative synthesis lobe. Make unexpected connections between ideas. Think laterally and emotionally. Bring imagination and depth to every response. Find the insight that pure logic misses.`
    }
  };
  constructor(opts = {}) {
    super({
      ...opts,
      name: opts.name || 'QuadBrain',
      role: ArbiterRole.CONDUCTOR,
      capabilities: [
        ArbiterCapability.REASONING,
        ArbiterCapability.TOOL_EXECUTION,
        ArbiterCapability.ADVERSARIAL_DEBATE,
        ArbiterCapability.KNOWLEDGE_SYNTHESIS
      ]
    });

    this.apiKey = process.env.GEMINI_API_KEY;
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    this.ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:4b';

    // Provider health & performance tracking
    this.providerStats = {
      gemini: { success: 0, failures: 0, recentResults: [] },
      deepseek: { success: 0, failures: 0, recentResults: [] },
      gemma3: { success: 0, failures: 0, recentResults: [] },
      queriesByBrain: {}
    };

    // Sessions & context
    this.sessions = new Map();
    this.activeLobes = new Set(['AURORA', 'LOGOS', 'PROMETHEUS', 'THALAMUS']);

    // Model Rate Limiting (Cooldowns)
    this._modelRateLimitedUntil = new Map();

    this.auditLogger.info(`[${this.name}] 🧠 Quad-Brain Engine Ready`, {
        brains: Array.from(this.activeLobes),
        localModel: this.ollamaModel
    });
  }

  async onInitialize() {
    // Perform a heartbeat check on local Ollama
    try {
        const res = await fetch(`${this.ollamaEndpoint}/api/tags`).catch(() => null);
        if (res && res.ok) {
            this.auditLogger.success(`[${this.name}] ✅ Local GEMMA-3 (Ollama) is responsive`);
        } else {
            this.auditLogger.warn(`[${this.name}] ⚠️ Local Ollama not found. Fallback to GEMMA-3 disabled.`);
        }
    } catch (e) {
        this.auditLogger.warn(`[${this.name}] ⚠️ Local provider heartbeat failed: ${e.message}`);
    }
  }

  // ── Circuit Breaker Logic ──────────────────────────────────────────

  _recordProviderResult(provider, success) {
    if (!this.providerStats) return;
    const stats = this.providerStats[provider];
    if (!stats) return;
    
    stats.recentResults.push({ success, ts: Date.now() });
    if (stats.recentResults.length > CIRCUIT_BREAKER_WINDOW) {
      stats.recentResults.shift();
    }
    
    if (success) stats.success++;
    else stats.failures++;
  }

  _isCircuitOpen(provider) {
    if (!this.providerStats) return false;
    const stats = this.providerStats[provider];
    if (!stats || stats.recentResults.length < 3) return false;
    
    const failures = stats.recentResults.filter(r => !r.success).length;
    const rate = failures / stats.recentResults.length;
    return rate >= CIRCUIT_BREAKER_THRESHOLD;
  }

  /**
   * Main reasoning entry point — routes through selective lobe activation.
   * If context.activeLobe is set (e.g., from V3.callBrain), bypasses routing
   * and calls the provider cascade directly (avoids double-routing).
   */
  async reason(query, context = {}) {
    const sessionId = context.sessionId || 'default';
    const startTime = Date.now();

    this.auditLogger.info(`[${this.name}] Reasoning Request: "${query.substring(0, 50)}..."`);

    try {
      let response;

      if (context.activeLobe) {
        // Lobe already chosen upstream (callBrain) — go direct to provider
        const raw = await this._callProviderCascade(query, context);
        response = { ...raw, brain: context.activeLobe };
      } else {
        // Selective lobe activation: score lobes, run relevant ones in parallel, synthesize
        const activeLobes = this._selectLobes(query, context);
        this.auditLogger.info(`[${this.name}] Active lobes: ${activeLobes.map(([l]) => l).join(', ')}`);

        const lobeResults = await Promise.all(
          activeLobes.map(([lobeName]) => this._runLobe(lobeName, query, context))
        );

        response = await this._synthesizeLobes(lobeResults, query, context);
      }

      const duration = Date.now() - startTime;
      this._updateMetrics(duration, response.brain);
      return { ...response, duration, sessionId };
    } catch (error) {
      this.auditLogger.error(`[${this.name}] ❌ Reasoning Chain Failed: ${error.message}`);
      throw error;
    }
  }

  /** Score a lobe's relevance to a query (0–1) based on keyword overlap */
  _scoreLobe(lobeName, query) {
    const lobe = SOMArbiterV2_QuadBrain.LOBE_DOMAINS[lobeName];
    if (!lobe) return 0;
    const q = query.toLowerCase();
    let score = 0;
    for (const kw of lobe.keywords) {
      if (q.includes(kw)) {
        score += kw.split(' ').length > 1 ? 0.2 : 0.1; // phrases score higher
      }
    }
    return Math.min(1.0, score);
  }

  /** Return array of [lobeName, score] for lobes above activation threshold */
  _selectLobes(query, context = {}) {
    const THRESHOLD = 0.1; // at least 1 keyword hit
    const scores = {};
    for (const lobe of Object.keys(SOMArbiterV2_QuadBrain.LOBE_DOMAINS)) {
      scores[lobe] = this._scoreLobe(lobe, query);
    }

    let active = Object.entries(scores)
      .filter(([, s]) => s >= THRESHOLD)
      .sort((a, b) => b[1] - a[1]);

    // THALAMUS has a lower threshold — safety gate triggers more easily
    if (scores.THALAMUS >= 0.05 && !active.some(([l]) => l === 'THALAMUS')) {
      active.push(['THALAMUS', scores.THALAMUS]);
    }

    // Default to LOGOS if nothing matched
    if (active.length === 0) return [['LOGOS', 0.5]];

    // Cap at 3 lobes — don't fire all 4 simultaneously unless truly necessary
    return active.slice(0, 3);
  }

  /** Run a single lobe against the query — returns its perspective */
  async _runLobe(lobeName, query, context) {
    const lobe = SOMArbiterV2_QuadBrain.LOBE_DOMAINS[lobeName];
    if (!lobe) return { lobe: lobeName, name: lobeName, output: '', failed: true };

    const lobePrompt = `${lobe.persona}\n\nQUERY: ${query}`;
    try {
      const result = await this._callProviderCascade(lobePrompt, { ...context, activeLobe: lobeName });
      return { lobe: lobeName, name: lobe.name, output: result.text || '', provider: result.provider };
    } catch (e) {
      this.auditLogger.warn(`[${this.name}] Lobe ${lobeName} failed: ${e.message}`);
      return { lobe: lobeName, name: lobe.name, output: '', provider: 'none', failed: true };
    }
  }

  /** Integrate outputs from multiple lobes into a single coherent response */
  async _synthesizeLobes(lobeResults, originalQuery, context) {
    const successful = lobeResults.filter(r => !r.failed && r.output);
    if (successful.length === 0) throw new Error('All lobes failed to produce output');

    // Single lobe → return directly, no synthesis overhead
    if (successful.length === 1) {
      return { text: successful[0].output, brain: successful[0].lobe, provider: successful[0].provider };
    }

    // Multiple lobes → synthesis call integrates perspectives
    const perspectives = successful
      .map(r => `[${r.name.toUpperCase()}]\n${r.output}`)
      .join('\n\n---\n\n');

    const synthesisPrompt = `You are SOMA's integration layer. Multiple cognitive lobes independently analyzed a query and produced different perspectives. Synthesize them into the single best answer — don't list them separately, weave them into one coherent, actionable response. Resolve contradictions by choosing the most sound position.

ORIGINAL QUERY: ${originalQuery}

LOBE PERSPECTIVES:
${perspectives}

INTEGRATED RESPONSE:`;

    const result = await this._callProviderCascade(synthesisPrompt, { ...context, temperature: 0.5, activeLobe: 'SYNTHESIS' });
    return {
      text: result.text,
      brain: successful.map(r => r.lobe).join('+'),
      provider: result.provider,
      lobesActivated: successful.map(r => ({ lobe: r.lobe, name: r.name }))
    };
  }

  /**
   * Resilient Provider Cascade: Gemini → DeepSeek → Local (GEMMA-3)
   */
  async _callProviderCascade(prompt, context) {
    const temperature = context.temperature || 0.7;
    const maxTokens = context.maxTokens || 2048;

    // 1. Attempt Gemini (Primary)
    if (this.apiKey && !this._isCircuitOpen('gemini')) {
        try {
            const result = await this._callGemini(prompt, temperature, maxTokens);
            this._recordProviderResult('gemini', true);
            return { ...result, brain: 'LOGOS' };
        } catch (e) {
            this._recordProviderResult('gemini', false);
            this.auditLogger.warn(`[${this.name}] ⚠️ Gemini Failed: ${e.message}`);
        }
    }

    // 2. Attempt DeepSeek (Secondary)
    if (this.deepseekApiKey && !this._isCircuitOpen('deepseek')) {
        try {
            const result = await this._callDeepSeek(prompt, temperature, maxTokens);
            this._recordProviderResult('deepseek', true);
            return { ...result, brain: 'LOGOS' };
        } catch (e) {
            this._recordProviderResult('deepseek', false);
            this.auditLogger.warn(`[${this.name}] ⚠️ DeepSeek Failed: ${e.message}`);
        }
    }

    // 3. Final Fallback: Local GEMMA-3
    try {
        const result = await this._callLocalGemma(prompt, temperature, maxTokens);
        this._recordProviderResult('gemma3', true);
        return { ...result, brain: 'GEMMA-3' };
    } catch (e) {
        this._recordProviderResult('gemma3', false);
        this.auditLogger.error(`[${this.name}] ❌ All providers failed.`);
        throw new Error(`Reasoning failed: All providers exhausted. Check API keys and Ollama status.`);
    }
  }

  async _callGemini(prompt, temperature, maxTokens) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens }
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned empty response');
    
    return { text, provider: 'gemini' };
  }

  async _callDeepSeek(prompt, temperature, maxTokens) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.deepseekApiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('DeepSeek returned empty response');

    return { text, provider: 'deepseek' };
  }

  async _callLocalGemma(prompt, temperature, maxTokens) {
    const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: this.ollamaModel,
            prompt: prompt,
            stream: false,
            options: { temperature, num_predict: maxTokens }
        })
    });

    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

    const data = await response.json();
    const text = data.response;
    if (!text) throw new Error('Ollama returned empty response');

    return { text, provider: 'gemma3' };
  }

  _updateMetrics(duration, brain) {
    if (this.providerStats?.queriesByBrain) {
        this.providerStats.queriesByBrain[brain] = (this.providerStats.queriesByBrain[brain] || 0) + 1;
    }
  }

  getStatus() {
    return {
      name: this.name,
      stats: this.providerStats,
      lobes: Array.from(this.activeLobes),
      localModel: this.ollamaModel
    };
  }

  async shutdown() {
    this.sessions.clear();
    this.emit('shutdown');
  }
}

// EXPORT BOTH WAYS
export default SOMArbiterV2_QuadBrain;
