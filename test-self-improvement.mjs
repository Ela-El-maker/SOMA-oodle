/**
 * Test Self-Improvement Coordinator
 * Triggers a manual improvement cycle to verify it's working
 */

import { SomaBootstrap } from './core/SomaBootstrap.js';

console.log('═══════════════════════════════════════════════════════════');
console.log('  Testing Self-Improvement Coordinator');
console.log('═══════════════════════════════════════════════════════════\n');

async function testSelfImprovement() {
    try {
        // Initialize system
        console.log('[Test] Initializing SOMA...');
        const bootstrap = new SomaBootstrap();
        const system = await bootstrap.initialize();

        console.log('\n[Test] Checking if SelfImprovementCoordinator is loaded...');

        if (!system.selfImprovement) {
            console.error('❌ SelfImprovementCoordinator not found in system!');
            console.log('\nAvailable system components:');
            console.log(Object.keys(system).filter(k => !k.startsWith('_')).join(', '));
            process.exit(1);
        }

        console.log('✅ SelfImprovementCoordinator found!\n');

        // Check stats
        console.log('[Test] Getting coordinator stats...');
        const stats = system.selfImprovement.getStats();
        console.log('\n📊 Stats:');
        console.log(`  - Improvement Cycles Run: ${stats.improvementCyclesRun}`);
        console.log(`  - Repetitions Prevented: ${stats.repetitionsPrevented}`);
        console.log(`  - Skills Acquired: ${stats.skillsAcquired}`);
        console.log(`  - Code Optimizations Proposed: ${stats.codeOptimizationsProposed}`);
        console.log(`  - Beliefs Updated: ${stats.beliefsUpdated}`);
        console.log(`  - Capabilities Expanded: ${stats.capabilitiesExpanded}`);

        console.log('\n🔧 Active Components:');
        console.log(`  - NoveltyTracker: ${stats.componentsActive.noveltyTracker ? '✅' : '❌'}`);
        console.log(`  - SkillAcquisition: ${stats.componentsActive.skillAcquisition ? '✅' : '❌'}`);
        console.log(`  - SelfModification: ${stats.componentsActive.selfModification ? '✅' : '❌'}`);
        console.log(`  - BeliefSystem: ${stats.componentsActive.beliefSystem ? '✅' : '❌'}`);
        console.log(`  - CapabilityExpansion: ${stats.componentsActive.capabilityExpansion ? '✅' : '❌'}`);

        // Trigger manual improvement cycle
        console.log('\n[Test] Triggering manual improvement cycle...\n');
        const results = await system.selfImprovement.runSelfImprovementCycle();

        console.log('\n✅ Improvement cycle complete!');
        console.log('\n📈 Results:');
        if (results.novelty) {
            console.log(`  - Novelty: ${JSON.stringify(results.novelty, null, 2)}`);
        }
        if (results.skills) {
            console.log(`  - Skills: ${JSON.stringify(results.skills, null, 2)}`);
        }
        if (results.optimization) {
            console.log(`  - Optimizations: ${JSON.stringify(results.optimization, null, 2)}`);
        }
        if (results.beliefs) {
            console.log(`  - Beliefs: ${JSON.stringify(results.beliefs, null, 2)}`);
        }
        if (results.capabilities) {
            console.log(`  - Capabilities: ${JSON.stringify(results.capabilities, null, 2)}`);
        }

        // Test novelty check
        console.log('\n[Test] Testing NoveltyTracker...');
        const noveltyResult = await system.selfImprovement.checkResponseNovelty(
            'Here is how to use git: First, initialize a repository...',
            { query: 'how do I use git?' }
        );
        console.log(`  - Response is novel: ${noveltyResult.isNovel}`);
        console.log(`  - Reason: ${noveltyResult.reason || 'N/A'}`);

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  ✅ Self-Improvement Coordinator is WORKING!');
        console.log('  It will run automatically every hour.');
        console.log('═══════════════════════════════════════════════════════════\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testSelfImprovement();
