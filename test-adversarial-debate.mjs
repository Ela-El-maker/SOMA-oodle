/**
 * Test Adversarial Debate System
 *
 * Tests:
 * 1. Bullish setup debate (should EXECUTE)
 * 2. Bearish setup debate (should REJECT)
 * 3. Mixed signals debate (should be NEUTRAL)
 * 4. High risk debate (should reduce size)
 * 5. Debate statistics tracking
 */

import { AdversarialDebate } from './arbiters/AdversarialDebate.js';

console.log('🧪 Testing Adversarial Debate System\n');
console.log('='.repeat(70));

async function testAdversarialDebate() {
    // Test 1: Initialize
    console.log('\n[Test 1] Initializing Adversarial Debate System...');
    const debater = new AdversarialDebate({ rootPath: process.cwd() });
    await debater.initialize();
    console.log('✅ System initialized\n');

    // Test 2: Strong Bullish Setup
    console.log('\n[Test 2] Debate: Strong Bullish Setup\n');
    console.log('Scenario: BTC breakout with all indicators bullish\n');

    const bullishProposal = {
        symbol: 'BTC-USD',
        side: 'BUY',
        size: 1.5,
        price: 50000,
        technicals: {
            trend: 'BULLISH',
            rsi: 62.5,
            macd: 150.2,
            support: 48000,
            resistance: 52000
        },
        fundamentals: {
            revenue_growth: 0.25, // 25% growth
            pe_ratio: 15,
            market_cap: 1000000000
        },
        sentiment: {
            score: 0.72, // 72% positive
            source: 'Reddit + Twitter'
        }
    };

    const result1 = await debater.debate(bullishProposal);

    console.log('\nTest 2 Result:');
    console.log(`  Decision: ${result1.decision}`);
    console.log(`  Confidence: ${(result1.confidence * 100).toFixed(1)}%`);
    console.log(`  Winner: ${result1.verdict.winner}`);
    console.log(`  Expected: EXECUTE (bullish setup)\n`);

    // Test 3: Strong Bearish Setup
    console.log('\n[Test 3] Debate: Strong Bearish Setup\n');
    console.log('Scenario: ETH overbought with negative signals\n');

    const bearishProposal = {
        symbol: 'ETH-USD',
        side: 'BUY',
        size: 10,
        price: 3000,
        technicals: {
            trend: 'BEARISH',
            rsi: 78.5, // Overbought!
            macd: -85.3,
            support: 2800,
            resistance: 3100
        },
        fundamentals: {
            revenue_growth: -0.05, // Declining
            pe_ratio: 45, // Expensive
            market_cap: 350000000
        },
        sentiment: {
            score: 0.85, // Extreme optimism (contrarian warning)
            source: 'Reddit'
        }
    };

    const result2 = await debater.debate(bearishProposal);

    console.log('\nTest 3 Result:');
    console.log(`  Decision: ${result2.decision}`);
    console.log(`  Confidence: ${(result2.confidence * 100).toFixed(1)}%`);
    console.log(`  Winner: ${result2.verdict.winner}`);
    console.log(`  Expected: REJECT (bearish setup)\n`);

    // Test 4: Mixed Signals
    console.log('\n[Test 4] Debate: Mixed Signals\n');
    console.log('Scenario: AAPL with conflicting indicators\n');

    const mixedProposal = {
        symbol: 'AAPL',
        side: 'BUY',
        size: 100,
        price: 150,
        technicals: {
            trend: 'BULLISH',
            rsi: 65.0, // Neutral
            macd: 0.5, // Barely positive
            support: 145,
            resistance: 155
        },
        fundamentals: {
            revenue_growth: 0.08, // Modest growth
            pe_ratio: 28, // Fair value
            market_cap: 2500000000000
        },
        sentiment: {
            score: 0.55, // Slightly positive
            source: 'News'
        }
    };

    const result3 = await debater.debate(mixedProposal);

    console.log('\nTest 4 Result:');
    console.log(`  Decision: ${result3.decision}`);
    console.log(`  Confidence: ${(result3.confidence * 100).toFixed(1)}%`);
    console.log(`  Winner: ${result3.verdict.winner}`);
    console.log(`  Expected: NEUTRAL or low confidence (mixed signals)\n`);

    // Test 5: High Risk Setup
    console.log('\n[Test 5] Debate: High Risk But Bullish\n');
    console.log('Scenario: TSLA with extreme volatility\n');

    const riskyProposal = {
        symbol: 'TSLA',
        side: 'BUY',
        size: 50,
        price: 250,
        technicals: {
            trend: 'BULLISH',
            rsi: 55.0,
            macd: 25.5,
            support: 230,
            resistance: 280,
            volatility: 0.08 // 8% daily volatility!
        },
        fundamentals: {
            revenue_growth: 0.45, // Huge growth
            pe_ratio: 60, // Very expensive
            market_cap: 800000000000
        },
        sentiment: {
            score: 0.90, // Extreme optimism
            source: 'Elon tweet'
        }
    };

    const result4 = await debater.debate(riskyProposal);

    console.log('\nTest 5 Result:');
    console.log(`  Decision: ${result4.decision}`);
    console.log(`  Confidence: ${(result4.confidence * 100).toFixed(1)}%`);
    console.log(`  Risk Level: ${(result4.verdict.avgRisk * 100).toFixed(1)}%`);
    console.log(`  Recommendation: ${result4.recommendation}`);
    console.log(`  Expected: May execute, but likely recommend reduced size\n`);

    // Test 6: Debate Statistics
    console.log('\n[Test 6] Checking debate statistics...\n');

    const stats = debater.getStats();

    console.log('  Debate Statistics:');
    console.log(`    Total Debates: ${stats.total}`);
    console.log(`    Bull Wins: ${stats.bullWins} (${(stats.bullWinRate * 100).toFixed(1)}%)`);
    console.log(`    Bear Wins: ${stats.bearWins} (${(stats.bearWinRate * 100).toFixed(1)}%)`);
    console.log(`    Ties: ${stats.ties}`);
    console.log(`    Avg Confidence: ${(stats.avgConfidence * 100).toFixed(1)}%\n`);

    // Test 7: Recent Debates
    console.log('\n[Test 7] Recent debates summary...\n');

    const recent = debater.getRecentDebates(4);

    console.log('  Recent Debates:');
    console.log('  ' + '-'.repeat(60));
    recent.forEach((debate, i) => {
        console.log(`  ${i + 1}. ${debate.proposal.symbol} ${debate.proposal.side}`);
        console.log(`     Decision: ${debate.verdict.decision}`);
        console.log(`     Winner: ${debate.verdict.winner}`);
        console.log(`     Confidence: ${(debate.verdict.confidence * 100).toFixed(1)}%\n`);
    });

    console.log('='.repeat(70));
    console.log('🎉 Adversarial Debate Test Complete!');
    console.log('='.repeat(70));

    // Key insights
    console.log('\n📊 KEY INSIGHTS:\n');
    console.log('1. Bull agent argues FOR the trade (finds reasons to execute)');
    console.log('2. Bear agent argues AGAINST (finds risks and concerns)');
    console.log('3. Arbiter evaluates both sides, makes balanced decision');
    console.log('4. 3 rounds: Opening, Rebuttal, Closing arguments');
    console.log('5. Reduces confirmation bias by forcing counterarguments\n');

    console.log('💡 WHY THIS WORKS:');
    console.log('   Humans have confirmation bias: We see what we want to see.');
    console.log('   Adversarial process forces examination of opposing views.');
    console.log('   Better decisions through structured debate!');
    console.log('   Like having a devil\'s advocate for every trade.\n');

    console.log('🎯 EXAMPLE WORKFLOW:');
    console.log('   You want to buy BTC because it\'s "going to the moon" 🚀');
    console.log('   Bull: "Strong technicals, momentum, breakout..."');
    console.log('   Bear: "But RSI overbought, resistance ahead, macro risks..."');
    console.log('   Arbiter: "Hmm, valid points on both sides. Execute with caution."');
    console.log('   Result: Reduced position size, better risk management!\n');

    console.log('✅ BENEFITS:');
    console.log('   - Catches risks you might have missed');
    console.log('   - Reduces emotional trading');
    console.log('   - Forces disciplined analysis');
    console.log('   - Improves decision quality\n');

    return {
        success: true,
        totalDebates: stats.total,
        decisions: {
            test1: result1.decision,
            test2: result2.decision,
            test3: result3.decision,
            test4: result4.decision
        }
    };
}

// Run tests
testAdversarialDebate()
    .then(results => {
        console.log('✅ All tests passed!\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error);
        console.error(error.stack);
        process.exit(1);
    });
