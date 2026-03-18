// Test DreamArbiter functionality
const DreamArbiter = require('./server/DreamArbiter.cjs');

console.log('🌙 Testing DreamArbiter\n');

// Create mock components
const mockMnemonicArbiter = {
  async recall(query, opts) {
    // Simulate returning memories
    return [
      { id: '1', content: 'Testing quantum computing algorithms for optimization', timestamp: new Date().toISOString() },
      { id: '2', content: 'Neural networks and deep learning architectures', timestamp: new Date().toISOString() },
      { id: '3', content: 'Machine learning models for pattern recognition', timestamp: new Date().toISOString() },
      { id: '4', content: 'Quantum entanglement in distributed systems', timestamp: new Date().toISOString() },
      { id: '5', content: 'Deep learning optimization techniques', timestamp: new Date().toISOString() }
    ];
  },
  
  async store(data) {
    console.log(`  [Mock] Stored memory: ${data.tier || 'unknown'} tier`);
    return { success: true, id: Math.random().toString(36).substr(2, 9) };
  },
  
  async getStats() {
    return {
      hot: { count: 50 },
      warm: { count: 200 },
      cold: { count: 500 }
    };
  }
};

const mockBrainConductor = {
  async orchestrate({ query, mode }) {
    // Simulate TriBrain response
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing
    
    return {
      success: true,
      response: `Analysis of pattern: This shows increasing interest in quantum computing and machine learning convergence. Key insight: Users are exploring hybrid quantum-classical algorithms.`,
      confidence: 0.85
    };
  }
};

// Create DreamArbiter with mocks
const dreamArbiter = new DreamArbiter({
  name: 'TestDream',
  mnemonicArbiter: mockMnemonicArbiter,
  brainConductor: mockBrainConductor,
  // Fast cycles for testing
  remCycle: 5000,        // 5 sec
  nremCycle: 10000,      // 10 sec
  deepSleepCycle: 20000, // 20 sec
  idleThreshold: 3000,   // 3 sec
  enableREM: true,
  enableNREM: true,
  enableDeepSleep: false, // Skip deep sleep for quick test
  enableIdleDreams: true,
  verbose: true
});

console.log('1. Testing manual REM cycle (pattern discovery)...\n');

dreamArbiter._scheduleREM().then(() => {
  console.log('\n✅ REM cycle completed!\n');
  
  console.log('2. Testing manual NREM cycle (memory consolidation)...\n');
  
  return dreamArbiter._scheduleNREM();
}).then(() => {
  console.log('\n✅ NREM cycle completed!\n');
  
  console.log('3. Checking dream journal...\n');
  const journal = dreamArbiter.getDreamJournal(5);
  console.log(`Dream journal entries: ${journal.length}`);
  
  if (journal.length > 0) {
    console.log('\nLatest dream insight:');
    console.log(`  Pattern: ${journal[0].pattern.keyword}`);
    console.log(`  Frequency: ${journal[0].pattern.frequency}`);
    console.log(`  Insight: ${journal[0].insight.substring(0, 100)}...`);
    console.log(`  Confidence: ${(journal[0].confidence * 100).toFixed(1)}%`);
  }
  
  console.log('\n4. Checking status...\n');
  const status = dreamArbiter.getStatus();
  console.log(`State: ${status.state.isDreaming ? 'Dreaming' : 'Awake'}`);
  console.log(`Total dream cycles: ${status.metrics.totalDreamCycles}`);
  console.log(`REM cycles: ${status.metrics.remCycles}`);
  console.log(`NREM cycles: ${status.metrics.nremCycles}`);
  console.log(`Patterns discovered: ${status.metrics.patternsDiscovered}`);
  console.log(`Insights synthesized: ${status.metrics.insightsSynthesized}`);
  console.log(`Memories consolidated: ${status.metrics.memoriesConsolidated}`);
  
  console.log('\n5. Testing automatic dreaming (idle detection)...\n');
  console.log('Starting DreamArbiter with automatic cycles...');
  dreamArbiter.start();
  
  // Simulate being idle
  console.log('System idle - waiting for opportunistic dream...');
  
  setTimeout(() => {
    console.log('\n6. Recording activity (should prevent next dream)...');
    dreamArbiter.recordActivity();
    
    setTimeout(() => {
      console.log('\n✅ Test complete!');
      console.log('\nFinal metrics:');
      const final = dreamArbiter.getStatus();
      console.log(JSON.stringify(final.metrics, null, 2));
      
      dreamArbiter.stop();
      console.log('\nDreamArbiter stopped.');
      process.exit(0);
    }, 8000);
  }, 5000);
  
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
