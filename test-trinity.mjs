/**
 * Test Trinity Architecture Restoration
 */

import { SomaBootstrap } from './core/SomaBootstrap.js';

console.log('═══════════════════════════════════════════════════════════');
console.log('  Testing Trinity Architecture Restoration');
console.log('═══════════════════════════════════════════════════════════\n');

async function testTrinity() {
    try {
        const CONFIG = {
            mode: 'development',
            apiKeys: {}
        };
        const bootstrap = new SomaBootstrap(process.cwd(), CONFIG);
        const system = await bootstrap.initialize();

        console.log('\n📋 Trinity Components Available:');
        const components = Object.keys(system).filter(k => !k.startsWith('_')).sort();
        components.forEach(c => console.log('  ✅', c));

        console.log('\n🔱 Total Components:', components.length);

        // Check critical Trinity components
        console.log('\n🔍 Checking Trinity Pillars:');
        console.log('  Pillar 1 (Instinct):', system.localModelManager ? '✅' : '❌');
        console.log('  Pillar 2 (Knowledge):', system.thoughtNetwork ? '✅' : '❌');
        console.log('  Pillar 3 (Causality):', system.crona ? '✅' : '❌');

        console.log('\n🧠 Internal Organs:');
        console.log('  QuadBrain:', system.quadBrain ? '✅' : '❌');
        console.log('  WorldModel:', system.worldModel ? '✅' : '❌');
        console.log('  BeliefSystem:', system.beliefSystem ? '✅' : '❌');
        console.log('  EmotionalEngine:', system.emotional ? '✅' : '❌');

        console.log('\n🤖 Autonomous Systems:');
        console.log('  SelfImprovement:', system.selfImprovement ? '✅' : '❌');
        console.log('  CodeObserver:', system.codeObserver ? '✅' : '❌');
        console.log('  GoalPlanner:', system.goalPlanner ? '✅' : '❌');

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  🔱 Trinity Architecture Test Complete!');
        console.log('═══════════════════════════════════════════════════════════\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testTrinity();
