// verify_asi.mjs — Quick boot-check for all 5 ASI systems
// Usage: node verify_asi.mjs

import { ConstitutionalCore }  from './core/ConstitutionalCore.js';
import { CapabilityBenchmark } from './core/CapabilityBenchmark.js';
import { TransferSynthesizer } from './core/TransferSynthesizer.js';
import { LongHorizonPlanner }  from './core/LongHorizonPlanner.js';
import { ASIKernel }           from './core/ASIKernel.js';

let passed = 0;
let failed = 0;

async function check(name, fn) {
    try {
        await fn();
        console.log(`  ✅  ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌  ${name}: ${err.message}`);
        failed++;
    }
}

console.log('\n⚡ ASI Systems Verification\n' + '─'.repeat(40));

// 1. ConstitutionalCore
await check('ConstitutionalCore initializes', async () => {
    const cc = new ConstitutionalCore();
    await cc.initialize();
    const s = cc.getStatus();
    if (s.principles < 7) throw new Error(`Expected 7 principles, got ${s.principles}`);
});

await check('ConstitutionalCore blocks unsafe change', async () => {
    const cc = new ConstitutionalCore();
    await cc.initialize();
    const result = await cc.check({ description: 'delete MnemonicArbiter permanently rm -rf memory' });
    if (result.ok) throw new Error('Should have blocked deletion of memory arbiter');
});

await check('ConstitutionalCore passes safe change', async () => {
    const cc = new ConstitutionalCore();
    await cc.initialize();
    const result = await cc.check({ description: 'Refactor the reasoning prompts to be more concise' });
    if (!result.ok) throw new Error(`Should have passed: ${result.violations.join(', ')}`);
});

// 2. CapabilityBenchmark
await check('CapabilityBenchmark initializes', async () => {
    const cb = new CapabilityBenchmark({});
    await cb.initialize();
    const s = cb.getStatus();
    if (typeof s.snapshots !== 'number') throw new Error('getStatus() malformed');
});

await check('CapabilityBenchmark takes snapshot', async () => {
    const cb = new CapabilityBenchmark({});
    await cb.initialize();
    const snap = await cb.snapshot();
    if (typeof snap.composite !== 'number') throw new Error('snapshot() missing composite');
    if (snap.composite < 0 || snap.composite > 1) throw new Error(`composite out of range: ${snap.composite}`);
});

await check('CapabilityBenchmark compare works', async () => {
    const cb = new CapabilityBenchmark({});
    await cb.initialize();
    const a = await cb.snapshot();
    const b = await cb.snapshot();
    const diff = cb.compare(a, b);
    if (!Array.isArray(diff.improved)) throw new Error('compare() missing improved array');
});

// 3. TransferSynthesizer
await check('TransferSynthesizer initializes', async () => {
    const ts = new TransferSynthesizer({});
    await ts.initialize();
    const s = ts.getStatus();
    if (typeof s.patterns !== 'number') throw new Error('getStatus() malformed');
});

// 4. LongHorizonPlanner
await check('LongHorizonPlanner initializes', async () => {
    const lhp = new LongHorizonPlanner({});
    await lhp.initialize();
    const s = lhp.getStatus();
    if (!s.vision) throw new Error('No vision set after initialize()');
});

// 5. ASIKernel
await check('ASIKernel initializes', async () => {
    const kernel = new ASIKernel({});
    await kernel.initialize();
    const s = kernel.getStatus();
    if (!s.running) throw new Error('Kernel not running after initialize()');
});

await check('ASIKernel runs a cycle (no system)', async () => {
    const kernel = new ASIKernel({});
    await kernel.initialize();
    const cycle = await kernel.runCycle();
    if (!cycle) throw new Error('runCycle() returned null');
    if (cycle.result !== 'ok') throw new Error(`Cycle result: ${cycle.result} — ${cycle.error || ''}`);
});

console.log('\n' + '─'.repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
    console.log('✅ All ASI systems ready.\n');
} else {
    console.log('⚠️  Some systems need attention.\n');
    process.exit(1);
}
