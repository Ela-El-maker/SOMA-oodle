/**
 * Autonomous Trading API Routes
 * Controls the server-side autonomous trading engine
 */

import express from 'express';
import autonomousTrader from './autonomousTrader.js';

const router = express.Router();

// Lightweight response cache — status and decisions change at most once per cycle (60s)
// Serving stale-by-2s data is fine; avoids recomputing on every 5s frontend poll.
const _cache = new Map(); // key → { body, ts }
const CACHE_TTL = { status: 2000, decisions: 2000 };

function cached(key, ttlMs, compute) {
    const now = Date.now();
    const hit = _cache.get(key);
    if (hit && (now - hit.ts) < ttlMs) return hit.body;
    const body = compute();
    _cache.set(key, { body, ts: now });
    return body;
}

/** Call this whenever a trade fires so the status cache is flushed immediately */
export function flushStatusCache() { _cache.delete('status'); _cache.delete('decisions'); }

/**
 * POST /api/autonomous/start
 * Start autonomous trading for a symbol
 * Body: { symbol, preset?, config? }
 */
router.post('/start', async (req, res) => {
    try {
        const { symbol, preset, config } = req.body;

        if (!symbol) {
            return res.status(400).json({ success: false, error: 'Symbol is required' });
        }

        const result = await autonomousTrader.start(symbol, preset, config || {});

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('[Autonomous API] Start error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/autonomous/stop
 * Stop autonomous trading
 */
router.post('/stop', (req, res) => {
    try {
        const result = autonomousTrader.stop();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/autonomous/status
 * Get current autonomous trading status
 */
router.get('/status', (req, res) => {
    try {
        const body = cached('status', CACHE_TTL.status, () => {
            const status = autonomousTrader.getStatus();
            return { success: true, ...status };
        });
        res.json(body);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/autonomous/decisions
 * Get the decision log (why trades were made or skipped)
 * Query: ?limit=50
 */
router.get('/decisions', (req, res) => {
    try {
        const limit = parseInt(req.query.limit || 50);
        const body = cached(`decisions_${limit}`, CACHE_TTL.decisions, () => {
            const decisions = autonomousTrader.getDecisions(limit);
            return { success: true, decisions, count: decisions.length };
        });
        res.json(body);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/autonomous/config
 * Update autonomous trader config while running
 * Body: partial config object
 */
router.put('/config', (req, res) => {
    try {
        const config = autonomousTrader.updateConfig(req.body);
        res.json({ success: true, config });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
