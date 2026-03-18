/**
 * Test Brain System + Transmitter Learning
 * Tests actual query processing and verifies neural routing
 */

const { SomaBrain } = require('./server/somaBrain.cjs');

async function testBrainSystem() {
  console.log('🧠 Testing SOMA Brain System\n');
  
  // Initialize
  console.log('1. Initializing SomaBrain...');
  const brain = new SomaBrain();
  
  try {
    await brain.initialize();
    console.log('✓ Brain initialized\n');
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    return;
  }
  
  // Test queries
  const testQueries = [
    { query: 'What is 2+2?', expectedMode: 'fast' },
    { query: 'Explain quantum entanglement in detail', expectedMode: 'deep' },
    { query: 'Write a creative story about AI', expectedMode: 'creative' },
    { query: 'What are the pros and cons of nuclear energy?', expectedMode: 'consensus' }
  ];
  
  console.log('2. Testing Query Processing:\n');
  
  for (const test of testQueries) {
    console.log(`Query: "${test.query}"`);
    console.log(`Expected mode: ${test.expectedMode}\n`);
    
    try {
      const result = await brain.processQuery(test.query);
      
      console.log(`✓ Response received (${result.meta.latency_ms}ms)`);
      console.log(`  Brains used: ${result.meta.brainsUsed?.join(', ') || 'unknown'}`);
      console.log(`  Confidence: ${(result.meta.confidence * 100).toFixed(1)}%`);
      console.log(`  Response preview: ${result.text.substring(0, 100)}...`);
      console.log(`  Transmitter routings: ${result.meta.transmitterStats?.totalRoutings || 0}\n`);
      
    } catch (error) {
      console.error(`❌ Query failed: ${error.message}\n`);
    }
    
    // Wait between queries
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Check transmitter learning
  console.log('\n3. Verifying Transmitter Learning:\n');
  
  if (brain.conductor && brain.conductor.transmitters) {
    const transmitterStats = brain.conductor.transmitters.metrics;
    const conductorMetrics = brain.conductor.metrics;
    
    console.log('Transmitter Stats:');
    console.log(`  Total adds: ${transmitterStats.totalAdds}`);
    console.log(`  Total searches: ${transmitterStats.totalSearches}`);
    console.log(`  Avg route time: ${transmitterStats.avgRouteTime.toFixed(2)}ms`);
    console.log(`  Active transmitters: ${brain.conductor.transmitters.tns.size}`);
    
    console.log('\nConductor Metrics:');
    console.log(`  Total reasonings: ${conductorMetrics.totalReasonings}`);
    console.log(`  Consensus count: ${conductorMetrics.consensusCount}`);
    console.log(`  Transmitter routings: ${conductorMetrics.transmitterRoutings}`);
    console.log(`  Success rate: ${(conductorMetrics.successRate * 100).toFixed(1)}%`);
    console.log(`  Avg latency: ${conductorMetrics.avgLatency.toFixed(0)}ms`);
    
    console.log('\nBrain Failures:');
    console.log(`  PROMETHEUS: ${conductorMetrics.brainFailures.PROMETHEUS}`);
    console.log(`  LOGOS: ${conductorMetrics.brainFailures.LOGOS}`);
    console.log(`  AURORA: ${conductorMetrics.brainFailures.AURORA}`);
    
    console.log('\nInteraction History:');
    console.log(`  Stored interactions: ${brain.conductor.interactionHistory.length}`);
    
    // Show last interaction
    if (brain.conductor.interactionHistory.length > 0) {
      const last = brain.conductor.interactionHistory[brain.conductor.interactionHistory.length - 1];
      console.log(`  Last query: "${last.query.substring(0, 50)}..."`);
      console.log(`  Brains used: ${last.brains.join(', ')}`);
      console.log(`  Confidence: ${(last.confidence * 100).toFixed(1)}%`);
    }
    
  } else {
    console.log('❌ BrainConductor not available');
  }
  
  console.log('\n✅ Test Complete!');
}

// Run tests
testBrainSystem().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
