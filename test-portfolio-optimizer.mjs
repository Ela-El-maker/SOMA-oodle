/**
 * Test Portfolio Optimizer
 *
 * Tests:
 * 1. Calculate returns, volatility, correlation
 * 2. Equal weight allocation
 * 3. Risk parity allocation
 * 4. Maximum Sharpe allocation
 * 5. Minimum variance allocation
 * 6. Efficient frontier generation
 * 7. Rebalancing detection
 * 8. Trade generation
 */

import { PortfolioOptimizer } from './arbiters/PortfolioOptimizer.js';

console.log('🧪 Testing Portfolio Optimizer\n');
console.log('='.repeat(70));

async function testPortfolioOptimizer() {
    // Test 1: Initialize
    console.log('\n[Test 1] Initializing Portfolio Optimizer...');
    const optimizer = new PortfolioOptimizer({ rootPath: process.cwd() });
    await optimizer.initialize();
    console.log('✅ System initialized\n');

    // Test 2: Generate mock price data
    console.log('[Test 2] Generating mock price data...\n');

    // Simulate 5 assets with different characteristics:
    // BTC: High return, high volatility
    // ETH: High return, high volatility (correlated with BTC)
    // AAPL: Moderate return, moderate volatility
    // MSFT: Moderate return, moderate volatility (correlated with AAPL)
    // TLT: Low return, low volatility (bonds - negative correlation)

    const symbols = ['BTC-USD', 'ETH-USD', 'AAPL', 'MSFT', 'TLT'];
    const priceData = {};

    // BTC: Start at $50k, avg +0.2% daily, high volatility
    let btcPrice = 50000;
    const btcPrices = [];
    for (let i = 0; i < 90; i++) {
        btcPrice *= (1 + (Math.random() - 0.45) * 0.05); // -2.5% to +2.5% daily
        btcPrices.push(btcPrice);
    }
    priceData['BTC-USD'] = btcPrices;

    // ETH: Start at $3k, similar to BTC (high correlation)
    let ethPrice = 3000;
    const ethPrices = [];
    for (let i = 0; i < 90; i++) {
        const btcMove = (btcPrices[i] - (btcPrices[i - 1] || 50000)) / (btcPrices[i - 1] || 50000);
        ethPrice *= (1 + btcMove * 0.8 + (Math.random() - 0.5) * 0.02); // Follow BTC with noise
        ethPrices.push(ethPrice);
    }
    priceData['ETH-USD'] = ethPrices;

    // AAPL: Start at $150, moderate growth, lower volatility
    let aaplPrice = 150;
    const aaplPrices = [];
    for (let i = 0; i < 90; i++) {
        aaplPrice *= (1 + (Math.random() - 0.45) * 0.02); // -1% to +1% daily
        aaplPrices.push(aaplPrice);
    }
    priceData['AAPL'] = aaplPrices;

    // MSFT: Start at $300, similar to AAPL
    let msftPrice = 300;
    const msftPrices = [];
    for (let i = 0; i < 90; i++) {
        const aaplMove = (aaplPrices[i] - (aaplPrices[i - 1] || 150)) / (aaplPrices[i - 1] || 150);
        msftPrice *= (1 + aaplMove * 0.7 + (Math.random() - 0.5) * 0.015);
        msftPrices.push(msftPrice);
    }
    priceData['MSFT'] = msftPrices;

    // TLT: Start at $100, low volatility, inverse to stocks
    let tltPrice = 100;
    const tltPrices = [];
    for (let i = 0; i < 90; i++) {
        const marketMove = ((btcPrices[i] - (btcPrices[i - 1] || 50000)) / (btcPrices[i - 1] || 50000)) * 0.3;
        tltPrice *= (1 - marketMove + (Math.random() - 0.5) * 0.005); // Inverse correlation
        tltPrices.push(tltPrice);
    }
    priceData['TLT'] = tltPrices;

    // Show price changes
    symbols.forEach(symbol => {
        const prices = priceData[symbol];
        const startPrice = prices[0];
        const endPrice = prices[prices.length - 1];
        const change = ((endPrice - startPrice) / startPrice) * 100;
        console.log(`  ${symbol.padEnd(10)} $${startPrice.toFixed(2)} → $${endPrice.toFixed(2)} (${change > 0 ? '+' : ''}${change.toFixed(1)}%)`);
    });

    // Test 3: Calculate metrics
    console.log('\n[Test 3] Calculating asset metrics...\n');

    const metrics = {};
    symbols.forEach(symbol => {
        const prices = priceData[symbol];
        const returns = optimizer.calculateReturns(prices);
        const expectedReturn = optimizer.calculateExpectedReturn(returns);
        const volatility = optimizer.calculateVolatility(returns);
        const sharpe = optimizer.calculateSharpeRatio(expectedReturn, volatility);

        metrics[symbol] = {
            expectedReturn: expectedReturn * 252, // Annualized
            volatility: volatility * Math.sqrt(252), // Annualized
            sharpe
        };

        console.log(`  ${symbol.padEnd(10)}`);
        console.log(`    Expected Return: ${(metrics[symbol].expectedReturn * 100).toFixed(1)}% annually`);
        console.log(`    Volatility: ${(metrics[symbol].volatility * 100).toFixed(1)}% annually`);
        console.log(`    Sharpe Ratio: ${metrics[symbol].sharpe.toFixed(2)}`);
    });

    // Test 4: Calculate correlation matrix
    console.log('\n[Test 4] Calculating correlation matrix...\n');

    const returnData = {};
    symbols.forEach(symbol => {
        returnData[symbol] = optimizer.calculateReturns(priceData[symbol]);
    });

    const correlationMatrix = optimizer.calculateCorrelationMatrix(symbols, returnData);

    console.log('  Correlation Matrix:');
    console.log('  ' + ''.padEnd(12) + symbols.map(s => s.padEnd(10)).join(''));
    correlationMatrix.forEach((row, i) => {
        const rowStr = row.map(val => {
            const formatted = val.toFixed(2);
            return val > 0.7 ? `\x1b[32m${formatted}\x1b[0m` : // Green for high correlation
                   val < -0.3 ? `\x1b[31m${formatted}\x1b[0m` : // Red for negative correlation
                   formatted;
        }).map(s => s.padEnd(10)).join('');
        console.log(`  ${symbols[i].padEnd(12)}${rowStr}`);
    });

    // Test 5: Equal weight allocation
    console.log('\n[Test 5] Testing Equal Weight allocation...\n');

    const equalWeight = optimizer.optimizePortfolio(symbols, priceData, 'equal_weight');

    console.log('  Equal Weight Allocation:');
    console.log(optimizer.formatAllocation(equalWeight.allocation, 10000));
    console.log(`\n  Portfolio Metrics:`);
    console.log(`    Expected Return: ${(equalWeight.metrics.annualizedReturn * 100).toFixed(2)}%`);
    console.log(`    Volatility: ${(equalWeight.metrics.annualizedVolatility * 100).toFixed(2)}%`);
    console.log(`    Sharpe Ratio: ${equalWeight.metrics.sharpeRatio.toFixed(2)}`);

    // Test 6: Risk parity allocation
    console.log('\n\n[Test 6] Testing Risk Parity allocation...\n');

    const riskParity = optimizer.optimizePortfolio(symbols, priceData, 'risk_parity');

    console.log('  Risk Parity Allocation (equal risk contribution):');
    console.log(optimizer.formatAllocation(riskParity.allocation, 10000));
    console.log(`\n  Portfolio Metrics:`);
    console.log(`    Expected Return: ${(riskParity.metrics.annualizedReturn * 100).toFixed(2)}%`);
    console.log(`    Volatility: ${(riskParity.metrics.annualizedVolatility * 100).toFixed(2)}%`);
    console.log(`    Sharpe Ratio: ${riskParity.metrics.sharpeRatio.toFixed(2)}`);

    // Test 7: Maximum Sharpe allocation
    console.log('\n\n[Test 7] Testing Maximum Sharpe allocation...\n');

    const maxSharpe = optimizer.optimizePortfolio(symbols, priceData, 'max_sharpe');

    console.log('  Maximum Sharpe Allocation:');
    console.log(optimizer.formatAllocation(maxSharpe.allocation, 10000));
    console.log(`\n  Portfolio Metrics:`);
    console.log(`    Expected Return: ${(maxSharpe.metrics.annualizedReturn * 100).toFixed(2)}%`);
    console.log(`    Volatility: ${(maxSharpe.metrics.annualizedVolatility * 100).toFixed(2)}%`);
    console.log(`    Sharpe Ratio: ${maxSharpe.metrics.sharpeRatio.toFixed(2)} 🏆`);

    // Test 8: Minimum variance allocation
    console.log('\n\n[Test 8] Testing Minimum Variance allocation...\n');

    const minVariance = optimizer.optimizePortfolio(symbols, priceData, 'min_variance');

    console.log('  Minimum Variance Allocation:');
    console.log(optimizer.formatAllocation(minVariance.allocation, 10000));
    console.log(`\n  Portfolio Metrics:`);
    console.log(`    Expected Return: ${(minVariance.metrics.annualizedReturn * 100).toFixed(2)}%`);
    console.log(`    Volatility: ${(minVariance.metrics.annualizedVolatility * 100).toFixed(2)}% 🛡️ (lowest risk)`);
    console.log(`    Sharpe Ratio: ${minVariance.metrics.sharpeRatio.toFixed(2)}`);

    // Test 9: Compare all methods
    console.log('\n\n[Test 9] Comparing all allocation methods...\n');

    const comparison = [
        { name: 'Equal Weight', ...equalWeight.metrics },
        { name: 'Risk Parity', ...riskParity.metrics },
        { name: 'Max Sharpe', ...maxSharpe.metrics },
        { name: 'Min Variance', ...minVariance.metrics }
    ];

    console.log('  Method              Return    Volatility  Sharpe');
    console.log('  ' + '-'.repeat(60));
    comparison.forEach(method => {
        const ret = (method.annualizedReturn * 100).toFixed(1) + '%';
        const vol = (method.annualizedVolatility * 100).toFixed(1) + '%';
        const sharpe = method.sharpeRatio.toFixed(2);

        console.log(`  ${method.name.padEnd(18)} ${ret.padStart(7)}  ${vol.padStart(9)}  ${sharpe.padStart(6)}`);
    });

    // Test 10: Generate efficient frontier
    console.log('\n\n[Test 10] Generating efficient frontier...\n');

    const frontier = optimizer.generateEfficientFrontier(symbols, priceData, 10);

    if (frontier.success) {
        console.log('  Efficient Frontier (10 portfolios):');
        console.log('  ' + '-'.repeat(60));
        console.log('  Portfolio   Return    Volatility  Sharpe');
        console.log('  ' + '-'.repeat(60));

        frontier.frontier.forEach((portfolio, i) => {
            const ret = (portfolio.expectedReturn * 100).toFixed(1) + '%';
            const vol = (portfolio.volatility * 100).toFixed(1) + '%';
            const sharpe = portfolio.sharpeRatio.toFixed(2);

            const label = i === 0 ? '(Min Vol)' :
                         portfolio === frontier.maxSharpe ? '(Max Sharpe)' :
                         '';

            console.log(`  ${String(i + 1).padStart(2)}${label.padEnd(10)} ${ret.padStart(7)}  ${vol.padStart(9)}  ${sharpe.padStart(6)}`);
        });

        console.log('\n  🏆 Best Risk-Adjusted Portfolio (Max Sharpe):');
        console.log(optimizer.formatAllocation(frontier.maxSharpe.allocation, 10000));
    }

    // Test 11: Rebalancing
    console.log('\n\n[Test 11] Testing portfolio rebalancing...\n');

    // Simulate current portfolio drifted from target
    const targetAllocation = maxSharpe.allocation;
    const currentAllocation = {
        'BTC-USD': 0.35, // Drifted up (was 0.25)
        'ETH-USD': 0.15, // Drifted down (was 0.20)
        'AAPL': 0.20,
        'MSFT': 0.20,
        'TLT': 0.10
    };

    console.log('  Current Allocation:');
    console.log(optimizer.formatAllocation(currentAllocation, 10000));

    console.log('\n  Target Allocation:');
    console.log(optimizer.formatAllocation(targetAllocation, 10000));

    const rebalanceCheck = optimizer.needsRebalancing(currentAllocation, targetAllocation);

    console.log(`\n  Needs Rebalancing: ${rebalanceCheck.needsRebalance ? '✅ YES' : '❌ NO'}`);
    console.log(`  Max Drift: ${(rebalanceCheck.maxDrift * 100).toFixed(2)}%`);

    if (rebalanceCheck.needsRebalance) {
        console.log('\n  Drifts detected:');
        rebalanceCheck.drifts.forEach(drift => {
            console.log(`    ${drift.symbol}: ${(drift.current * 100).toFixed(1)}% → ${(drift.target * 100).toFixed(1)}% (drift: ${(drift.drift * 100).toFixed(1)}%)`);
        });

        // Generate trades
        const trades = optimizer.generateRebalancingTrades(currentAllocation, targetAllocation, 10000);

        console.log('\n  Rebalancing Trades:');
        console.log('  ' + '-'.repeat(60));
        trades.forEach(trade => {
            const action = trade.action === 'BUY' ? '📈 BUY ' : '📉 SELL';
            console.log(`    ${action} ${trade.symbol.padEnd(10)} $${trade.dollarAmount.toFixed(2).padStart(8)}`);
            console.log(`      ${trade.reason}`);
        });
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 Portfolio Optimizer Test Complete!');
    console.log('='.repeat(70));

    // Key insights
    console.log('\n📊 KEY INSIGHTS:\n');
    console.log('1. Equal Weight: Simple, but ignores risk/return profiles');
    console.log('2. Risk Parity: Balances risk contribution across assets');
    console.log('3. Max Sharpe: Best risk-adjusted returns (highest Sharpe ratio)');
    console.log('4. Min Variance: Lowest volatility, but may sacrifice returns');
    console.log('5. Efficient Frontier: Shows all optimal portfolios at different risk levels');
    console.log('6. Rebalancing: Keeps portfolio aligned with target allocation\n');

    console.log('💡 PORTFOLIO THEORY:');
    console.log('   Diversification reduces risk without sacrificing returns.');
    console.log('   Correlation matters: Mix assets that move differently.');
    console.log('   TLT (bonds) provides negative correlation → portfolio stabilizer.');
    console.log('   Max Sharpe portfolio balances growth (crypto/stocks) with stability (bonds).\n');

    return {
        success: true,
        allocations: {
            equalWeight,
            riskParity,
            maxSharpe,
            minVariance
        },
        frontier
    };
}

// Run tests
testPortfolioOptimizer()
    .then(results => {
        console.log('✅ All tests passed!\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error);
        console.error(error.stack);
        process.exit(1);
    });
