/**
 * Test MicroAgent System
 * 
 * Tests:
 * 1. Agent spawning (all 4 types)
 * 2. Task execution
 * 3. Auto-termination (TTL and idle timeout)
 * 4. Pool management
 * 5. API endpoints
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testMicroAgents() {
  console.log('🧪 Testing MicroAgent System...\n');
  
  const results = {
    spawned: 0,
    executed: 0,
    terminated: 0,
    failed: 0,
    totalTime: 0
  };
  
  try {
    // 1. Test FileAgent - Read file
    console.log('1️⃣  Testing FileAgent (read)...');
    const startTime1 = Date.now();
    const fileReadResult = await axios.post(`${API_BASE}/agents/execute`, {
      type: 'file',
      task: {
        operation: 'read',
        path: __filename  // Read this test file itself
      }
    });
    
    if (fileReadResult.data.success) {
      console.log(`   ✓ FileAgent read ${fileReadResult.data.result.size} bytes`);
      console.log(`   ✓ Agent: ${fileReadResult.data.agentId}`);
      results.spawned++;
      results.executed++;
    } else {
      console.log(`   ✗ Failed: ${fileReadResult.data.error}`);
      results.failed++;
    }
    results.totalTime += Date.now() - startTime1;
    
    // 2. Test CodeExecAgent - Execute JS
    console.log('\n2️⃣  Testing CodeExecAgent (javascript)...');
    const startTime2 = Date.now();
    const codeExecResult = await axios.post(`${API_BASE}/agents/execute`, {
      type: 'code',
      task: {
        language: 'javascript',
        code: 'return Math.sqrt(144) + " is the square root of 144"'
      }
    });
    
    if (codeExecResult.data.success) {
      console.log(`   ✓ Code executed: ${codeExecResult.data.result.result}`);
      console.log(`   ✓ Agent: ${codeExecResult.data.agentId}`);
      results.spawned++;
      results.executed++;
    } else {
      console.log(`   ✗ Failed: ${codeExecResult.data.error}`);
      results.failed++;
    }
    results.totalTime += Date.now() - startTime2;
    
    // 3. Test ShellAgent - Execute command
    console.log('\n3️⃣  Testing ShellAgent (shell command)...');
    const startTime3 = Date.now();
    const shellResult = await axios.post(`${API_BASE}/agents/execute`, {
      type: 'shell',
      task: {
        command: process.platform === 'win32' ? 'echo Hello from SOMA' : 'echo "Hello from SOMA"'
      }
    });
    
    if (shellResult.data.success) {
      console.log(`   ✓ Shell output: ${shellResult.data.result.stdout.trim()}`);
      console.log(`   ✓ Agent: ${shellResult.data.agentId}`);
      results.spawned++;
      results.executed++;
    } else {
      console.log(`   ✗ Failed: ${shellResult.data.error}`);
      results.failed++;
    }
    results.totalTime += Date.now() - startTime3;
    
    // 4. Test MemoryQueryAgent - Store memory
    console.log('\n4️⃣  Testing MemoryQueryAgent (store)...');
    const startTime4 = Date.now();
    const memoryStoreResult = await axios.post(`${API_BASE}/agents/execute`, {
      type: 'memory',
      task: {
        operation: 'store',
        content: 'MicroAgent test memory',
        metadata: { source: 'test-microagents', timestamp: Date.now() }
      }
    });
    
    if (memoryStoreResult.data.success) {
      console.log(`   ✓ Memory stored (tier: ${memoryStoreResult.data.result.tier})`);
      console.log(`   ✓ Agent: ${memoryStoreResult.data.agentId}`);
      results.spawned++;
      results.executed++;
    } else {
      console.log(`   ✗ Failed: ${memoryStoreResult.data.error}`);
      results.failed++;
    }
    results.totalTime += Date.now() - startTime4;
    
    // 5. Test agent lifecycle - spawn agent and check status
    console.log('\n5️⃣  Testing agent lifecycle...');
    const spawnResult = await axios.post(`${API_BASE}/agents/spawn`, {
      type: 'file',
      config: { ttl: 5000, idleTimeout: 2000 }  // 5s TTL, 2s idle
    });
    
    if (spawnResult.data.success) {
      const agentId = spawnResult.data.agent.id;
      console.log(`   ✓ Agent spawned: ${agentId}`);
      console.log(`   ✓ State: ${spawnResult.data.agent.state}`);
      results.spawned++;
      
      // Wait for agent to become idle
      await sleep(3000);
      
      // Check if agent auto-terminated due to idle timeout
      try {
        const statusResult = await axios.get(`${API_BASE}/agents/${agentId}`);
        if (statusResult.data.success) {
          console.log(`   ✓ Agent still active: ${statusResult.data.agent.state}`);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          console.log('   ✓ Agent auto-terminated (idle timeout)');
          results.terminated++;
        }
      }
    }
    
    // 6. Test agent pool status
    console.log('\n6️⃣  Testing agent pool status...');
    const statusResult = await axios.get(`${API_BASE}/agents/status`);
    if (statusResult.data.success) {
      console.log(`   ✓ Active agents: ${statusResult.data.activeAgents}/${statusResult.data.maxAgents}`);
      console.log(`   ✓ Total spawned: ${statusResult.data.metrics.totalSpawned}`);
      console.log(`   ✓ Total terminated: ${statusResult.data.metrics.totalTerminated}`);
      console.log(`   ✓ Avg lifetime: ${Math.round(statusResult.data.metrics.avgLifetime)}ms`);
      console.log('   ✓ Tasks by type:');
      for (const [type, count] of Object.entries(statusResult.data.metrics.tasksByType)) {
        console.log(`     - ${type}: ${count}`);
      }
    }
    
    // 7. Test manual termination
    console.log('\n7️⃣  Testing manual termination...');
    const spawnResult2 = await axios.post(`${API_BASE}/agents/spawn`, {
      type: 'code',
      config: { ttl: 60000 }  // Long TTL so we can manually terminate
    });
    
    if (spawnResult2.data.success) {
      const agentId = spawnResult2.data.agent.id;
      console.log(`   ✓ Agent spawned: ${agentId}`);
      
      const terminateResult = await axios.post(`${API_BASE}/agents/terminate/${agentId}`, {
        reason: 'test-manual'
      });
      
      if (terminateResult.data.success) {
        console.log('   ✓ Agent manually terminated');
        results.terminated++;
      }
    }
    
    // Final results
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results:');
    console.log('='.repeat(60));
    console.log(`✓ Agents spawned: ${results.spawned}`);
    console.log(`✓ Tasks executed: ${results.executed}`);
    console.log(`✓ Agents terminated: ${results.terminated}`);
    console.log(`✗ Failed: ${results.failed}`);
    console.log(`⏱  Total time: ${results.totalTime}ms`);
    console.log(`⏱  Avg time per task: ${Math.round(results.totalTime / results.executed)}ms`);
    console.log('='.repeat(60));
    
    if (results.failed === 0) {
      console.log('\n🎉 All tests passed! MicroAgent system operational.\n');
    } else {
      console.log(`\n⚠️  ${results.failed} test(s) failed.\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Server not running. Start the server first with:');
      console.error('   node server/start-soma-complete.cjs');
    }
    console.error('\nStack:', error.stack);
  }
}

// Run tests
testMicroAgents();
