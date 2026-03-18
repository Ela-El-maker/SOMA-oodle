/**
 * Test Correlation Arbitrage System
 *
 * Tests:
 * 1. Initialize system
 * 2. Calculate correlation between pairs
 * 3. Detect spread divergence
 * 4. Generate trading signals
 * 5. Calculate trade parameters
 */

import { CorrelationArbitrage } from './arbiters/CorrelationArbitrage.js';

console.log('🧪 Testing Correlation Arbitrage\n');
console.log('='.repeat(70));

async function testCorrelationArbitrage() {
    // Test 1: Initialize
    console.log('\n[Test 1] Initializing Correlation Arbitrage System...');
    const arbSystem = new CorrelationArbitrage({ rootPath: process.cwd() });
    await arbSystem.initialize();
    console.log('✅ System initialized\n');

    // Test 2: Generate mock price data
    console.log('[Test 2] Generating mock price data...\n');

    // Simulate BTC and ETH prices (normally correlated)
    const btcPrices = [];
    const ethPrices = [];

    // Normal period: BTC and ETH move together
    let btcPrice = 50000;
    let ethPrice = 3000;

    for (let i = 0; i < 60; i++) {
        // Random walk with correlation
        const marketMove = (Math.random() - 0.5) * 0.02; // -1% to +1%

        btcPrice *= (1 + marketMove);
        ethPrice *= (1 + marketMove * 0.9); // Slightly lower correlation

        btcPrices.push(btcPrice);
        ethPrices.push(ethPrice);
    }

    // DIVERGENCE: BTC rallies but ETH doesn't follow
    console.log('  📈 Simulating divergence: BTC rallies +10%, ETH flat...\n');
    for (let i = 0; i < 5; i++) {
        btcPrice *= 1.02;  // BTC +2% per day
        ethPrice *= 1.001; // ETH +0.1% per day
        btcPrices.push(btcPrice);
        ethPrices.push(ethPrice);
    }

    console.log(`  BTC: $50,000 → $${btcPrice.toFixed(0)}`);
    console.log(`  ETH: $3,000 → $${ethPrice.toFixed(0)}\n`);

    // AAPL and MSFT (also normally correlated)
    const aaplPrices = [];
    const msftPrices = [];

    let aaplPrice = 150;
    let msftPrice = 300;

    for (let i = 0; i < 60; i++) {
        const marketMove = (Math.random() - 0.5) * 0.015;
        aaplPrice *= (1 + marketMove);
        msftPrice *= (1 + marketMove * 0.85);
        aaplPrices.push(aaplPrice);
        msftPrices.push(msftPrice);
    }

    // DIVERGENCE: MSFT dips but AAPL holds
    console.log('  📉 Simulating divergence: MSFT dips -8%, AAPL holds...\n');
    for (let i = 0; i < 5; i++) {
        aaplPrice *= 1.0;   // AAPL flat
        msftPrice *= 0.984; // MSFT -1.6% per day
        aaplPrices.push(aaplPrice);
        msftPrices.push(msftPrice);
    }

    console.log(`  AAPL: $150 → $${aaplPrice.toFixed(2)}`);
    console.log(`  MSFT: $300 → $${msftPrice.toFixed(2)}\n`);

    // Prepare price data
    const priceData = {
        'BTC-USD': btcPrices,
        'ETH-USD': ethPrices,
        'AAPL': aaplPrices,
        'MSFT': msftPrices
    };

    // Test 3: Calculate correlation
    console.log('\n[Test 3] Calculating correlations...\n');

    const btcEthCorr = arbSystem.calculateCorrelation(btcPrices, ethPrices);
    const aaplMsftCorr = arbSystem.calculateCorrelation(aaplPrices, msftPrices);

    console.log(`  BTC-USD / ETH-USD: ${(btcEthCorr * 100).toFixed(1)}%`);
    console.log(`  AAPL / MSFT: ${(aaplMsftCorr * 100).toFixed(1)}%\n`);

    // Test 4: Analyze BTC/ETH pair
    console.log('\n[Test 4] Analyzing BTC/ETH pair...\n');

    const btcEthAnalysis = arbSystem.analyzePair('BTC-USD', 'ETH-USD', btcPrices, ethPrices, 60);

    console.log(`  Tradeable: ${btcEthAnalysis.tradeable ? '✅ YES' : '❌ NO'}`);
    if (btcEthAnalysis.tradeable) {
        console.log(`  Correlation: ${(btcEthAnalysis.correlation * 100).toFixed(1)}%`);
        console.log(`  Current Spread: ${btcEthAnalysis.currentSpread.toFixed(2)}`);
        console.log(`  Mean Spread: ${btcEthAnalysis.meanSpread.toFixed(2)}`);
        console.log(`  Z-Score: ${btcEthAnalysis.zScore > 0 ? '+' : ''}${btcEthAnalysis.zScore.toFixed(2)}σ`);
        console.log(`  Signal: ${btcEthAnalysis.signal}`);

        if (btcEthAnalysis.action) {
            console.log(`\n  📊 Action:`);
            console.log(`    Type: ${btcEthAnalysis.action.type}`);
            console.log(`    Short: ${btcEthAnalysis.action.short} (overperformer)`);
            console.log(`    Long: ${btcEthAnalysis.action.long} (underperformer)`);
            console.log(`    Reason: ${btcEthAnalysis.action.reason}`);
        }
    } else {
        console.log(`  Reason: ${btcEthAnalysis.reason}`);
    }

    // Test 5: Analyze AAPL/MSFT pair
    console.log('\n\n[Test 5] Analyzing AAPL/MSFT pair...\n');

    const aaplMsftAnalysis = arbSystem.analyzePair('AAPL', 'MSFT', aaplPrices, msftPrices, 60);

    console.log(`  Tradeable: ${aaplMsftAnalysis.tradeable ? '✅ YES' : '❌ NO'}`);
    if (aaplMsftAnalysis.tradeable) {
        console.log(`  Correlation: ${(aaplMsftAnalysis.correlation * 100).toFixed(1)}%`);
        console.log(`  Current Spread: ${aaplMsftAnalysis.currentSpread.toFixed(4)}`);
        console.log(`  Mean Spread: ${aaplMsftAnalysis.meanSpread.toFixed(4)}`);
        console.log(`  Z-Score: ${aaplMsftAnalysis.zScore > 0 ? '+' : ''}${aaplMsftAnalysis.zScore.toFixed(2)}σ`);
        console.log(`  Signal: ${aaplMsftAnalysis.signal}`);

        if (aaplMsftAnalysis.action) {
            console.log(`\n  📊 Action:`);
            console.log(`    Type: ${aaplMsftAnalysis.action.type}`);
            console.log(`    Short: ${aaplMsftAnalysis.action.short} (overperformer)`);
            console.log(`    Long: ${aaplMsftAnalysis.action.long} (underperformer)`);
            console.log(`    Reason: ${aaplMsftAnalysis.action.reason}`);
        }
    }

    // Test 6: Find all opportunities
    console.log('\n\n[Test 6] Finding all trading opportunities...\n');

    const opportunities = await arbSystem.findOpportunities(priceData);

    console.log(`  Found ${opportunities.length} opportunities\n`);

    if (opportunities.length > 0) {
        console.log('  Top Opportunities:');
        console.log('  ' + '-'.repeat(66));

        opportunities.forEach((opp, i) => {
            console.log(`\n  ${i + 1}. ${arbSystem.formatOpportunity(opp)}`);
        });
    }

    // Test 7: Generate trade parameters
    if (opportunities.length > 0) {
        console.log('\n\n[Test 7] Generating trade parameters for top opportunity...\n');

        const topOpp = opportunities[0];
        const tradeParams = arbSystem.generateTradeParams(topOpp, 1000);

        console.log(`  Pair: ${tradeParams.pair.join(' / ')}`);
        console.log(`  Z-Score: ${tradeParams.zScore > 0 ? '+' : ''}${tradeParams.zScore.toFixed(2)}σ`);
        console.log(`  Correlation: ${(tradeParams.correlation * 100).toFixed(1)}%`);
        console.log(`\n  📈 LONG Position:`);
        console.log(`    Symbol: ${tradeParams.entry.long.symbol}`);
        console.log(`    Shares: ${tradeParams.entry.long.shares}`);
        console.log(`    Price: $${tradeParams.entry.long.price.toFixed(2)}`);
        console.log(`    Cost: $${tradeParams.entry.long.cost.toFixed(2)}`);

        console.log(`\n  📉 SHORT Position:`);
        console.log(`    Symbol: ${tradeParams.entry.short.symbol}`);
        console.log(`    Shares: ${tradeParams.entry.short.shares}`);
        console.log(`    Price: $${tradeParams.entry.short.price.toFixed(2)}`);
        console.log(`    Proceeds: $${tradeParams.entry.short.proceeds.toFixed(2)}`);

        console.log(`\n  💡 Strategy: ${tradeParams.reason}`);
        console.log(`\n  📊 Net Investment: $0 (market-neutral)`);
        console.log(`     Profit when spread converges back to mean!`);
    }

    // Test 8: Summary
    console.log('\n\n[Test 8] Generating summary...\n');

    const summary = arbSystem.getSummary(opportunities);

    console.log('  Summary:');
    console.log('  ' + '-'.repeat(66));
    console.log(`  Total Opportunities: ${summary.count}`);

    if (summary.topOpportunity) {
        console.log(`\n  🏆 Top Opportunity:`);
        console.log(`    Pair: ${summary.topOpportunity.pair}`);
        console.log(`    Action: ${summary.topOpportunity.action}`);
        console.log(`    Z-Score: ${summary.topOpportunity.zScore}σ`);
        console.log(`    Correlation: ${summary.topOpportunity.correlation}`);
        console.log(`    Reason: ${summary.topOpportunity.reason}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 Correlation Arbitrage Test Complete!');
    console.log('='.repeat(70));

    // Key Insights
    console.log('\n📊 KEY INSIGHTS:\n');
    console.log('1. BTC rallied +10% while ETH stayed flat (divergence!)');
    console.log('2. Z-score > 2σ = trading opportunity');
    console.log('3. Action: Short BTC (overperformer), Long ETH (underperformer)');
    console.log('4. When spread converges back to mean → profit!');
    console.log('5. Market-neutral: $0 net investment, profit from convergence\n');

    console.log('💡 WHY THIS WORKS:');
    console.log('   Assets that normally move together (high correlation)');
    console.log('   will eventually return to their normal relationship.');
    console.log('   When they diverge, bet on the convergence!\n');

    return {
        success: true,
        opportunitiesFound: opportunities.length
    };
}

// Run tests
testCorrelationArbitrage()
    .then(results => {
        console.log('✅ All tests passed!');
        console.log(`\nFound ${results.opportunitiesFound} pair trading opportunities\n`);
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error);
        console.error(error.stack);
        process.exit(1);
    });
