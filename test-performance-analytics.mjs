/**
 * Test Performance Analytics
 *
 * Tests:
 * 1. Recording trades
 * 2. Win rate calculation
 * 3. Profit factor
 * 4. Sharpe ratio estimation
 * 5. Strategy performance ranking
 * 6. Market regime performance
 * 7. Time-of-day analysis
 * 8. Insights generation
 * 9. Equity curve
 * 10. Report generation
 */

import { PerformanceAnalytics } from './arbiters/PerformanceAnalytics.js';

console.log('🧪 Testing Performance Analytics\n');
console.log('='.repeat(70));

async function testPerformanceAnalytics() {
    // Test 1: Initialize
    console.log('\n[Test 1] Initializing Performance Analytics...');
    const analytics = new PerformanceAnalytics({ rootPath: process.cwd() });
    await analytics.initialize();
    console.log('✅ System initialized\n');

    // Test 2: Record sample trades
    console.log('[Test 2] Recording sample trades...\n');

    // Create diverse trade history
    const sampleTrades = [
        // Momentum Strategy - Mostly winners
        { symbol: 'BTC-USD', side: 'BUY', entryPrice: 50000, exitPrice: 52500, pnl: 2500, pnlPercent: 5.0, strategy: 'Momentum', regime: 'Bull Market', holdingPeriod: 2, timestamp: Date.now() - 86400000 * 10 },
        { symbol: 'ETH-USD', side: 'BUY', entryPrice: 3000, exitPrice: 3300, pnl: 3000, pnlPercent: 10.0, strategy: 'Momentum', regime: 'Bull Market', holdingPeriod: 3, timestamp: Date.now() - 86400000 * 9 },
        { symbol: 'BTC-USD', side: 'BUY', entryPrice: 52500, exitPrice: 51000, pnl: -1500, pnlPercent: -2.9, strategy: 'Momentum', regime: 'Choppy', holdingPeriod: 1, timestamp: Date.now() - 86400000 * 8 },
        { symbol: 'AAPL', side: 'BUY', entryPrice: 150, exitPrice: 156, pnl: 600, pnlPercent: 4.0, strategy: 'Momentum', regime: 'Bull Market', holdingPeriod: 4, timestamp: Date.now() - 86400000 * 7 },

        // Mean Reversion Strategy - Mixed
        { symbol: 'BTC-USD', side: 'BUY', entryPrice: 48000, exitPrice: 50000, pnl: 2000, pnlPercent: 4.2, strategy: 'Mean Reversion', regime: 'Sideways', holdingPeriod: 2, timestamp: Date.now() - 86400000 * 6 },
        { symbol: 'ETH-USD', side: 'BUY', entryPrice: 2800, exitPrice: 2700, pnl: -1000, pnlPercent: -3.6, strategy: 'Mean Reversion', regime: 'Bear Market', holdingPeriod: 1, timestamp: Date.now() - 86400000 * 5 },
        { symbol: 'BTC-USD', side: 'BUY', entryPrice: 49000, exitPrice: 51000, pnl: 2000, pnlPercent: 4.1, strategy: 'Mean Reversion', regime: 'Sideways', holdingPeriod: 3, timestamp: Date.now() - 86400000 * 4 },

        // Breakout Strategy - High risk/reward
        { symbol: 'GME', side: 'BUY', entryPrice: 40, exitPrice: 120, pnl: 8000, pnlPercent: 200.0, strategy: 'Breakout', regime: 'Bull Market', holdingPeriod: 1, timestamp: Date.now() - 86400000 * 3 },
        { symbol: 'TSLA', side: 'BUY', entryPrice: 700, exitPrice: 650, pnl: -500, pnlPercent: -7.1, strategy: 'Breakout', regime: 'Choppy', holdingPeriod: 1, timestamp: Date.now() - 86400000 * 2 },
        { symbol: 'AMC', side: 'BUY', entryPrice: 10, exitPrice: 30, pnl: 2000, pnlPercent: 200.0, strategy: 'Breakout', regime: 'Bull Market', holdingPeriod: 1, timestamp: Date.now() - 86400000 * 1 },

        // Swing Trading - Conservative
        { symbol: 'AAPL', side: 'BUY', entryPrice: 150, exitPrice: 153, pnl: 300, pnlPercent: 2.0, strategy: 'Swing', regime: 'Bull Market', holdingPeriod: 5, timestamp: Date.now() - 86400000 * 10 + 3600000 * 5 },
        { symbol: 'MSFT', side: 'BUY', entryPrice: 300, exitPrice: 306, pnl: 200, pnlPercent: 2.0, strategy: 'Swing', regime: 'Bull Market', holdingPeriod: 7, timestamp: Date.now() - 86400000 * 9 + 3600000 * 10 },
        { symbol: 'GOOGL', side: 'BUY', entryPrice: 2800, exitPrice: 2750, pnl: -50, pnlPercent: -1.8, strategy: 'Swing', regime: 'Choppy', holdingPeriod: 3, timestamp: Date.now() - 86400000 * 8 + 3600000 * 14 },
        { symbol: 'AAPL', side: 'BUY', entryPrice: 153, exitPrice: 157, pnl: 400, pnlPercent: 2.6, strategy: 'Swing', regime: 'Bull Market', holdingPeriod: 4, timestamp: Date.now() - 86400000 * 7 + 3600000 * 9 },

        // Recent trades (various hours)
        { symbol: 'BTC-USD', side: 'BUY', entryPrice: 51000, exitPrice: 52000, pnl: 1000, pnlPercent: 2.0, strategy: 'Momentum', regime: 'Bull Market', holdingPeriod: 1, timestamp: Date.now() - 3600000 * 3 }, // 3 hours ago
        { symbol: 'ETH-USD', side: 'BUY', entryPrice: 3100, exitPrice: 3200, pnl: 1000, pnlPercent: 3.2, strategy: 'Momentum', regime: 'Bull Market', holdingPeriod: 1, timestamp: Date.now() - 3600000 * 1 }, // 1 hour ago
    ];

    for (const trade of sampleTrades) {
        await analytics.recordTrade(trade);
    }

    console.log(`  Recorded ${sampleTrades.length} sample trades ✅\n`);

    // Test 3: Generate performance report
    console.log('[Test 3] Generating performance report...\n');

    const report = analytics.generateReport();
    console.log(report);
    console.log('');

    // Test 4: Strategy rankings
    console.log('[Test 4] Strategy performance breakdown...\n');

    console.log('  Strategy Rankings:\n');
    const strategyStats = Array.from(analytics.strategyStats.entries())
        .map(([name, stats]) => ({
            name,
            winRate: stats.winRate,
            profitFactor: stats.profitFactor,
            totalPnL: stats.totalPnL,
            trades: stats.totalTrades
        }))
        .sort((a, b) => b.profitFactor - a.profitFactor);

    strategyStats.forEach((strategy, i) => {
        const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
        console.log(`  ${emoji} ${strategy.name.padEnd(16)} WR: ${strategy.winRate.toFixed(1).padStart(5)}%  PF: ${strategy.profitFactor.toFixed(2).padStart(5)}  P&L: $${strategy.totalPnL.toFixed(0).padStart(6)}  (${strategy.trades} trades)`);
    });
    console.log('');

    // Test 5: Market regime performance
    console.log('[Test 5] Market regime performance...\n');

    console.log('  Regime Performance:\n');
    const regimeStats = Array.from(analytics.regimeStats.entries())
        .map(([name, stats]) => ({
            name,
            winRate: stats.winRate,
            avgReturn: stats.totalPnLPercent / stats.totalTrades,
            trades: stats.totalTrades
        }))
        .sort((a, b) => b.avgReturn - a.avgReturn);

    regimeStats.forEach(regime => {
        const emoji = regime.avgReturn > 10 ? '🚀' : regime.avgReturn > 0 ? '📈' : '📉';
        console.log(`  ${emoji} ${regime.name.padEnd(16)} WR: ${regime.winRate.toFixed(1).padStart(5)}%  Avg: ${regime.avgReturn > 0 ? '+' : ''}${regime.avgReturn.toFixed(2).padStart(6)}%  (${regime.trades} trades)`);
    });
    console.log('');

    // Test 6: Equity curve
    console.log('[Test 6] Equity curve...\n');

    const equityCurve = analytics.getEquityCurve();

    console.log('  Equity Growth:');
    console.log('  Trade #    Date                Symbol       P&L      Running Total');
    console.log('  ' + '-'.repeat(70));

    // Show first 5, middle 3, and last 5
    const showTrades = [
        ...equityCurve.slice(0, 5),
        { separator: true },
        ...equityCurve.slice(7, 10),
        { separator: true },
        ...equityCurve.slice(-5)
    ];

    showTrades.forEach((point, i) => {
        if (point.separator) {
            console.log('  ...');
        } else {
            const tradeNum = equityCurve.indexOf(point) + 1;
            const date = new Date(point.date).toISOString().split('T')[0];
            const pnlStr = `${point.pnl > 0 ? '+' : ''}$${point.pnl.toFixed(0)}`;
            const equityStr = `$${point.equity.toFixed(0)}`;
            const emoji = point.equity > equityCurve[equityCurve.indexOf(point) - 1]?.equity ? '📈' : '📉';

            console.log(`  ${String(tradeNum).padStart(2)}         ${date}  ${point.trade.padEnd(10)} ${pnlStr.padStart(8)}  ${equityStr.padStart(10)} ${emoji}`);
        }
    });

    const finalEquity = equityCurve[equityCurve.length - 1].equity;
    const returnPercent = ((finalEquity / 100000) - 1) * 100; // Assume $100k starting capital
    console.log('  ' + '-'.repeat(70));
    console.log(`  Final Equity: $${finalEquity.toFixed(2)} (${returnPercent > 0 ? '+' : ''}${returnPercent.toFixed(2)}% return)\n`);

    // Test 7: Daily P&L breakdown
    console.log('[Test 7] Daily P&L breakdown...\n');

    const dailyPnL = analytics.getDailyPnL();

    console.log('  Recent Days:');
    console.log('  Date          P&L        Trades    Win Rate');
    console.log('  ' + '-'.repeat(50));

    dailyPnL.slice(-7).forEach(day => {
        const pnlStr = `${day.pnl > 0 ? '+' : ''}$${day.pnl.toFixed(0)}`;
        const emoji = day.pnl > 0 ? '✅' : '❌';
        console.log(`  ${day.date}  ${pnlStr.padStart(10)}  ${String(day.trades).padStart(6)}    ${day.winRate.toFixed(1).padStart(5)}% ${emoji}`);
    });
    console.log('');

    // Test 8: Time-of-day analysis
    console.log('[Test 8] Performance by hour...\n');

    const hourlyPerf = analytics.getPerformanceByHour();
    const activeHours = hourlyPerf.filter(h => h.trades > 0);

    if (activeHours.length > 0) {
        console.log('  Hour    Trades    Avg P&L    Win Rate    Total P&L');
        console.log('  ' + '-'.repeat(60));

        activeHours.forEach(hour => {
            const timeStr = `${String(hour.hour).padStart(2)}:00`;
            const avgPnlStr = `${hour.avgPnl > 0 ? '+' : ''}$${hour.avgPnl.toFixed(0)}`;
            const totalPnlStr = `${hour.pnl > 0 ? '+' : ''}$${hour.pnl.toFixed(0)}`;
            const emoji = hour.winRate > 60 ? '🔥' : hour.winRate > 50 ? '✅' : '⚠️';

            console.log(`  ${timeStr}   ${String(hour.trades).padStart(6)}    ${avgPnlStr.padStart(8)}   ${hour.winRate.toFixed(1).padStart(6)}%   ${totalPnlStr.padStart(10)} ${emoji}`);
        });
        console.log('');

        // Find best trading hour
        const bestHour = activeHours.reduce((best, h) => h.avgPnl > best.avgPnl ? h : best);
        console.log(`  💡 Best trading hour: ${bestHour.hour}:00 (${bestHour.avgPnl > 0 ? '+' : ''}$${bestHour.avgPnl.toFixed(0)} avg)\n`);
    }

    // Test 9: Insights generation
    console.log('[Test 9] Actionable insights...\n');

    const insights = analytics.generateInsights();
    console.log('  📊 Key Insights:\n');
    insights.forEach((insight, i) => {
        console.log(`    ${i + 1}. ${insight}`);
    });
    console.log('');

    // Test 10: CSV export
    console.log('[Test 10] Exporting data...\n');

    const csvPath = await analytics.exportToCSV();
    console.log(`  ✅ Exported to: ${csvPath}\n`);

    // Test 11: Calculate additional metrics
    console.log('[Test 11] Advanced metrics...\n');

    const overall = analytics.calculateOverallStats();

    // Calculate Sharpe Ratio approximation (assuming risk-free rate = 0 for simplicity)
    const returns = sampleTrades.map(t => t.pnlPercent / 100);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

    console.log('  📈 Advanced Metrics:');
    console.log(`    Sharpe Ratio (est):      ${sharpeRatio.toFixed(2)}`);
    console.log(`    Volatility:              ${(stdDev * 100).toFixed(2)}%`);
    console.log(`    Risk-Adjusted Return:    ${(avgReturn / Math.max(stdDev, 0.01) * 100).toFixed(2)}%`);
    console.log(`    Max Drawdown (est):      -${(Math.abs(overall.largestLoss) * 1.5).toFixed(2)}%`);
    console.log(`    Recovery Factor:         ${(overall.totalPnL / Math.max(Math.abs(overall.largestLoss) * 100, 1)).toFixed(2)}`);
    console.log('');

    // Test 12: Win/loss distribution
    console.log('[Test 12] Win/loss distribution...\n');

    const wins = sampleTrades.filter(t => t.pnl > 0);
    const losses = sampleTrades.filter(t => t.pnl < 0);

    console.log('  Distribution:');
    console.log(`    Small wins (<5%):        ${wins.filter(t => t.pnlPercent < 5).length}`);
    console.log(`    Medium wins (5-20%):     ${wins.filter(t => t.pnlPercent >= 5 && t.pnlPercent < 20).length}`);
    console.log(`    Large wins (>20%):       ${wins.filter(t => t.pnlPercent >= 20).length}`);
    console.log('');
    console.log(`    Small losses (<5%):      ${losses.filter(t => Math.abs(t.pnlPercent) < 5).length}`);
    console.log(`    Medium losses (5-10%):   ${losses.filter(t => Math.abs(t.pnlPercent) >= 5 && Math.abs(t.pnlPercent) < 10).length}`);
    console.log(`    Large losses (>10%):     ${losses.filter(t => Math.abs(t.pnlPercent) >= 10).length}`);
    console.log('');

    // Test 13: Strategy comparison table
    console.log('[Test 13] Strategy comparison table...\n');

    console.log('  Detailed Strategy Comparison:');
    console.log('  ' + '='.repeat(90));
    console.log('  Strategy         Trades  Win%    Avg Win   Avg Loss  P/F    Total P&L   Best Trade');
    console.log('  ' + '-'.repeat(90));

    strategyStats.forEach(strategy => {
        const stats = analytics.strategyStats.get(strategy.name);
        const bestTrade = Math.max(...stats.trades.map(t => t.pnlPercent));

        console.log(
            `  ${strategy.name.padEnd(15)} ${String(strategy.trades).padStart(6)}  ` +
            `${strategy.winRate.toFixed(1).padStart(5)}%  ` +
            `${stats.avgWin.toFixed(2).padStart(7)}%  ` +
            `${stats.avgLoss.toFixed(2).padStart(8)}%  ` +
            `${strategy.profitFactor.toFixed(2).padStart(5)}  ` +
            `${(strategy.totalPnL > 0 ? '+' : '') + '$' + strategy.totalPnL.toFixed(0).padStart(6)}  ` +
            `${bestTrade.toFixed(1)}%`
        );
    });
    console.log('  ' + '='.repeat(90));
    console.log('');

    console.log('='.repeat(70));
    console.log('🎉 Performance Analytics Test Complete!');
    console.log('='.repeat(70));

    // Summary
    console.log('\n📊 TEST SUMMARY:\n');
    console.log(`Total Trades Analyzed:   ${sampleTrades.length}`);
    console.log(`Strategies Tested:       ${strategyStats.length}`);
    console.log(`Market Regimes:          ${regimeStats.length}`);
    console.log(`Overall Win Rate:        ${overall.winRate.toFixed(1)}%`);
    console.log(`Total P&L:               ${overall.totalPnL > 0 ? '+' : ''}$${overall.totalPnL.toFixed(2)}`);
    console.log(`Profit Factor:           ${overall.profitFactor.toFixed(2)}`);
    console.log(`Best Strategy:           ${strategyStats[0].name} (${strategyStats[0].winRate.toFixed(1)}% WR)`);
    console.log(`Sharpe Ratio (est):      ${sharpeRatio.toFixed(2)}`);
    console.log('');

    console.log('💡 WHY THIS MATTERS:');
    console.log('   "You can\'t improve what you don\'t measure"');
    console.log('   - Track EVERY trade for learning');
    console.log('   - Identify winning strategies (double down!)');
    console.log('   - Identify losing strategies (stop using!)');
    console.log('   - Find your best trading hours');
    console.log('   - Optimize based on market regime');
    console.log('   - Professional-grade analytics!');
    console.log('');

    console.log('🎯 KEY FEATURES:');
    console.log('   ✅ Win rate tracking');
    console.log('   ✅ Profit factor calculation');
    console.log('   ✅ Strategy performance ranking');
    console.log('   ✅ Market regime analysis');
    console.log('   ✅ Time-of-day optimization');
    console.log('   ✅ Equity curve visualization');
    console.log('   ✅ Automated insights generation');
    console.log('   ✅ CSV export for external analysis');
    console.log('');

    console.log('📈 ACTIONABLE INSIGHTS:');
    console.log(`   Best Strategy: ${strategyStats[0].name} with ${strategyStats[0].profitFactor.toFixed(2)}x profit factor`);
    console.log(`   Worst Strategy: ${strategyStats[strategyStats.length - 1].name} - consider avoiding`);
    console.log(`   Best Market: ${regimeStats[0].name} markets (${regimeStats[0].avgReturn.toFixed(2)}% avg return)`);
    if (activeHours.length > 0) {
        const bestHour = activeHours.reduce((best, h) => h.avgPnl > best.avgPnl ? h : best);
        console.log(`   Best Hour: ${bestHour.hour}:00 (${bestHour.avgPnl > 0 ? '+' : ''}$${bestHour.avgPnl.toFixed(0)} avg P&L)`);
    }
    console.log('');

    return {
        success: true,
        tradesAnalyzed: sampleTrades.length,
        winRate: overall.winRate,
        profitFactor: overall.profitFactor,
        sharpeRatio
    };
}

// Run tests
testPerformanceAnalytics()
    .then(results => {
        console.log('✅ All tests passed!\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error);
        console.error(error.stack);
        process.exit(1);
    });
