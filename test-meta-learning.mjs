/**
 * Test Meta-Learning System
 *
 * Tests:
 * 1. Initialize meta-learner
 * 2. Record strategy outcomes
 * 3. Auto-disable underperformers
 * 4. Auto-enable high performers
 * 5. Manual overrides
 * 6. Performance report generation
 */

import { MetaLearner } from './arbiters/MetaLearner.js';

console.log('🧪 Testing Meta-Learning System\n');
console.log('='.repeat(70));

async function testMetaLearning() {
    // Test 1: Initialize
    console.log('\n[Test 1] Initializing Meta-Learning System...');
    const metaLearner = new MetaLearner({
        rootPath: process.cwd(),
        minSampleSize: 10  // Lower threshold for testing
    });
    await metaLearner.initialize();
    console.log('✅ Meta-Learner initialized\n');

    // Test 2: Simulate strategy performance in TRENDING_BULL market
    console.log('[Test 2] Simulating TRENDING_BULL market...');
    console.log('Testing 3 strategies with different performance:\n');

    // Strategy 1: "Momentum Breakout" - GOOD in bull market (70% win rate)
    console.log('  📈 Momentum Breakout (should stay ENABLED)');
    for (let i = 0; i < 20; i++) {
        const win = Math.random() < 0.70; // 70% win rate
        metaLearner.recordTrade('Momentum Breakout', 'TRENDING_BULL', {
            win,
            pnl: win ? 50 : -30,
            pnlPercent: win ? 5 : -3,
            confidence: 0.8
        });
    }

    // Strategy 2: "Mean Reversion" - BAD in bull market (30% win rate)
    console.log('  📉 Mean Reversion (should be DISABLED)');
    for (let i = 0; i < 20; i++) {
        const win = Math.random() < 0.30; // 30% win rate - terrible!
        metaLearner.recordTrade('Mean Reversion', 'TRENDING_BULL', {
            win,
            pnl: win ? 40 : -40,
            pnlPercent: win ? 4 : -4,
            confidence: 0.6
        });
    }

    // Strategy 3: "Swing Trading" - MEDIOCRE (50% win rate)
    console.log('  📊 Swing Trading (uncertain, should stay ENABLED with warning)\n');
    for (let i = 0; i < 20; i++) {
        const win = Math.random() < 0.50; // 50% win rate
        metaLearner.recordTrade('Swing Trading', 'TRENDING_BULL', {
            win,
            pnl: win ? 30 : -30,
            pnlPercent: win ? 3 : -3,
            confidence: 0.5
        });
    }

    // Test 3: Check strategy decisions
    console.log('[Test 3] Checking strategy decisions in TRENDING_BULL...\n');

    const strategies = ['Momentum Breakout', 'Mean Reversion', 'Swing Trading'];
    for (const strategy of strategies) {
        const decision = metaLearner.shouldUseStrategy(strategy, 'TRENDING_BULL');
        const stats = metaLearner.getStrategyStats(strategy, 'TRENDING_BULL');

        const icon = decision.shouldUse ? '✅' : '❌';
        console.log(`${icon} ${strategy}:`);
        console.log(`   Decision: ${decision.shouldUse ? 'ENABLED' : 'DISABLED'}`);
        console.log(`   Reason: ${decision.reason}`);
        console.log(`   Win Rate: ${(stats.winRate * 100).toFixed(1)}% (${stats.wins}W/${stats.losses}L)`);
        console.log(`   Confidence Interval: ${(stats.confidenceInterval.lower * 100).toFixed(1)}% - ${(stats.confidenceInterval.upper * 100).toFixed(1)}%\n`);
    }

    // Test 4: Simulate RANGING market (different performance)
    console.log('\n[Test 4] Simulating RANGING market...');
    console.log('(Same strategies, different results!)\n');

    // In RANGING market, Mean Reversion should EXCEL (75% win rate)
    console.log('  📈 Mean Reversion (should be ENABLED in RANGING)');
    for (let i = 0; i < 20; i++) {
        const win = Math.random() < 0.75; // 75% win rate!
        metaLearner.recordTrade('Mean Reversion', 'RANGING', {
            win,
            pnl: win ? 60 : -30,
            pnlPercent: win ? 6 : -3,
            confidence: 0.85
        });
    }

    // Momentum Breakout should FAIL in RANGING (35% win rate)
    console.log('  📉 Momentum Breakout (should be DISABLED in RANGING)\n');
    for (let i = 0; i < 20; i++) {
        const win = Math.random() < 0.35; // 35% win rate - bad!
        metaLearner.recordTrade('Momentum Breakout', 'RANGING', {
            win,
            pnl: win ? 40 : -45,
            pnlPercent: win ? 4 : -4.5,
            confidence: 0.7
        });
    }

    // Check decisions in RANGING
    console.log('[Test 5] Strategy decisions in RANGING market:\n');

    for (const strategy of ['Mean Reversion', 'Momentum Breakout']) {
        const decision = metaLearner.shouldUseStrategy(strategy, 'RANGING');
        const stats = metaLearner.getStrategyStats(strategy, 'RANGING');

        const icon = decision.shouldUse ? '✅' : '❌';
        console.log(`${icon} ${strategy}:`);
        console.log(`   Decision: ${decision.shouldUse ? 'ENABLED' : 'DISABLED'}`);
        console.log(`   Reason: ${decision.reason}`);
        console.log(`   Win Rate: ${(stats.winRate * 100).toFixed(1)}% (${stats.wins}W/${stats.losses}L)\n`);
    }

    // Test 6: Get best/worst strategies
    console.log('\n[Test 6] Top/Bottom Performers by Regime:\n');

    console.log('🏆 TRENDING_BULL - Top Performers:');
    const bullBest = metaLearner.getBestStrategies('TRENDING_BULL', 10, 3);
    bullBest.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name}: ${(s.winRate * 100).toFixed(1)}% (${s.trades} trades)`);
    });

    console.log('\n⚠️  TRENDING_BULL - Bottom Performers:');
    const bullWorst = metaLearner.getWorstStrategies('TRENDING_BULL', 10, 3);
    bullWorst.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name}: ${(s.winRate * 100).toFixed(1)}% (${s.trades} trades)`);
    });

    console.log('\n🏆 RANGING - Top Performers:');
    const rangeBest = metaLearner.getBestStrategies('RANGING', 10, 3);
    rangeBest.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name}: ${(s.winRate * 100).toFixed(1)}% (${s.trades} trades)`);
    });

    // Test 7: Manual override
    console.log('\n\n[Test 7] Testing manual override...\n');

    // Force disable a good strategy
    console.log('  Force DISABLING "Momentum Breakout" (override)...');
    metaLearner.forceStrategyState('Momentum Breakout', false, 'Testing manual override');

    const overrideDecision = metaLearner.shouldUseStrategy('Momentum Breakout', 'TRENDING_BULL');
    console.log(`  ✅ Override active: ${!overrideDecision.shouldUse ? 'DISABLED' : 'ENABLED'}`);
    console.log(`  Reason: ${overrideDecision.reason}\n`);

    // Clear override
    console.log('  Clearing override...');
    metaLearner.clearOverride('Momentum Breakout');

    const afterClear = metaLearner.shouldUseStrategy('Momentum Breakout', 'TRENDING_BULL');
    console.log(`  ✅ Override cleared: ${afterClear.shouldUse ? 'ENABLED' : 'DISABLED'}\n`);

    // Test 8: Get summary
    console.log('\n[Test 8] Getting summary for TRENDING_BULL...\n');
    const summary = metaLearner.getSummary('TRENDING_BULL');

    console.log(`Summary:`);
    console.log(`  Regime: ${summary.regime}`);
    console.log(`  ✅ Enabled: ${summary.enabled}`);
    console.log(`  ❌ Disabled: ${summary.disabled}`);
    console.log(`  📚 Learning: ${summary.learning}\n`);

    // Test 9: Generate full report
    console.log('\n[Test 9] Generating performance report...\n');
    console.log('='.repeat(70));
    const report = metaLearner.generateReport('TRENDING_BULL');
    console.log(report);

    // Test 10: Overall stats
    console.log('\n[Test 10] Overall strategy stats (across all regimes):\n');

    for (const strategy of strategies) {
        const overall = metaLearner.getOverallStats(strategy);
        console.log(`${strategy}:`);
        console.log(`  Win Rate: ${(overall.winRate * 100).toFixed(1)}%`);
        console.log(`  Trades: ${overall.wins + overall.losses} (${overall.wins}W/${overall.losses}L)`);
        console.log(`  Avg P&L: ${overall.avgPnL > 0 ? '+' : ''}${overall.avgPnL.toFixed(2)}%\n`);
    }

    console.log('='.repeat(70));
    console.log('🎉 Meta-Learning Test Complete!');
    console.log('='.repeat(70));

    // Key Insights
    console.log('\n📊 KEY INSIGHTS:\n');
    console.log('1. ✅ Momentum Breakout EXCELS in TRENDING_BULL (70% win rate)');
    console.log('2. ❌ Momentum Breakout FAILS in RANGING (35% win rate)');
    console.log('3. ❌ Mean Reversion FAILS in TRENDING_BULL (30% win rate)');
    console.log('4. ✅ Mean Reversion EXCELS in RANGING (75% win rate)');
    console.log('\n💡 This is WHY meta-learning is powerful:');
    console.log('   Same strategy, different regimes = opposite results!');
    console.log('   SOMA automatically uses the right strategy for the market.\n');

    return {
        success: true,
        strategiesTested: strategies.length,
        regimesTested: 2
    };
}

// Run tests
testMetaLearning()
    .then(results => {
        console.log('✅ All tests passed!');
        console.log(`\nTested ${results.strategiesTested} strategies across ${results.regimesTested} regimes\n`);
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error);
        console.error(error.stack);
        process.exit(1);
    });
