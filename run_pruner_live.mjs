/**
 * run_pruner_live.mjs
 *
 * Runs the MemoryPrunerDaemon against the real SOMA database.
 * Entries that fail quality checks are SOFT-DELETED into memory_purgatory
 * (30-day recovery window — nothing is permanently lost).
 *
 * Run: node run_pruner_live.mjs
 */

import Database from 'better-sqlite3';
import MemoryPrunerDaemon from './daemons/MemoryPrunerDaemon.js';

const DB_PATH = './SOMA/soma-memory.db';

console.log('[pruner-live] Opening database...');
const db = new Database(DB_PATH); // read/write

// Schema check
const cols = db.prepare('PRAGMA table_info(memories)').all().map(c => c.name);
console.log('[pruner-live] memories columns:', cols.join(', '));
const totalBefore = db.prepare('SELECT COUNT(*) as n FROM memories').get().n;
console.log(`[pruner-live] Total memories before: ${totalBefore.toLocaleString()}`);

// Ensure purgatory table exists (matches actual DB schema)
// Actual columns: id, content, metadata, substance_score, pruned_reason, created_at, pruned_at
db.prepare(`CREATE TABLE IF NOT EXISTS purgatory (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    metadata TEXT,
    substance_score REAL DEFAULT 0.0,
    pruned_reason TEXT,
    created_at INTEGER DEFAULT 0,
    pruned_at INTEGER NOT NULL
)`).run();

// Schema migration: add columns that MnemonicArbiter.cjs's purgeBatch expects
// (original_importance, prune_reason, purgatory_at) if they don't exist yet
const purgatoryColumns = db.prepare('PRAGMA table_info(purgatory)').all().map(c => c.name);
if (!purgatoryColumns.includes('original_importance')) {
    db.prepare('ALTER TABLE purgatory ADD COLUMN original_importance REAL DEFAULT 0.5').run();
    db.prepare('UPDATE purgatory SET original_importance = substance_score WHERE original_importance IS NULL').run();
    console.log('[pruner-live] ✅ Migration: added original_importance column to purgatory');
}
if (!purgatoryColumns.includes('prune_reason')) {
    db.prepare('ALTER TABLE purgatory ADD COLUMN prune_reason TEXT').run();
    db.prepare('UPDATE purgatory SET prune_reason = pruned_reason WHERE prune_reason IS NULL').run();
    console.log('[pruner-live] ✅ Migration: added prune_reason column to purgatory');
}
if (!purgatoryColumns.includes('purgatory_at')) {
    db.prepare('ALTER TABLE purgatory ADD COLUMN purgatory_at INTEGER DEFAULT 0').run();
    db.prepare('UPDATE purgatory SET purgatory_at = pruned_at WHERE purgatory_at IS NULL OR purgatory_at = 0').run();
    console.log('[pruner-live] ✅ Migration: added purgatory_at column to purgatory');
}

const purgatoryBefore = db.prepare('SELECT COUNT(*) as n FROM purgatory').get().n;
console.log(`[pruner-live] Purgatory before: ${purgatoryBefore.toLocaleString()}`);

// ── Real mnemonic shim (writes to the actual DB) ─────────────────────────────
const mnemonic = {
    db,

    scanMemoriesForPruning(limit, offset) {
        return db.prepare(
            'SELECT id, content, created_at FROM memories ORDER BY id LIMIT ? OFFSET ?'
        ).all(limit, offset);
    },

    purgeBatch(entries) {
        if (!entries.length) return Promise.resolve(0);
        const now = Date.now();
        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO purgatory
                (id, content, metadata, original_importance, substance_score, prune_reason, purgatory_at, pruned_reason, pruned_at, created_at)
            SELECT id, content, metadata, COALESCE(importance, 0.5), ?, ?, ?, ?, ?, COALESCE(created_at, ?)
            FROM memories WHERE id = ?
        `);
        const deleteStmt = db.prepare('DELETE FROM memories WHERE id = ?');
        const tx = db.transaction(() => {
            let moved = 0;
            for (const e of entries) {
                const score  = e.substanceScore ?? 0;
                const reason = e.reason ?? 'pruned';
                insertStmt.run(score, reason, now, reason, now, now, e.id);
                deleteStmt.run(e.id);
                moved++;
            }
            return moved;
        });
        return Promise.resolve(tx());
    },

    expirePurgatory() {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
        const r = db.prepare('DELETE FROM purgatory WHERE purgatory_at < ?').run(cutoff);
        return Promise.resolve(r.changes);
    },

    async deepCleanup() { return { purged: 0 }; },

    getPurgatoryStats() {
        const r = db.prepare('SELECT COUNT(*) as n, MIN(purgatory_at) as oldest FROM purgatory').get();
        const oldestDays = r.oldest ? Math.floor((Date.now() - r.oldest) / 86400000) : 0;
        return Promise.resolve({ count: r.n, oldestDays });
    },

    async digestSession(entries) {
        return `[DIGEST] ${entries.length} entries compressed.`;
    },

    async remember() {},
};

// ── Run the daemon ────────────────────────────────────────────────────────────
const pruner = new MemoryPrunerDaemon({
    mnemonic,
    quadBrain: null, // no LLM needed for Pass 0-2
    dryRun: false,
    calibrated: true,
    bootDelayMs: 0,
});

console.log('\n[pruner-live] Starting live pruning cycle...\n');
const t0 = Date.now();
await pruner.tick();
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

const totalAfter   = db.prepare('SELECT COUNT(*) as n FROM memories').get().n;
const purgatoryAfter = db.prepare('SELECT COUNT(*) as n FROM purgatory').get().n;
const removed = totalBefore - totalAfter;

console.log(`\n[pruner-live] ✅ Done in ${elapsed}s`);
console.log(`[pruner-live] Stats: ${JSON.stringify(pruner._cycleStats, null, 2)}`);
console.log(`[pruner-live] Memories: ${totalBefore.toLocaleString()} → ${totalAfter.toLocaleString()} (removed ${removed.toLocaleString()})`);
console.log(`[pruner-live] Purgatory: ${purgatoryBefore.toLocaleString()} → ${purgatoryAfter.toLocaleString()} (soft-deleted, 30d recovery)`);

db.close();
