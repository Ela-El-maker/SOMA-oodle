/**
 * daemons/WebPerceptionDaemon.js
 *
 * Persistent web watchdog — treats a set of URLs as "sense organs" rather than
 * one-shot scrape targets. Every tick it snapshots each watched URL, hashes the
 * cleaned HTML, and emits a web.perception.delta signal when something changes.
 *
 * Hash-based (not event-based) because DOM event listeners break on long sessions.
 * Noise reduction: strips nonce attributes and relative timestamps before hashing
 * so "5 minutes ago" → "6 minutes ago" doesn't flood the signal bus.
 *
 * Signals emitted:
 *   web.perception.delta     — content changed at a watched URL (high priority)
 *   web.perception.error     — fetch failed for a watched URL (normal priority)
 *
 * Usage (from cos.js or any arbiter):
 *   webPerceptionDaemon.addWatch('https://example.com/council-agenda', {
 *       selector: '#main-content',   // optional CSS selector hint (used in log only)
 *       label: 'City Council Agenda' // optional human label for signals
 *   });
 */

import BaseDaemon from './BaseDaemon.js';
import crypto from 'crypto';

export class WebPerceptionDaemon extends BaseDaemon {
    constructor(opts = {}) {
        super({
            name: 'WebPerceptionDaemon',
            interval: opts.intervalMs || 30000, // 30s default
            ...opts
        });

        // url → { hash, label, selector, lastCheck, changeCount, lastError }
        this._watchList = new Map();

        // fetch timeout per URL (ms)
        this._fetchTimeout = opts.fetchTimeoutMs || 8000;

        // User-Agent header to avoid bot blocks
        this._userAgent = opts.userAgent ||
            'Mozilla/5.0 (compatible; SOMA-WebPerception/1.0; +https://soma.local)';
    }

    /**
     * Add a URL to the watch list.
     * @param {string} url - Full URL to watch
     * @param {object} opts
     * @param {string} [opts.label]    - Human-readable label for signals
     * @param {string} [opts.selector] - CSS selector hint (used in signal metadata only)
     */
    addWatch(url, opts = {}) {
        if (this._watchList.has(url)) {
            console.log(`[WebPerception] Already watching: ${url}`);
            return;
        }
        this._watchList.set(url, {
            hash:        null,  // null = not yet seen
            label:       opts.label || url,
            selector:    opts.selector || null,
            lastCheck:   null,
            changeCount: 0,
            lastError:   null
        });
        console.log(`[WebPerception] 👁️  Now watching: ${opts.label || url}`);
    }

    /**
     * Remove a URL from the watch list.
     */
    removeWatch(url) {
        this._watchList.delete(url);
        console.log(`[WebPerception] Removed watch: ${url}`);
    }

    /**
     * Get the current watch list (for dashboard / API)
     */
    getWatchList() {
        const out = {};
        for (const [url, state] of this._watchList.entries()) {
            out[url] = { ...state };
        }
        return out;
    }

    async tick() {
        if (!this._watchList.size) return;

        const checks = Array.from(this._watchList.entries()).map(([url, state]) =>
            this._checkUrl(url, state)
        );
        await Promise.allSettled(checks);
    }

    async _checkUrl(url, state) {
        try {
            const html = await this._fetch(url);
            const hash = this._hashContent(html);

            state.lastCheck = Date.now();
            state.lastError = null;

            if (state.hash === null) {
                // First time — just record baseline, no delta signal
                state.hash = hash;
                console.log(`[WebPerception] 📸 Baseline captured: ${state.label}`);
                return;
            }

            if (hash !== state.hash) {
                state.changeCount++;
                const oldHash = state.hash;
                state.hash = hash;

                this.emitSignal('web.perception.delta', {
                    url,
                    label:       state.label,
                    selector:    state.selector,
                    oldHash,
                    newHash:     hash,
                    changeCount: state.changeCount,
                    timestamp:   Date.now()
                }, 'high');

                console.log(`[WebPerception] 🔔 Change detected: ${state.label} (change #${state.changeCount})`);
            }

        } catch (err) {
            state.lastError = err.message;
            this.emitSignal('web.perception.error', {
                url,
                label: state.label,
                error: err.message?.slice(0, 100),
                timestamp: Date.now()
            }, 'normal');
        }
    }

    async _fetch(url) {
        const res = await fetch(url, {
            headers: { 'User-Agent': this._userAgent },
            signal: AbortSignal.timeout(this._fetchTimeout)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
    }

    /**
     * Clean HTML and return a SHA-256 hash.
     * Stripping strategy (order matters):
     *  1. Remove script/style blocks entirely
     *  2. Strip nonce / Angular / React generated attributes
     *  3. Normalize relative timestamps ("5 minutes ago" → TIME_AGO)
     *  4. Collapse whitespace
     */
    _hashContent(html) {
        const cleaned = html
            // Drop entire script/style blocks
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            // Strip nonce attrs: nonce="abc123", _ngcontent-c7="", data-reactid="42"
            .replace(/\s+(nonce|_ng\w+|data-react\w+|data-v-\w+)=["'][^"']*["']/g, '')
            // Strip inline event handlers (onclick="...", etc.)
            .replace(/\s+on\w+=["'][^"']*["']/g, '')
            // Normalize relative timestamps
            .replace(/\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago/gi, 'TIME_AGO')
            .replace(/\b(just now|moments ago|recently)\b/gi, 'TIME_AGO')
            // Strip HTML comments
            .replace(/<!--[\s\S]*?-->/g, '')
            // Collapse whitespace
            .replace(/\s+/g, ' ')
            .trim();

        return crypto.createHash('sha256').update(cleaned).digest('hex');
    }
}

export default WebPerceptionDaemon;
