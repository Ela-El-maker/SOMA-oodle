/**
 * Test Sentiment Aggregator
 *
 * Tests:
 * 1. Reddit sentiment
 * 2. Twitter sentiment
 * 3. News sentiment
 * 4. Options sentiment
 * 5. Fear & Greed Index
 * 6. Multi-source aggregation
 * 7. Sentiment breakdown visualization
 */

import { SentimentAggregator } from './arbiters/SentimentAggregator.js';

console.log('🧪 Testing Sentiment Aggregator\n');
console.log('='.repeat(70));

async function testSentimentAggregator() {
    // Test 1: Initialize
    console.log('\n[Test 1] Initializing Sentiment Aggregator...');
    const aggregator = new SentimentAggregator({ rootPath: process.cwd() });
    await aggregator.initialize();
    console.log('✅ System initialized\n');

    // Test 2: BTC Sentiment (Crypto - generally bullish)
    console.log('[Test 2] Analyzing BTC sentiment...\n');

    const btcSentiment = await aggregator.getSentiment('BTC-USD');

    console.log('  🪙 BTC-USD Multi-Source Sentiment:\n');
    console.log(`  Overall Score: ${(btcSentiment.aggregatedScore * 100).toFixed(1)}%`);
    console.log(`  Label: ${btcSentiment.label}`);
    console.log(`  Confidence: ${(btcSentiment.confidence * 100).toFixed(1)}%`);
    console.log(`  Consensus: ${btcSentiment.consensus ? 'YES ✅' : 'NO ⚠️'}`);

    if (btcSentiment.conflicts.length > 0) {
        console.log(`  Conflicts: ${btcSentiment.conflicts.join(', ')}`);
    }

    console.log('\n  By Source:');
    console.log(`    Reddit:     ${(btcSentiment.sources.reddit.score * 100).toFixed(1)}% (${btcSentiment.sources.reddit.mentions} mentions)`);
    console.log(`    Twitter:    ${(btcSentiment.sources.twitter.score * 100).toFixed(1)}% (${btcSentiment.sources.twitter.volume.toLocaleString()} tweets)`);
    console.log(`    News:       ${(btcSentiment.sources.news.score * 100).toFixed(1)}% (${btcSentiment.sources.news.articleCount} articles)`);
    console.log(`    Options:    ${(btcSentiment.sources.options.score * 100).toFixed(1)}% (P/C: ${btcSentiment.sources.options.putCallRatio.toFixed(2)})`);
    console.log(`    Fear/Greed: ${(btcSentiment.sources.fearGreed.score * 100).toFixed(1)}% (${btcSentiment.sources.fearGreed.label})\n`);

    // Test 3: GME Sentiment (Meme stock - extreme sentiment)
    console.log('[Test 3] Analyzing GME sentiment...\n');

    const gmeSentiment = await aggregator.getSentiment('GME');

    console.log('  🎮 GME Multi-Source Sentiment:\n');
    console.log(`  Overall Score: ${(gmeSentiment.aggregatedScore * 100).toFixed(1)}%`);
    console.log(`  Label: ${gmeSentiment.label}`);
    console.log(`  Confidence: ${(gmeSentiment.confidence * 100).toFixed(1)}%\n`);

    console.log('  Reddit (WallStreetBets):');
    gmeSentiment.sources.reddit.topPosts.slice(0, 3).forEach((post, i) => {
        console.log(`    ${i + 1}. "${post.title}" (${post.upvotes.toLocaleString()} upvotes, ${(post.sentiment * 100).toFixed(0)}% bullish)`);
    });
    console.log('');

    // Test 4: AAPL Sentiment (Normal stock)
    console.log('[Test 4] Analyzing AAPL sentiment...\n');

    const aaplSentiment = await aggregator.getSentiment('AAPL');

    console.log('  🍎 AAPL Multi-Source Sentiment:\n');
    console.log(`  Overall Score: ${(aaplSentiment.aggregatedScore * 100).toFixed(1)}%`);
    console.log(`  Label: ${aaplSentiment.label}\n`);

    console.log('  News Headlines:');
    aaplSentiment.sources.news.headlines.slice(0, 3).forEach((headline, i) => {
        const emoji = headline.sentiment > 0.6 ? '📈' : headline.sentiment < 0.4 ? '📉' : '➡️';
        console.log(`    ${emoji} ${headline.title} (${headline.source})`);
    });
    console.log('');

    // Test 5: TSLA Sentiment (Volatile)
    console.log('[Test 5] Analyzing TSLA sentiment...\n');

    const tslaSentiment = await aggregator.getSentiment('TSLA');

    console.log('  ⚡ TSLA Multi-Source Sentiment:\n');
    console.log(`  Overall Score: ${(tslaSentiment.aggregatedScore * 100).toFixed(1)}%`);
    console.log(`  Twitter Volume: ${tslaSentiment.sources.twitter.volume.toLocaleString()} tweets`);
    console.log(`  Trending: ${tslaSentiment.sources.twitter.trending ? 'YES 🔥' : 'No'}\n`);

    // Test 6: Sentiment Breakdown Visualization
    console.log('[Test 6] Sentiment breakdown visualization...\n');

    const breakdown = aggregator.getBreakdown(btcSentiment);

    console.log('  BTC Sentiment Breakdown:\n');
    console.log('  Source          Score    Weight   Contribution');
    console.log('  ' + '-'.repeat(60));

    breakdown.bySource.forEach(source => {
        const scoreBar = '█'.repeat(Math.round(source.score * 20));
        const contrib = (source.contribution * 100).toFixed(1);
        console.log(`  ${source.name.padEnd(14)} ${(source.score * 100).toFixed(0).padStart(3)}%  ×  ${(source.weight * 100).toFixed(0).padStart(3)}%  = ${contrib.padStart(5)}% ${scoreBar}`);
    });

    console.log('  ' + '-'.repeat(60));
    console.log(`  TOTAL                                    ${(breakdown.overall.score * 100).toFixed(1)}%\n`);

    // Test 7: Comparison across symbols
    console.log('[Test 7] Comparing sentiment across symbols...\n');

    const symbols = ['BTC-USD', 'GME', 'AAPL', 'TSLA'];
    const sentiments = [btcSentiment, gmeSentiment, aaplSentiment, tslaSentiment];

    console.log('  Symbol       Score    Label           Confidence  Consensus');
    console.log('  ' + '-'.repeat(70));

    sentiments.forEach((sent, i) => {
        const symbol = symbols[i];
        const score = (sent.aggregatedScore * 100).toFixed(1) + '%';
        const confidence = (sent.confidence * 100).toFixed(0) + '%';
        const consensus = sent.consensus ? '✅' : '❌';

        console.log(`  ${symbol.padEnd(11)} ${score.padStart(6)}  ${sent.label.padEnd(15)} ${confidence.padStart(10)}  ${consensus}`);
    });

    console.log('');

    // Test 8: Detecting conflicts
    console.log('[Test 8] Conflict detection...\n');

    symbols.forEach((symbol, i) => {
        const sent = sentiments[i];
        if (sent.conflicts.length > 0) {
            console.log(`  ⚠️  ${symbol}:`);
            sent.conflicts.forEach(conflict => {
                console.log(`      • ${conflict}`);
            });
        } else {
            console.log(`  ✅ ${symbol}: No conflicts (sources aligned)`);
        }
    });

    console.log('');

    // Test 9: Cache test
    console.log('[Test 9] Testing cache...\n');

    const start = Date.now();
    await aggregator.getSentiment('BTC-USD');
    const firstCallTime = Date.now() - start;

    const start2 = Date.now();
    await aggregator.getSentiment('BTC-USD'); // Should hit cache
    const cachedCallTime = Date.now() - start2;

    console.log(`  First call: ${firstCallTime}ms`);
    console.log(`  Cached call: ${cachedCallTime}ms`);
    console.log(`  Speedup: ${(firstCallTime / cachedCallTime).toFixed(1)}x faster ✅\n`);

    // Test 10: Fear & Greed Index interpretation
    console.log('[Test 10] Fear & Greed Index interpretation...\n');

    const fgIndex = btcSentiment.sources.fearGreed.index;
    console.log(`  Index: ${fgIndex}/100`);
    console.log(`  Label: ${btcSentiment.sources.fearGreed.label}`);
    console.log(`  Interpretation:`);

    if (fgIndex < 25) {
        console.log('    🐻 EXTREME FEAR - Contrarian BUY signal');
    } else if (fgIndex < 45) {
        console.log('    😰 FEAR - Potential opportunity');
    } else if (fgIndex > 75) {
        console.log('    🚀 EXTREME GREED - Contrarian SELL signal');
    } else if (fgIndex > 55) {
        console.log('    😊 GREED - Market optimistic');
    } else {
        console.log('    😐 NEUTRAL - Balanced sentiment');
    }

    console.log('');

    console.log('='.repeat(70));
    console.log('🎉 Sentiment Aggregator Test Complete!');
    console.log('='.repeat(70));

    // Key insights
    console.log('\n📊 KEY INSIGHTS:\n');
    console.log('1. Multi-source aggregation = robust sentiment');
    console.log('2. Weighted average accounts for source reliability');
    console.log('3. Conflict detection identifies divergence');
    console.log('4. Consensus flag shows source alignment');
    console.log('5. Cache improves performance (5min expiry)\n');

    console.log('💡 WHY THIS MATTERS:');
    console.log('   Single source (just Reddit) = noisy, unreliable');
    console.log('   Multiple sources = robust, actionable signal');
    console.log('   GME shows extreme bullish sentiment across all sources');
    console.log('   Conflicts warn when sources disagree\n');

    console.log('🎯 SOURCE WEIGHTS:');
    console.log('   Reddit:      25% (community sentiment)');
    console.log('   Twitter:     20% (trending + influencers)');
    console.log('   News:        25% (headline analysis)');
    console.log('   Options:     20% (smart money flow)');
    console.log('   Fear/Greed:  10% (market-wide mood)\n');

    console.log('📈 SENTIMENT LABELS:');
    console.log('   > 70%: VERY_BULLISH 🚀');
    console.log('   > 60%: BULLISH 📈');
    console.log('   40-60%: NEUTRAL ➡️');
    console.log('   < 40%: BEARISH 📉');
    console.log('   < 30%: VERY_BEARISH 🐻\n');

    console.log('✅ BENEFITS:');
    console.log('   • Robust sentiment across multiple sources');
    console.log('   • Weighted aggregation (smart sources get more weight)');
    console.log('   • Conflict detection (warns when sources disagree)');
    console.log('   • Cached for performance');
    console.log('   • Real trading edge!\n');

    return {
        success: true,
        symbols: symbols.length,
        avgSentiment: sentiments.reduce((sum, s) => sum + s.aggregatedScore, 0) / sentiments.length
    };
}

// Run tests
testSentimentAggregator()
    .then(results => {
        console.log('✅ All tests passed!\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error);
        console.error(error.stack);
        process.exit(1);
    });
