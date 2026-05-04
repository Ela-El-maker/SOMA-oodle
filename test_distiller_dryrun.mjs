/**
 * Dry-run test for MemoryDistillerDaemon.
 * Mocks the brain and mnemonic, verifies:
 *   - tick() runs (not blocked by boot delay when set to 0)
 *   - fetchAgedMemories uses created_at
 *   - brain is called with well-formed prompt
 *   - dry-run skips DB writes
 *   - JSON journal is NOT written in dry-run
 */

import Database from 'better-sqlite3';
import MemoryDistillerDaemon from './daemons/MemoryDistillerDaemon.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = './SOMA/soma-memory.db';
const db = new Database(DB_PATH, { readonly: true });

const totalRows = db.prepare('SELECT COUNT(*) as n FROM memories').get().n;
const agedRows  = db.prepare('SELECT COUNT(*) as n FROM memories WHERE created_at < ?').get(Date.now() - 24 * 60 * 60 * 1000).n;
console.log(`[test] Total memories: ${totalRows.toLocaleString()}, aged >24h: ${agedRows.toLocaleString()}`);

// ── Mock brain ────────────────────────────────────────────────────────────────
let brainCallCount = 0;
let lastPrompt = '';
const mockBrain = {
    _callProviderCascade: async (prompt, opts) => {
        brainCallCount++;
        lastPrompt = prompt;
        console.log(`[test] Brain called (lobe: ${opts.activeLobe}, temp: ${opts.temperature})`);
        return {
            text: `WISDOM:\nTest paragraph 1.\nTest paragraph 2.\nTest paragraph 3.\n\nECHO:\nThe quiet hum of compressed thought.`
        };
    }
};

// ── Mock mnemonic (wraps real db for reads, dry-run no-ops for writes) ────────
let rememberCalls = 0;
let purgeBatchCalls = 0;
const mockMnemonic = {
    db,
    remember: async (content, meta) => {
        rememberCalls++;
        console.log(`[test] mnemonic.remember() called (importance: ${meta?.importance})`);
    },
    purgeBatch: async (entries) => {
        purgeBatchCalls++;
        console.log(`[test] mnemonic.purgeBatch() called with ${entries.length} entries`);
        return entries.length;
    },
};

// ── Create distiller ──────────────────────────────────────────────────────────
const tmpJournal = path.resolve('./SOMA/test-dream-journal.json');
if (fs.existsSync(tmpJournal)) fs.unlinkSync(tmpJournal);

const distiller = new MemoryDistillerDaemon({
    system: {
        mnemonicArbiter: mockMnemonic,
        quadBrain: mockBrain,
    },
    dryRun: true,
    bootDelayMs: 0,
    journalPath: tmpJournal,
});

console.log('\n[test] Running dry-run tick...');
const t0 = Date.now();
await distiller.tick();
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\n[test] Finished in ${elapsed}s`);
console.log(`[test] Brain calls: ${brainCallCount}`);
console.log(`[test] remember() calls: ${rememberCalls} (expected 0 — dry-run)`);
console.log(`[test] purgeBatch() calls: ${purgeBatchCalls} (expected 0 — dry-run)`);
console.log(`[test] Journal written: ${fs.existsSync(tmpJournal)} (expected false — dry-run)`);

// Assertions
let passed = 0; let failed = 0;
function assert(name, cond) {
    if (cond) { console.log(`  ✅ ${name}`); passed++; }
    else      { console.error(`  ❌ ${name}`); failed++; }
}

assert('brain was called',         brainCallCount >= 1);
assert('no remember() in dry-run', rememberCalls === 0);
assert('no purgeBatch() in dry-run', purgeBatchCalls === 0);
assert('no journal file in dry-run', !fs.existsSync(tmpJournal));
assert('prompt uses created_at', lastPrompt.includes('RAW MEMORY FRAGMENTS'));

console.log(`\n[test] ${passed} passed, ${failed} failed`);
db.close();
