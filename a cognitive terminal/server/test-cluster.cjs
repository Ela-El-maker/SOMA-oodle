/**
 * Test Cluster Federation - 2 nodes on localhost
 * 
 * Tests:
 * 1. Start Node 1 (coordinator) on port 3001 + cluster port 5000
 * 2. Start Node 2 (worker) on port 3002 + cluster port 5001
 * 3. Node 2 discovers Node 1
 * 4. Verify nodes can see each other
 * 5. Distribute task from Node 1 to Node 2
 */

const axios = require('axios');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCluster() {
  console.log('🌐 Testing Cluster Federation...\n');
  
  const node1Api = 'http://localhost:3001/api';
  const node2Api = 'http://localhost:3002/api';
  
  try {
    // Wait for both nodes to be ready
    console.log('⏳ Waiting for nodes to initialize...');
    await sleep(2000);
    
    // 1. Check Node 1 status
    console.log('\n1️⃣  Checking Node 1 (coordinator)...');
    try {
      const node1Status = await axios.get(`${node1Api}/cluster/status`);
      console.log(`   ✓ Node 1 cluster active`);
      console.log(`   ✓ Role: ${node1Status.data.role}`);
      console.log(`   ✓ Node ID: ${node1Status.data.nodeId}`);
      console.log(`   ✓ Port: ${node1Status.data.port || 5000}`);
    } catch (err) {
      console.log(`   ⚠️  Node 1 not ready: ${err.message}`);
      console.log('   💡 Start Node 1 with: PORT=3001 CLUSTER_PORT=5000 CLUSTER_ROLE=coordinator node server/index.cjs');
      return;
    }
    
    // 2. Check Node 2 status
    console.log('\n2️⃣  Checking Node 2 (worker)...');
    try {
      const node2Status = await axios.get(`${node2Api}/cluster/status`);
      console.log(`   ✓ Node 2 cluster active`);
      console.log(`   ✓ Role: ${node2Status.data.role}`);
      console.log(`   ✓ Node ID: ${node2Status.data.nodeId}`);
      console.log(`   ✓ Port: ${node2Status.data.port || 5001}`);
    } catch (err) {
      console.log(`   ⚠️  Node 2 not ready: ${err.message}`);
      console.log('   💡 Start Node 2 with: PORT=3002 CLUSTER_PORT=5001 CLUSTER_ROLE=worker node server/index.cjs');
      return;
    }
    
    // 3. Node 2 discovers Node 1
    console.log('\n3️⃣  Node 2 discovering Node 1...');
    try {
      await axios.post(`${node2Api}/cluster/discover`, {
        host: 'localhost:5000'
      });
      console.log('   ✓ Discovery request sent');
      
      // Wait for discovery to complete
      await sleep(2000);
    } catch (err) {
      console.log(`   ✗ Discovery failed: ${err.message}`);
    }
    
    // 4. Check if nodes can see each other
    console.log('\n4️⃣  Checking node visibility...');
    
    const node1Nodes = await axios.get(`${node1Api}/cluster/nodes`);
    const node2Nodes = await axios.get(`${node2Api}/cluster/nodes`);
    
    console.log(`   ✓ Node 1 sees ${node1Nodes.data.count} node(s):`);
    node1Nodes.data.nodes.forEach(n => {
      console.log(`     - ${n.nodeName} (${n.nodeId})`);
    });
    
    console.log(`   ✓ Node 2 sees ${node2Nodes.data.count} node(s):`);
    node2Nodes.data.nodes.forEach(n => {
      console.log(`     - ${n.nodeName} (${n.nodeId})`);
    });
    
    // 5. Distribute task from Node 1 to cluster
    console.log('\n5️⃣  Testing task distribution...');
    try {
      const taskResult = await axios.post(`${node1Api}/cluster/task/distribute`, {
        agent: 'test-agent',
        taskData: {
          type: 'test',
          payload: 'Hello from Node 1!',
          timestamp: Date.now()
        },
        config: {
          timeout: 10000
        }
      });
      
      if (taskResult.data.success) {
        console.log('   ✓ Task distributed successfully');
        console.log(`   ✓ Executed on: ${taskResult.data.nodeId}`);
        console.log(`   ✓ Result:`, taskResult.data.result);
      } else {
        console.log(`   ✗ Task failed: ${taskResult.data.error}`);
      }
    } catch (err) {
      console.log(`   ⚠️  Task distribution not fully implemented: ${err.message}`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Cluster Test Summary:');
    console.log('='.repeat(60));
    console.log(`✓ Node 1 (coordinator) running: ${node1Nodes.data.count >= 1}`);
    console.log(`✓ Node 2 (worker) running: ${node2Nodes.data.count >= 1}`);
    console.log(`✓ Nodes can discover each other: ${node1Nodes.data.count > 1 || node2Nodes.data.count > 1}`);
    console.log('='.repeat(60));
    
    console.log('\n🎉 Cluster federation test complete!');
    console.log('\n💡 To run multi-node cluster:');
    console.log('   Terminal 1: PORT=3001 CLUSTER_PORT=5000 CLUSTER_ROLE=coordinator node server/index.cjs');
    console.log('   Terminal 2: PORT=3002 CLUSTER_PORT=5001 CLUSTER_ROLE=worker CLUSTER_DISCOVERY=localhost:5000 node server/index.cjs');
    console.log('   Test: node server/test-cluster.cjs\n');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run tests
testCluster();
