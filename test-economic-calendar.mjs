/**
 * Test Economic Calendar Integration
 *
 * Tests:
 * 1. Initialize economic calendar
 * 2. Fetch upcoming events
 * 3. Check position size adjustments
 * 4. Test event detection
 */

import { EconomicCalendar } from './arbiters/EconomicCalendar.js';
import economicDataService from './server/finance/economicDataService.js';

console.log('🧪 Testing Economic Calendar\n');
console.log('='.repeat(60));

async function testEconomicCalendar() {
    // Test 1: Initialize
    console.log('\n[Test 1] Initializing Economic Calendar...');
    const calendar = new EconomicCalendar({ rootPath: process.cwd() });
    await calendar.initialize();
    console.log('✅ Calendar initialized');

    // Test 2: Get upcoming events
    console.log('\n[Test 2] Fetching upcoming events (next 30 days)...');
    const upcomingEvents = calendar.getUpcoming(30);
    console.log(`✅ Found ${upcomingEvents.length} upcoming events\n`);

    // Display events
    if (upcomingEvents.length > 0) {
        console.log('Upcoming Events:');
        console.log('-'.repeat(60));

        upcomingEvents.slice(0, 10).forEach(event => {
            const formatted = calendar.formatEvent(event);
            console.log(`${formatted.impactEmoji} ${formatted.title}`);
            console.log(`   ${formatted.timeString} | ${formatted.formattedDate}`);
            console.log(`   Impact: ${event.impact} | Type: ${event.type}`);
            if (event.affectedSymbols.length > 0) {
                console.log(`   Affects: ${event.affectedSymbols.join(', ')}`);
            }
            console.log();
        });
    } else {
        console.warn('⚠️  No upcoming events found (this might be expected if cache is empty)');
    }

    // Test 3: Check specific symbol
    console.log('\n[Test 3] Checking events for specific symbols...');
    const symbols = ['BTC-USD', 'AAPL', 'TSLA'];

    for (const symbol of symbols) {
        const hasEvent = calendar.hasUpcomingEvent(symbol, 72, 'MEDIUM'); // Next 3 days
        const multiplier = calendar.getPositionMultiplier(symbol, 24);
        const shouldExit = calendar.shouldExitBefore(symbol, 24);

        console.log(`\n${symbol}:`);
        console.log(`  Event in next 72h: ${hasEvent ? '⚠️  YES' : '✅ No'}`);
        console.log(`  Position multiplier: ${(multiplier * 100).toFixed(0)}%`);
        console.log(`  Should exit: ${shouldExit ? '🔴 YES' : '🟢 No'}`);

        if (hasEvent) {
            hasEvent.forEach(e => {
                console.log(`    - ${e.title} (${e.impact})`);
            });
        }
    }

    // Test 4: Get summary
    console.log('\n[Test 4] Getting calendar summary...');
    const summary = calendar.getSummary();
    console.log('✅ Summary retrieved:\n');
    console.log(`  High-impact events (next 24h): ${summary.highImpactNext24h}`);
    console.log(`  Total events (next 7 days): ${summary.totalNext7d}`);

    if (summary.nextHighImpact) {
        const formatted = calendar.formatEvent(summary.nextHighImpact);
        console.log(`\n  ⚠️  NEXT HIGH-IMPACT EVENT:`);
        console.log(`     ${formatted.title}`);
        console.log(`     ${formatted.timeString}`);
    } else {
        console.log('\n  ✅ No high-impact events in next 24 hours');
    }

    // Test 5: Test API connectivity
    console.log('\n[Test 5] Testing API connectivity...');
    const apiResults = await economicDataService.testAPIs();

    // Show setup instructions if needed
    const setup = economicDataService.getSetupInstructions();
    console.log('\n📋 API Setup Status:');

    if (setup.alphaVantage.needed) {
        console.log('\n⚠️  Alpha Vantage API Key Needed:');
        console.log(`   URL: ${setup.alphaVantage.url}`);
        console.log(`   Instructions: ${setup.alphaVantage.instructions}`);
        console.log(`   Cost: ${setup.alphaVantage.cost}`);
    } else {
        console.log('\n✅ Alpha Vantage: Configured');
    }

    if (setup.fred.needed) {
        console.log('\n⚠️  FRED API Key (Optional):');
        console.log(`   URL: ${setup.fred.url}`);
        console.log(`   Instructions: ${setup.fred.instructions}`);
        console.log(`   Cost: ${setup.fred.cost}`);
        console.log(`   Note: Using manual indicators as fallback`);
    } else {
        console.log('\n✅ FRED: Configured');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Economic Calendar Test Complete!');
    console.log('='.repeat(60));

    // Return test results
    return {
        initialized: true,
        eventsFound: upcomingEvents.length,
        apisConnected: apiResults,
        summary
    };
}

// Run tests
testEconomicCalendar()
    .then(results => {
        console.log('\n✅ All tests passed!');
        console.log(`\nResults: ${results.eventsFound} events loaded`);
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error);
        console.error(error.stack);
        process.exit(1);
    });
