/**
 * Test NEMESIS integration with SelfModificationArbiter
 * 
 * This will trigger a self-modification and watch NEMESIS review it
 */

import dotenv from 'dotenv';
import { SomaBootstrap } from './core/SomaBootstrap.js';

// Load environment variables
dotenv.config();

async function testNemesis() {
  console.log('🧪 Testing NEMESIS + SelfModificationArbiter Integration\n');
  
  try {
    // Create test file BEFORE booting SOMA (so it gets scanned)
    console.log('1️⃣ Creating test target function...');
    const path = await import('path');
    const fs = await import('fs/promises');
    const testFilePath = path.default.join(process.cwd(), 'arbiters', 'test_target_function.js');
    const testCode = `// Test function for NEMESIS review
async function testOptimizationTarget(items) {
  // Intentionally inefficient code for optimization
  let result = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      if (items[i] === items[j] && i !== j) {
        result.push(items[i]);
      }
    }
  }
  return result;
}

module.exports = { testOptimizationTarget };
`;
    
    await fs.writeFile(testFilePath, testCode);
    console.log(`✅ Test file created: ${testFilePath}\n`);
    
    // Initialize SOMA (will scan test file)
    console.log('2️⃣ Initializing SOMA...');
    const bootstrap = new SomaBootstrap(process.cwd(), {
      mode: 'test',
      port: 3031, // Different port to avoid conflicts
      apiKeys: {
        geminiApiKey: process.env.GEMINI_API_KEY,
        kevinEmail: process.env.KEVIN_EMAIL || '',
        kevinAppPassword: process.env.KEVIN_APP_PASSWORD || ''
      }
    });
    
    const system = await bootstrap.initialize();
    console.log('✅ SOMA initialized\n');
    
    // Check if SelfModificationArbiter has NEMESIS
    console.log('3️⃣ Checking NEMESIS integration...');
    const selfMod = system.selfModification;
    
    if (!selfMod) {
      console.error('❌ SelfModificationArbiter not found!');
      process.exit(1);
    }
    
    if (!selfMod.nemesisReview) {
      console.error('❌ NEMESIS not initialized in SelfModificationArbiter!');
      process.exit(1);
    }
    
    console.log('✅ NEMESIS is active in SelfModificationArbiter');
    console.log(`   - minFriction: ${selfMod.nemesisReview.numericNemesis.thresholds.minFriction}`);
    console.log(`   - minValueDensity: ${selfMod.nemesisReview.numericNemesis.thresholds.minValueDensity}\n`);
    
    // Check initial stats
    console.log('4️⃣ Initial NEMESIS stats:');
    console.log(`   - Total reviews: ${selfMod.nemesisStats.totalReviews}`);
    console.log(`   - Numeric pass: ${selfMod.nemesisStats.numericPass}`);
    console.log(`   - Numeric fail: ${selfMod.nemesisStats.numericFail}`);
    console.log(`   - Deep reviews: ${selfMod.nemesisStats.deepReviewTriggered}`);
    console.log(`   - Deployments blocked: ${selfMod.nemesisStats.deploymentsBlocked}\n`);
    
    // Trigger self-modification with NEMESIS review
    console.log('5️⃣ Triggering self-modification (this will invoke NEMESIS)...\n');
    console.log('=' .repeat(80));
    console.log('WATCH FOR NEMESIS LOGS BELOW:');
    console.log('=' .repeat(80) + '\n');
    
    const result = await selfMod.optimizeFunction({
      filepath: testFilePath,
      functionName: 'testOptimizationTarget',
      strategy: 'generative' // Use generative to trigger NEMESIS
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('NEMESIS REVIEW COMPLETE');
    console.log('='.repeat(80) + '\n');
    
    // Check results
    console.log('6️⃣ Optimization result:');
    console.log(`   - Success: ${result.success}`);
    console.log(`   - ModId: ${result.modId || 'N/A'}`);
    console.log(`   - Reason: ${result.reason || 'N/A'}\n`);
    
    // Check updated stats
    console.log('7️⃣ Updated NEMESIS stats:');
    console.log(`   - Total reviews: ${selfMod.nemesisStats.totalReviews}`);
    console.log(`   - Numeric pass: ${selfMod.nemesisStats.numericPass}`);
    console.log(`   - Numeric fail: ${selfMod.nemesisStats.numericFail}`);
    console.log(`   - Deep reviews: ${selfMod.nemesisStats.deepReviewTriggered}`);
    console.log(`   - Issues found: ${selfMod.nemesisStats.issuesFound}`);
    console.log(`   - Deployments blocked: ${selfMod.nemesisStats.deploymentsBlocked}\n`);
    
    // Cleanup
    const fs2 = await import('fs/promises');
    await fs2.unlink(testFilePath).catch(() => {});
    
    console.log('✅ TEST COMPLETE!\n');
    
    // Summary
    if (selfMod.nemesisStats.totalReviews > 0) {
      console.log('🎉 SUCCESS: NEMESIS reviewed the generated code!');
      
      if (selfMod.nemesisStats.numericPass > 0) {
        console.log('   → Code passed numeric evaluation (fast path)');
      }
      
      if (selfMod.nemesisStats.deepReviewTriggered > 0) {
        console.log('   → Triggered deep linguistic review (uncertain code)');
      }
      
      if (selfMod.nemesisStats.deploymentsBlocked > 0) {
        console.log('   → NEMESIS BLOCKED deployment (caught issues!)');
      }
    } else {
      console.log('⚠️  WARNING: NEMESIS was not invoked. Check logs above.');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testNemesis();
