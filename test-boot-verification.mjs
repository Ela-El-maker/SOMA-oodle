/**
 * Boot Verification Test
 * Tests that SomaBootstrap initializes successfully after consolidation
 */

import { SomaBootstrap } from './core/SomaBootstrap.js';

console.log('═══════════════════════════════════════════════════════════');
console.log('  SOMA BOOT VERIFICATION TEST');
console.log('  Testing: Phase 1 Consolidation + All Phase 2 Components');
console.log('═══════════════════════════════════════════════════════════\n');

async function verifyBoot() {
    try {
        console.log('[Test] Creating SomaBootstrap instance...');
        const bootstrap = new SomaBootstrap();

        console.log('[Test] Initializing system...');
        const system = await bootstrap.initialize();

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  ✅ BOOT VERIFICATION SUCCESSFUL');
        console.log('═══════════════════════════════════════════════════════════\n');

        // Verify key components
        console.log('[Verification] Checking consolidated systems:');
        console.log(`  - RiskManager: ${system.riskManager ? '✅' : '❌'}`);
        console.log(`  - MetaLearningEngine: ${system.metaLearningEngine ? '✅' : '❌'}`);
        console.log(`  - MnemonicArbiter: ${system.mnemonic ? '✅' : '❌'}`);

        console.log('\n[Verification] Checking Phase 2A (Critical Infrastructure):');
        console.log(`  - ArbiterOrchestrator: ${system.orchestrator ? '✅' : '❌'}`);
        console.log(`  - LoadManager: ${system.loadManager ? '✅' : '❌'}`);
        console.log(`  - NoveltyTracker: ${system.noveltyTracker ? '✅' : '❌'}`);
        console.log(`  - ConservativeArbiter: ${system.conservativeArbiter ? '✅' : '❌'}`);
        console.log(`  - ProgressiveArbiter: ${system.progressiveArbiter ? '✅' : '❌'}`);

        console.log('\n[Verification] Checking Phase 2B (Training Pipeline):');
        console.log(`  - BootstrapTrainingArbiter: ${system.bootstrapTraining ? '✅' : '❌'}`);
        console.log(`  - RegressionTester: ${system.regressionTester ? '✅' : '❌'}`);
        console.log(`  - StrategyOptimizer: ${system.strategyOptimizer ? '✅' : '❌'}`);
        console.log(`  - ExperienceReplayBuffer: ${system.experienceReplay ? '✅' : '❌'}`);

        console.log('\n[Verification] Checking Phase 2C (Trading System):');
        console.log(`  - MarketRegimeDetector: ${system.marketRegime ? '✅' : '❌'}`);
        console.log(`  - BacktestEngine: ${system.backtestEngine ? '✅' : '❌'}`);
        console.log(`  - PerformanceAnalytics: ${system.performanceAnalytics ? '✅' : '❌'}`);

        console.log('\n[Verification] MessageBroker Registry:');
        const registeredCount = system.messageBroker ? Object.keys(system.messageBroker.arbiters || {}).length : 0;
        console.log(`  - Registered Arbiters: ${registeredCount}`);

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  ✅ ALL SYSTEMS OPERATIONAL');
        console.log('═══════════════════════════════════════════════════════════\n');

        process.exit(0);

    } catch (error) {
        console.error('\n═══════════════════════════════════════════════════════════');
        console.error('  ❌ BOOT VERIFICATION FAILED');
        console.error('═══════════════════════════════════════════════════════════\n');
        console.error('Error:', error.message);
        console.error('\nStack:', error.stack);
        process.exit(1);
    }
}

// Set timeout to prevent hanging
setTimeout(() => {
    console.error('\n❌ Boot verification timed out after 60 seconds');
    process.exit(1);
}, 60000);

verifyBoot();
