// Quick test - single query
const { SomaBrain } = require('./server/somaBrain.cjs');

async function test() {
  console.log('Quick test - single query\n');
  
  const brain = new SomaBrain();
  await brain.initialize();
  
  console.log('\nQuery: "What is 5 times 7?"\n');
  
  const result = await brain.processQuery('What is 5 times 7?', {}, 'fast');
  
  console.log('✅ Response:', result.text);
  console.log('Confidence:', ((result.meta?.confidence || 0) * 100).toFixed(1) + '%');
  console.log('Brains used:', result.meta?.brainsUsed?.join(', ') || 'unknown');
  console.log('Duration:', result.meta?.latency_ms + 'ms');
  
  process.exit(0);
}

test().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
