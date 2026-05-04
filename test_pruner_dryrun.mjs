/**
 * Dry-run test for MemoryPrunerDaemon.
 * Points at the real SOMA DB, runs all 4 passes, reports counts.
 * Nothing is written to the DB.
 */

import Database from 'better-sqlite3';
import MemoryPrunerDaemon from './daemons/MemoryPrunerDaemon.js';

const DB_PATH = './SOMA/soma-memory.db';
const db = new Database(DB_PATH, { readonly: true });

// Verify schema
const cols = db.prepare('PRAGMA table_info(memories)').all().map(c => c.name);
console.log('[test] memories columns:', cols.join(', '));
const purgatoryExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memory_purgatory'").get();
console.log('[test] purgatory table exists:', !!purgatoryExists);
const totalRows = db.prepare('SELECT COUNT(*) as n FROM memories').get().n;
console.log(`[test] Total memories in DB: ${totalRows.toLocaleString()}`);

// ── Minimal mnemonic shim ────────────────────────────────────────────────────
const mnemonic = {
    db,

    scanMemoriesForPruning(limit, offset) {
        return db.prepare(
            'SELECT id, content, created_at FROM memories ORDER BY id LIMIT ? OFFSET ?'
        ).all(limit, offset);
    },

    async purgeBatch(entries) { return entries.length; }, // dry-run no-op

    async expirePurgatory() { return 0; },

    async deepCleanup() { return { purged: 0 }; },

    async getPurgatoryStats() {
        if (!purgatoryExists) return { count: 0, oldestDays: 0 };
        const r = db.prepare('SELECT COUNT(*) as n FROM memory_purgatory').get();
        return { count: r.n, oldestDays: 0 };
    },

    async digestSession(entries) {
        return `[TEST DIGEST] ${entries.length} entries.`;
    },

    async remember() {},
};

// ── Run the daemon ───────────────────────────────────────────────────────────
const pruner = new MemoryPrunerDaemon({
    mnemonic,
    quadBrain: null,  // no LLM in dry-run
    dryRun: true,
    calibrated: true, // skip calibration output
    bootDelayMs: 0,   // no delay in tests
});

console.log('\n[test] Starting dry-run pruning cycle...\n');
const t0 = Date.now();
await pruner.tick();
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\n[test] Finished in ${elapsed}s`);
console.log('[test] Final stats:', JSON.stringify(pruner._cycleStats, null, 2));
db.close();
