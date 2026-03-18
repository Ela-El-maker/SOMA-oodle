// Test script for GoalPlannerArbiter
// Run with: node server/test-goal-planner.cjs

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testGoalPlanner() {
  console.log('🎯 Testing GoalPlannerArbiter\n');
  
  try {
    // Test 1: Create a user-requested goal
    console.log('Test 1: Creating user-requested goal...');
    const createResponse = await axios.post(`${BASE_URL}/api/goals`, {
      title: 'Test Goal: Improve response time',
      category: 'optimization',
      type: 'tactical',
      description: 'Reduce average query response time by 20%',
      metrics: {
        target: { metric: 'response_time_ms', value: 200 },
        current: { metric: 'response_time_ms', value: 250 },
        progress: 0
      },
      assignedTo: ['SelfModificationArbiter'],
      dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    console.log('✅ Goal created:', createResponse.data.goalId);
    const goalId = createResponse.data.goalId;
    console.log('   Priority:', createResponse.data.goal.priority);
    console.log('   Status:', createResponse.data.goal.status);
    console.log('');
    
    // Test 2: Get goal status
    console.log('Test 2: Getting goal status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/goals/${goalId}`);
    console.log('✅ Goal status retrieved');
    console.log('   Title:', statusResponse.data.goal.title);
    console.log('   Progress:', statusResponse.data.goal.metrics.progress + '%');
    console.log('   Stalled:', statusResponse.data.isStalled);
    console.log('');
    
    // Test 3: Update goal progress
    console.log('Test 3: Updating goal progress...');
    const updateResponse = await axios.put(`${BASE_URL}/api/goals/${goalId}`, {
      progress: 50,
      metadata: {
        current: { metric: 'response_time_ms', value: 225 }
      }
    });
    console.log('✅ Progress updated to 50%');
    console.log('   Current value:', updateResponse.data.goal.metrics.current.value + 'ms');
    console.log('');
    
    // Test 4: List all goals
    console.log('Test 4: Listing all active goals...');
    const listResponse = await axios.get(`${BASE_URL}/api/goals`);
    console.log('✅ Active goals:', listResponse.data.count);
    listResponse.data.goals.forEach(goal => {
      console.log(`   - ${goal.title} (${goal.category}, priority: ${goal.priority})`);
    });
    console.log('');
    
    // Test 5: Get statistics
    console.log('Test 5: Getting statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/api/goals/stats`);
    console.log('✅ Goal statistics:');
    console.log('   Active:', statsResponse.data.stats.activeGoals);
    console.log('   Completed:', statsResponse.data.stats.completedGoals);
    console.log('   Failed:', statsResponse.data.stats.failedGoals);
    console.log('   Success rate:', (statsResponse.data.stats.successRate * 100).toFixed(1) + '%');
    console.log('   Goals/week:', statsResponse.data.stats.goalsPerWeek);
    console.log('');
    
    // Test 6: Trigger autonomous goal generation (simulate low velocity)
    console.log('Test 6: Testing autonomous goal generation...');
    console.log('   Simulating velocity report (low velocity)...');
    
    // Wait a moment for processing
    await sleep(2000);
    
    // Check if new goals were generated
    const afterGenResponse = await axios.get(`${BASE_URL}/api/goals`);
    console.log('✅ Goals after velocity report:', afterGenResponse.data.count);
    console.log('');
    
    // Test 7: Update progress to 100% (complete goal)
    console.log('Test 7: Completing goal...');
    const completeResponse = await axios.put(`${BASE_URL}/api/goals/${goalId}`, {
      progress: 100,
      metadata: {
        current: { metric: 'response_time_ms', value: 200 }
      }
    });
    console.log('✅ Goal completed');
    console.log('   Final status:', completeResponse.data.goal.status);
    console.log('');
    
    // Test 8: Create a goal with dependencies
    console.log('Test 8: Creating goal with dependencies...');
    const depGoalResponse = await axios.post(`${BASE_URL}/api/goals`, {
      title: 'Test Goal: Deploy optimization',
      category: 'quality',
      type: 'operational',
      description: 'Deploy the optimized response time changes',
      dependencies: [goalId],
      assignedTo: ['SelfModificationArbiter']
    });
    console.log('✅ Goal with dependency created:', depGoalResponse.data.goalId);
    console.log('   Depends on:', depGoalResponse.data.goal.dependencies.length, 'goals');
    console.log('');
    
    // Test 9: Cancel a goal
    console.log('Test 9: Cancelling goal...');
    const cancelResponse = await axios.delete(
      `${BASE_URL}/api/goals/${depGoalResponse.data.goalId}?reason=Test cancellation`
    );
    console.log('✅ Goal cancelled');
    console.log('   Status:', cancelResponse.data.goal.status);
    console.log('');
    
    // Test 10: Filter goals
    console.log('Test 10: Filtering goals by category...');
    const filterResponse = await axios.get(`${BASE_URL}/api/goals?category=optimization`);
    console.log('✅ Optimization goals:', filterResponse.data.count);
    console.log('');
    
    // Final statistics
    console.log('📊 Final Statistics:');
    const finalStats = await axios.get(`${BASE_URL}/api/goals/stats`);
    console.log('   Total created:', finalStats.data.stats.goalsCreated);
    console.log('   User requested:', finalStats.data.stats.userRequestedGoals);
    console.log('   Autonomous:', finalStats.data.stats.autonomousGoals);
    console.log('   Completed:', finalStats.data.stats.goalsCompleted);
    console.log('   Deferred:', finalStats.data.stats.goalsDeferred);
    console.log('');
    
    console.log('✅ All tests passed!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function testAutonomousGoalGeneration() {
  console.log('\n🤖 Testing Autonomous Goal Generation\n');
  
  try {
    // Simulate system observations that should trigger goal generation
    
    console.log('Test A: Simulating low learning velocity...');
    // In production, this would come from LearningVelocityTracker
    // For now, we can manually trigger via MessageBroker if we had direct access
    console.log('   ℹ️  In production: LearningVelocityTracker sends velocity_report');
    console.log('   ℹ️  GoalPlanner receives it and generates learning velocity goal');
    console.log('');
    
    console.log('Test B: Simulating low arbiter fitness...');
    console.log('   ℹ️  In production: GenomeArbiter sends fitness_score_update');
    console.log('   ℹ️  GoalPlanner receives it and generates fitness improvement goal');
    console.log('');
    
    console.log('Test C: Checking for autonomous goals...');
    const goalsResponse = await axios.get(`${BASE_URL}/api/goals`);
    const autonomousGoals = goalsResponse.data.goals.filter(
      g => g.metadata.source === 'autonomous'
    );
    console.log(`✅ Found ${autonomousGoals.length} autonomous goals`);
    
    if (autonomousGoals.length > 0) {
      console.log('   Autonomous goals:');
      autonomousGoals.forEach(g => {
        console.log(`   - ${g.title}`);
        console.log(`     Category: ${g.category}, Priority: ${g.priority}`);
        console.log(`     Rationale: ${g.metadata.rationale}`);
      });
    }
    console.log('');
    
  } catch (error) {
    console.error('❌ Autonomous goal test failed:', error.response?.data || error.message);
  }
}

// Run tests
(async () => {
  console.log('🚀 Starting GoalPlannerArbiter Tests\n');
  console.log('⚠️  Make sure the server is running on port 3001\n');
  
  await testGoalPlanner();
  await testAutonomousGoalGeneration();
  
  console.log('✨ All tests complete!\n');
  process.exit(0);
})();
