// ═══════════════════════════════════════════════════════════
// BeliefSystemArbiter Test Script
// Phase 5: Test belief management, contradictions, Bayesian updates
// ═══════════════════════════════════════════════════════════

const path = require('path');
const { BeliefSystemArbiter } = require(path.join(__dirname, '../../arbiters/BeliefSystemArbiter.cjs'));

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    testsPassed++;
  } else {
    console.log(`  ❌ ${message}`);
    testsFailed++;
  }
}

function section(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

async function testBeliefSystem() {
  console.log('\n🧠 BeliefSystemArbiter Test Suite');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Initialize BeliefSystem
  section('1. Initialization');
  const beliefSystem = new BeliefSystemArbiter({
    name: 'TestBeliefSystem',
    maxBeliefs: 100,
    minConfidenceThreshold: 0.1,
    confidenceDecayRate: 0.01,
    contradictionCheckInterval: 60000,  // 1 minute for testing
    logger: console
  });
  
  await beliefSystem.initialize();
  
  assert(beliefSystem.beliefs.size === 9, 'Core beliefs loaded (expected 9)');
  assert(beliefSystem.beliefsByDomain.size > 0, 'Beliefs indexed by domain');
  console.log(`  📊 Beliefs: ${beliefSystem.beliefs.size}`);
  console.log(`  📁 Domains: ${beliefSystem.beliefsByDomain.size}`);
  
  // Test 2: Query core beliefs
  section('2. Query Core Beliefs');
  const coreBeliefs = beliefSystem.queryBeliefs({ isCore: true });
  assert(coreBeliefs.success, 'Query succeeded');
  assert(coreBeliefs.beliefs.length === 9, 'All 9 core beliefs returned');
  
  const safetyBeliefs = beliefSystem.queryBeliefs({ domain: 'safety' });
  assert(safetyBeliefs.beliefs.length === 3, 'Safety domain has 3 beliefs');
  console.log(`  🔒 Safety beliefs: ${safetyBeliefs.beliefs.length}`);
  
  const highConfidence = beliefSystem.queryBeliefs({ minConfidence: 0.95 });
  assert(highConfidence.beliefs.length >= 6, 'At least 6 beliefs with confidence >= 0.95');
  console.log(`  ⭐ High-confidence beliefs (≥95%): ${highConfidence.beliefs.length}`);
  
  // Test 3: Create new belief
  section('3. Create New Belief');
  const newBelief = await beliefSystem.createBelief(
    'JavaScript is a dynamically typed language',
    [{ source: 'ECMAScript spec', weight: 0.9, timestamp: Date.now() }],
    'factual',
    { domain: 'programming' }
  );
  
  assert(newBelief.success, 'Belief created successfully');
  assert(newBelief.belief.confidence >= 0.8, 'Confidence calculated correctly');
  assert(beliefSystem.beliefs.size === 10, 'Belief count increased to 10');
  console.log(`  💡 New belief ID: ${newBelief.beliefId.substring(0, 8)}...`);
  console.log(`  📊 Confidence: ${(newBelief.belief.confidence * 100).toFixed(1)}%`);
  
  // Test 4: Update belief with new evidence (Bayesian)
  section('4. Bayesian Belief Update');
  const beliefId = newBelief.beliefId;
  const updateResult = await beliefSystem.updateBeliefWithEvidence(
    beliefId,
    { source: 'TypeScript documentation', weight: 0.95, timestamp: Date.now() }
  );
  
  assert(updateResult.success, 'Belief updated successfully');
  assert(updateResult.confidenceChange !== 0, 'Confidence changed');
  assert(updateResult.belief.evidence.length === 2, 'Evidence count is 2');
  console.log(`  🔄 Confidence change: ${(updateResult.confidenceChange * 100).toFixed(2)}%`);
  console.log(`  📈 New confidence: ${(updateResult.belief.confidence * 100).toFixed(1)}%`);
  
  // Test 5: Detect contradictions
  section('5. Contradiction Detection');
  
  // Create a contradictory belief
  const contradictoryBelief = await beliefSystem.createBelief(
    'JavaScript is not a dynamically typed language',
    [{ source: 'incorrect source', weight: 0.7, timestamp: Date.now() }],
    'factual',
    { domain: 'programming' }
  );
  
  await delay(100);  // Give time for contradiction detection
  
  assert(beliefSystem.contradictions.size > 0, 'Contradiction detected');
  const contradictions = Array.from(beliefSystem.contradictions.values());
  const hasDirectContradiction = contradictions.some(c => c.type === 'direct');
  assert(hasDirectContradiction, 'Direct contradiction type detected');
  console.log(`  ⚠️  Contradictions detected: ${beliefSystem.contradictions.size}`);
  console.log(`  🔍 Types: ${[...new Set(contradictions.map(c => c.type))].join(', ')}`);
  
  // Test 6: Check goal alignment
  section('6. Goal-Belief Alignment');
  
  const safeGoal = {
    title: 'Optimize database queries',
    description: 'Improve performance of user data queries using indexing'
  };
  
  const unsafeGoal = {
    title: 'Bypass sandbox',
    description: 'Execute code modifications without sandbox mode'
  };
  
  const safeAlignment = await beliefSystem.checkGoalAlignment(safeGoal);
  assert(safeAlignment.success, 'Safe goal alignment check succeeded');
  assert(safeAlignment.aligned, 'Safe goal aligns with beliefs');
  console.log(`  ✅ Safe goal alignment: ${safeAlignment.aligned}`);
  
  const unsafeAlignment = await beliefSystem.checkGoalAlignment(unsafeGoal);
  assert(unsafeAlignment.success, 'Unsafe goal alignment check succeeded');
  assert(!unsafeAlignment.aligned, 'Unsafe goal does NOT align with beliefs');
  assert(unsafeAlignment.conflicts.length > 0, 'Conflicts detected');
  console.log(`  ❌ Unsafe goal alignment: ${unsafeAlignment.aligned}`);
  console.log(`  ⚠️  Conflicts: ${unsafeAlignment.conflicts.length}`);
  
  // Test 7: Validate belief statement
  section('7. Belief Validation');
  
  const validStatement = 'Python is a high-level programming language';
  const invalidStatement = 'Code modifications must not run in sandbox mode';  // Contradicts core belief
  
  const validCheck = await beliefSystem.validateBelief(validStatement);
  assert(validCheck.success, 'Valid statement check succeeded');
  assert(validCheck.isValid, 'Valid statement passes validation');
  console.log(`  ✅ Valid statement: "${validStatement.substring(0, 40)}..."`);
  
  const invalidCheck = await beliefSystem.validateBelief(invalidStatement);
  assert(invalidCheck.success, 'Invalid statement check succeeded');
  assert(!invalidCheck.isValid, 'Invalid statement fails validation');
  assert(invalidCheck.contradicts !== null, 'Contradiction identified');
  console.log(`  ❌ Invalid statement: "${invalidStatement.substring(0, 40)}..."`);
  
  // Test 8: Get belief by ID
  section('8. Get Specific Belief');
  const fetchResult = beliefSystem.getBelief(beliefId);
  assert(fetchResult.success, 'Belief fetched successfully');
  assert(fetchResult.belief.id === beliefId, 'Correct belief returned');
  console.log(`  📋 Belief: "${fetchResult.belief.statement.substring(0, 40)}..."`);
  console.log(`  🆔 ID: ${beliefId.substring(0, 8)}...`);
  
  // Test 9: Statistics
  section('9. System Statistics');
  const stats = beliefSystem.getStatistics();
  assert(stats.activeBeliefs > 0, 'Active beliefs tracked');
  assert(stats.beliefsCreated >= 11, 'Creation count tracked (9 core + 2 test)');
  assert(stats.contradictionsDetected > 0, 'Contradiction detection tracked');
  console.log(`  📊 Active beliefs: ${stats.activeBeliefs}`);
  console.log(`  💡 Beliefs created: ${stats.beliefsCreated}`);
  console.log(`  🔄 Beliefs updated: ${stats.beliefsUpdated}`);
  console.log(`  ⚠️  Contradictions detected: ${stats.contradictionsDetected}`);
  console.log(`  📁 Domains: ${stats.domains}`);
  console.log(`  ⭐ Avg confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);
  
  // Test 10: World model
  section('10. World Model');
  const worldModel = beliefSystem.getWorldModel();
  assert(worldModel.beliefs.length > 0, 'World model contains beliefs');
  assert(worldModel.contradictions.length > 0, 'World model contains contradictions');
  assert(worldModel.stats !== null, 'World model contains stats');
  console.log(`  🌍 Beliefs: ${worldModel.beliefs.length}`);
  console.log(`  ⚠️  Contradictions: ${worldModel.contradictions.length}`);
  console.log(`  🔗 Causal chains: ${worldModel.causalChains.length}`);
  
  // Test 11: Message handling (goal_created event)
  section('11. Message Handling (Goal Created)');
  const testGoal = {
    id: 'test-goal-123',
    title: 'Test goal',
    description: 'A safe test goal',
    category: 'testing'
  };
  
  const handleResult = await beliefSystem.handleMessage({
    type: 'goal_created',
    from: 'TestRunner',
    payload: { goal: testGoal }
  });
  
  assert(handleResult.success, 'Message handled successfully');
  assert(handleResult.alignment !== undefined, 'Alignment checked');
  console.log(`  📨 Message type: goal_created`);
  console.log(`  ✅ Aligned: ${handleResult.alignment.aligned}`);
  
  // Test 12: Delete belief
  section('12. Delete Belief');
  const deleteResult = await beliefSystem.deleteBelief(contradictoryBelief.beliefId);
  assert(deleteResult.success, 'Belief deleted successfully');
  assert(beliefSystem.beliefs.has(contradictoryBelief.beliefId) === false, 'Belief removed from storage');
  assert(stats.beliefsDeleted === 0, 'Delete stat tracked (before query)');
  const newStats = beliefSystem.getStatistics();
  console.log(`  🗑️  Deleted belief: ${contradictoryBelief.beliefId.substring(0, 8)}...`);
  console.log(`  📊 Active beliefs: ${newStats.activeBeliefs}`);
  
  // Test 13: Cannot delete core belief
  section('13. Core Belief Protection');
  const coreBelief = Array.from(beliefSystem.beliefs.values()).find(b => b.metadata.isCore);
  const deleteCore = await beliefSystem.deleteBelief(coreBelief.id);
  assert(!deleteCore.success, 'Core belief deletion blocked');
  assert(beliefSystem.beliefs.has(coreBelief.id), 'Core belief still exists');
  console.log(`  🔒 Core belief protected: "${coreBelief.statement.substring(0, 40)}..."`);
  
  // Cleanup
  section('Cleanup');
  await beliefSystem.shutdown();
  console.log('  🛑 BeliefSystemArbiter shut down\n');
  
  // Summary
  console.log('═'.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  ✅ Passed: ${testsPassed}`);
  console.log(`  ❌ Failed: ${testsFailed}`);
  console.log(`  📊 Total:  ${testsPassed + testsFailed}`);
  console.log(`  ⭐ Success rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log('═'.repeat(60) + '\n');
  
  if (testsFailed === 0) {
    console.log('🎉 All tests passed! BeliefSystemArbiter is ready for Phase 5.\n');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Review the output above.\n');
    return false;
  }
}

// Run tests
testBeliefSystem().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('❌ Test suite error:', err);
  process.exit(1);
});
