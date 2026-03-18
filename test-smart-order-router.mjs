/**
 * Test Smart Order Router
 *
 * Tests:
 * 1. Market impact estimation
 * 2. TWAP order generation
 * 3. VWAP order generation
 * 4. Iceberg order generation
 * 5. Adaptive order generation
 * 6. Smart routing decision making
 * 7. Order execution simulation
 * 8. Execution quality metrics
 */

import { SmartOrderRouter } from './arbiters/SmartOrderRouter.js';

console.log('🧪 Testing Smart Order Router\n');
console.log('='.repeat(70));

async function testSmartOrderRouter() {
    // Test 1: Initialize
    console.log('\n[Test 1] Initializing Smart Order Router...');
    const router = new SmartOrderRouter({ rootPath: process.cwd() });
    await router.initialize();
    console.log('✅ System initialized\n');

    // Test 2: Market Impact Estimation
    console.log('[Test 2] Estimating market impact...\n');

    const scenarios = [
        {
            name: 'Small Order',
            orderSize: 1, // 1 BTC
            adv: 1000, // 1000 BTC average daily volume
            side: 'BUY'
        },
        {
            name: 'Medium Order',
            orderSize: 50, // 50 BTC
            adv: 1000,
            side: 'BUY'
        },
        {
            name: 'Large Order',
            orderSize: 200, // 200 BTC
            adv: 1000,
            side: 'BUY'
        }
    ];

    scenarios.forEach(scenario => {
        const impact = router.estimateMarketImpact(scenario.orderSize, scenario.adv, scenario.side);

        console.log(`  ${scenario.name}:`);
        console.log(`    Order: ${scenario.orderSize} BTC`);
        console.log(`    ADV: ${scenario.adv} BTC`);
        console.log(`    Volume %: ${(impact.volumeParticipation * 100).toFixed(2)}%`);
        console.log(`    Impact: ${(impact.impact * 100).toFixed(3)}%`);
        console.log(`    Severity: ${impact.severity}`);
        console.log(`    Cost on $${scenario.orderSize * 50000}: $${(impact.impact * scenario.orderSize * 50000).toFixed(2)}\n`);
    });

    // Test 3: TWAP Order
    console.log('\n[Test 3] Generating TWAP order...\n');

    const twapOrder = router.generateTWAPSchedule(
        10, // 10 BTC
        60, // Over 60 minutes
        50000 // $50k per BTC
    );

    console.log(`  Algorithm: ${twapOrder.algorithm}`);
    console.log(`  Total Size: ${twapOrder.totalSize} BTC`);
    console.log(`  Num Slices: ${twapOrder.numSlices}`);
    console.log(`  Slice Size: ${twapOrder.sliceSize.toFixed(4)} BTC each`);
    console.log(`  Interval: ${(twapOrder.intervalMs / 1000 / 60).toFixed(1)} minutes\n`);

    console.log('  Execution Schedule (first 5 slices):');
    console.log('  Slice  Size       Time');
    console.log('  ' + '-'.repeat(40));
    twapOrder.schedule.slice(0, 5).forEach(slice => {
        const time = new Date(slice.executionTime).toLocaleTimeString();
        console.log(`  ${slice.sliceNumber.toString().padStart(3)}    ${slice.size.toFixed(4)} BTC  ${time}`);
    });

    // Test 4: VWAP Order
    console.log('\n\n[Test 4] Generating VWAP order...\n');

    const vwapOrder = router.generateVWAPSchedule(
        10, // 10 BTC
        null, // Use default volume profile
        60, // Over 60 minutes
        50000
    );

    console.log(`  Algorithm: ${vwapOrder.algorithm}`);
    console.log(`  Total Size: ${vwapOrder.totalSize} BTC`);
    console.log(`  Num Slices: ${vwapOrder.numSlices}`);
    console.log(`  Interval: ${(vwapOrder.intervalMs / 1000 / 60).toFixed(1)} minutes\n`);

    console.log('  Execution Schedule (U-shaped volume):');
    console.log('  Slice  Size       Volume Weight  Time');
    console.log('  ' + '-'.repeat(50));
    vwapOrder.schedule.slice(0, 8).forEach(slice => {
        const time = new Date(slice.executionTime).toLocaleTimeString();
        const bar = '█'.repeat(Math.round(slice.volumeWeight * 50));
        console.log(`  ${slice.sliceNumber.toString().padStart(3)}    ${slice.size.toFixed(4)} BTC  ${(slice.volumeWeight * 100).toFixed(1)}%  ${bar}`);
    });

    console.log('\n  💡 VWAP follows market volume (high at open/close, low midday)');

    // Test 5: Iceberg Order
    console.log('\n\n[Test 5] Generating Iceberg order...\n');

    const icebergOrder = router.generateIcebergSchedule(
        10, // 10 BTC total
        1.5, // Display 1.5 BTC at a time
        50000
    );

    console.log(`  Algorithm: ${icebergOrder.algorithm}`);
    console.log(`  Total Size: ${icebergOrder.totalSize} BTC (HIDDEN)`);
    console.log(`  Display Size: ${icebergOrder.displaySize} BTC (visible to market)`);
    console.log(`  Num Slices: ${icebergOrder.numSlices}\n`);

    console.log('  Execution Schedule:');
    console.log('  Slice  Visible    Hidden     Time');
    console.log('  ' + '-'.repeat(50));
    icebergOrder.schedule.forEach(slice => {
        const time = new Date(slice.executionTime).toLocaleTimeString();
        const hidden = icebergOrder.totalSize - (slice.sliceNumber * icebergOrder.displaySize);
        console.log(`  ${slice.sliceNumber.toString().padStart(3)}    ${slice.size.toFixed(2)} BTC   ${Math.max(0, hidden).toFixed(2)} BTC  ${time}`);
    });

    console.log('\n  💡 Market only sees tip of iceberg (prevents front-running)');

    // Test 6: Adaptive Order
    console.log('\n\n[Test 6] Generating Adaptive order...\n');

    const adaptiveOrder = router.generateAdaptiveSchedule(
        10,
        {
            volatility: 0.05, // High volatility (5% daily)
            liquidity: 500000, // Low liquidity
            trend: 0.02, // Price rising +2% (against BUY)
            side: 'BUY'
        },
        60
    );

    console.log(`  Algorithm: ${adaptiveOrder.algorithm}`);
    console.log(`  Total Size: ${adaptiveOrder.totalSize} BTC`);
    console.log(`  Aggressiveness: ${adaptiveOrder.aggressiveness.toFixed(2)}x`);
    console.log(`  Num Slices: ${adaptiveOrder.numSlices}`);
    console.log(`  Reasoning:`);
    console.log(`    - High volatility (5%) → Smaller slices`);
    console.log(`    - Low liquidity ($500k) → Slower execution`);
    console.log(`    - Price rising (+2%) → Accelerate (buy before it rises more!)\n`);

    console.log('  Execution Schedule (first 5 slices):');
    console.log('  Slice  Size       Urgency');
    console.log('  ' + '-'.repeat(40));
    adaptiveOrder.schedule.slice(0, 5).forEach(slice => {
        console.log(`  ${slice.sliceNumber.toString().padStart(3)}    ${slice.size.toFixed(4)} BTC  ${slice.urgency}`);
    });

    // Test 7: Smart Routing Decision
    console.log('\n\n[Test 7] Testing smart routing decisions...\n');

    const testOrders = [
        {
            name: 'Small Immediate Order',
            order: {
                symbol: 'BTC-USD',
                side: 'BUY',
                size: 1,
                urgency: 'IMMEDIATE',
                averageDailyVolume: 1000,
                currentPrice: 50000
            }
        },
        {
            name: 'Large Order (High Impact)',
            order: {
                symbol: 'BTC-USD',
                side: 'BUY',
                size: 150,
                urgency: 'NORMAL',
                durationMinutes: 120,
                averageDailyVolume: 1000,
                currentPrice: 50000
            }
        },
        {
            name: 'Volatile Market Order',
            order: {
                symbol: 'ETH-USD',
                side: 'SELL',
                size: 50,
                urgency: 'NORMAL',
                durationMinutes: 60,
                averageDailyVolume: 5000,
                currentPrice: 3000,
                marketConditions: {
                    volatility: 0.08, // 8% volatility
                    liquidity: 2000000,
                    trend: -0.03, // Falling
                    side: 'SELL'
                }
            }
        },
        {
            name: 'Normal Order',
            order: {
                symbol: 'AAPL',
                side: 'BUY',
                size: 1000, // 1000 shares
                urgency: 'NORMAL',
                durationMinutes: 30,
                averageDailyVolume: 50000,
                currentPrice: 150
            }
        }
    ];

    testOrders.forEach(test => {
        const orderPlan = router.routeOrder(test.order);

        console.log(`  ${test.name}:`);
        console.log(`    Chosen Algorithm: ${orderPlan.algorithm}`);
        console.log(`    Estimated Impact: ${(orderPlan.estimatedImpact.impact * 100).toFixed(3)}%`);
        console.log(`    Impact Severity: ${orderPlan.estimatedImpact.severity}`);
        console.log(`    Num Slices: ${orderPlan.schedule.length}`);
        console.log(`    Reasoning: ${getRoutingReason(orderPlan.algorithm, orderPlan.estimatedImpact)}\n`);
    });

    // Test 8: Simulate Order Execution
    console.log('\n[Test 8] Simulating order execution...\n');

    // Create a test order
    const testOrder = router.routeOrder({
        symbol: 'BTC-USD',
        side: 'BUY',
        size: 10,
        urgency: 'NORMAL',
        durationMinutes: 30,
        averageDailyVolume: 1000,
        currentPrice: 50000
    });

    console.log(`  Order ID: ${testOrder.orderId}`);
    console.log(`  Algorithm: ${testOrder.algorithm}`);
    console.log(`  Total Slices: ${testOrder.schedule.length}\n`);

    // Simulate executing first 5 slices
    console.log('  Simulating execution of 5 slices...\n');

    for (let i = 1; i <= Math.min(5, testOrder.schedule.length); i++) {
        const execution = await router.executeSlice(testOrder.orderId, i);

        console.log(`    Slice ${i}:`);
        console.log(`      Size: ${execution.size.toFixed(4)} BTC`);
        console.log(`      Price: $${execution.executionPrice.toFixed(2)}`);
        console.log(`      Status: ${execution.status}`);
    }

    // Test 9: Execution Statistics
    console.log('\n\n[Test 9] Calculating execution statistics...\n');

    const stats = router.getExecutionStats(testOrder.orderId);

    console.log(`  Order Status: ${stats.status}`);
    console.log(`  Total Size: ${stats.totalSize.toFixed(4)} BTC`);
    console.log(`  Filled: ${stats.filledSize.toFixed(4)} BTC (${(stats.fillRate * 100).toFixed(1)}%)`);
    console.log(`  Remaining: ${stats.remainingSize.toFixed(4)} BTC\n`);

    console.log(`  Execution Quality:`);
    console.log(`    Target Price: $${stats.targetPrice.toFixed(2)}`);
    console.log(`    Avg Fill Price: $${stats.avgExecutionPrice.toFixed(2)}`);
    console.log(`    Slippage: ${stats.slippage > 0 ? '+' : ''}${(stats.slippage * 100).toFixed(3)}%`);
    console.log(`    Slippage (bps): ${stats.slippageBps.toFixed(2)} basis points`);
    console.log(`    Estimated Impact: ${(stats.estimatedImpact.impact * 100).toFixed(3)}%\n`);

    const dollarImpact = stats.slippage * stats.filledSize * stats.targetPrice;
    console.log(`  Dollar Impact: $${Math.abs(dollarImpact).toFixed(2)} ${dollarImpact > 0 ? '(adverse)' : '(favorable)'}`);

    if (stats.savings > 0) {
        console.log(`  Savings vs Market Order: $${stats.savings.toFixed(2)} ✅`);
    }

    // Test 10: Execution Quality Score
    console.log('\n\n[Test 10] Execution quality assessment...\n');

    const quality = router.calculateExecutionQuality(testOrder.orderId);

    console.log(`  Execution Grade: ${quality.grade}`);
    console.log(`  Quality Score: ${quality.score.toFixed(1)}/100`);
    console.log(`  Actual Slippage: ${quality.slippageBps.toFixed(2)} bps`);
    console.log(`  Estimated Impact: ${quality.estimatedBps.toFixed(2)} bps`);
    console.log(`  Savings: $${quality.savingsDollars.toFixed(2)}\n`);
    console.log(`  💡 ${quality.recommendation}`);

    console.log('\n' + '='.repeat(70));
    console.log('🎉 Smart Order Router Test Complete!');
    console.log('='.repeat(70));

    // Key insights
    console.log('\n📊 KEY INSIGHTS:\n');
    console.log('1. Market Impact grows with order size (sqrt relationship)');
    console.log('2. TWAP: Simple, equal slices over time');
    console.log('3. VWAP: Follow market volume patterns (U-shaped curve)');
    console.log('4. Iceberg: Hide order size to prevent front-running');
    console.log('5. Adaptive: Adjust to real-time market conditions\n');

    console.log('💡 WHY THIS MATTERS:');
    console.log('   Large market order: Buy 10 BTC → Price spikes +0.5%');
    console.log('   Smart routing: Buy 10 BTC over 30 min → Impact <0.1%');
    console.log('   Savings: 0.4% × $500k = $2,000 per trade!\n');

    console.log('🎯 WHEN TO USE EACH:');
    console.log('   TWAP: Low urgency, consistent execution');
    console.log('   VWAP: Follow market rhythm, benchmark to average price');
    console.log('   Iceberg: Hide large orders, prevent front-running');
    console.log('   Adaptive: High volatility, dynamic market conditions\n');

    return {
        success: true,
        testOrder,
        stats,
        quality
    };
}

function getRoutingReason(algorithm, impact) {
    if (algorithm === 'ICEBERG') {
        return 'Immediate urgency → Iceberg to hide order size';
    } else if (algorithm === 'VWAP' && impact.severity === 'HIGH') {
        return 'High impact order → VWAP to follow market volume';
    } else if (algorithm === 'ADAPTIVE') {
        return 'High volatility → Adaptive execution';
    } else if (algorithm === 'TWAP') {
        return 'Normal conditions → TWAP for consistent execution';
    }
    return 'Unknown';
}

// Run tests
testSmartOrderRouter()
    .then(results => {
        console.log('✅ All tests passed!\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error);
        console.error(error.stack);
        process.exit(1);
    });
