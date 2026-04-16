/**
 * Test NEMESIS with DeepSeek/Ollama fallback
 * Uses local models instead of Gemini API
 */

import dotenv from 'dotenv';
import { SomaBootstrap } from './core/SomaBootstrap.js';

dotenv.config();

async function testNemesisFallback() {
  console.log('🧪 Testing NEMESIS with DeepSeek/Ollama Fallback\n');
  
  try {
    // Create test file BEFORE booting SOMA
    console.log('1️⃣ Creating test target function...');
    const path = await import('path');
    const fs = await import('fs/promises');
    const testFilePath = path.default.join(process.cwd(), 'arbiters', 'test_target_function.js');
    
    // Intentionally inefficient code - clear optimization target
    const testCode = `// Test function for NEMESIS review
async function testOptimizationTarget(items) {
  // Intentionally inefficient O(n²) duplicate finder
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
    
    // Remove Gemini key to force fallback
    const geminiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    
    console.log('2️⃣ Initializing SOMA (Gemini disabled, will use DeepSeek/Ollama)...');
    const bootstrap = new SomaBootstrap(process.cwd(), {
      mode: 'test',
      port: 3032,
      apiKeys: {
        geminiApiKey: '', // Explicitly empty to trigger fallback
        kevinEmail: process.env.KEVIN_EMAIL || '',
        kevinAppPassword: process.env.KEVIN_APP_PASSWORD || ''
      }
    });
    
    const system = await bootstrap.initialize();
    console.log('✅ SOMA initialized\n');
    
    // Restore Gemini key
    process.env.GEMINI_API_KEY = geminiKey;
    
    // Check NEMESIS
    console.log('3️⃣ Checking NEMESIS integration...');
    const selfMod = system.selfModification;
    
    if (!selfMod || !selfMod.nemesisReview) {
      console.error('❌ NEMESIS not found!');
      process.exit(1);
    }
    
    console.log('✅ NEMESIS is active');
    console.log(`   - minFriction: ${selfMod.nemesisReview.numericNemesis.thresholds.minFriction}`);
    console.log(`   - minValueDensity: ${selfMod.nemesisReview.numericNemesis.thresholds.minValueDensity}\n`);
    
    // Initial stats
    console.log('4️⃣ Initial NEMESIS stats:');
    console.log(`   - Total reviews: ${selfMod.nemesisStats.totalReviews}`);
    console.log(`   - Deployments blocked: ${selfMod.nemesisStats.deploymentsBlocked}\n`);
    
    // Trigger optimization
    console.log('5️⃣ Triggering self-modification with fallback model...\n');
    console.log('='.repeat(80));
    console.log('WATCH FOR NEMESIS LOGS BELOW:');
    console.log('='.repeat(80) + '\n');
    
    const result = await selfMod.optimizeFunction({
      filepath: testFilePath,
      functionName: 'testOptimizationTarget',
      strategy: 'generative'
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('NEMESIS REVIEW COMPLETE');
    console.log('='.repeat(80) + '\n');
    
    // Results
    console.log('6️⃣ Optimization result:');
    console.log(`   - Success: ${result.success}`);
    console.log(`   - ModId: ${result.modId || 'N/A'}`)
    console.log(`   - Reason: ${result.reason || 'N/A'}\n`);
    
    // Final stats
    console.log('7️⃣ Updated NEMESIS stats:');
    console.log(`   - Total reviews: ${selfMod.nemesisStats.totalReviews}`);
    console.log(`   - Numeric pass: ${selfMod.nemesisStats.numericPass}`);
    console.log(`   - Numeric fail: ${selfMod.nemesisStats.numericFail}`);
    console.log(`   - Deep reviews: ${selfMod.nemesisStats.deepReviewTriggered}`);
    console.log(`   - Issues found: ${selfMod.nemesisStats.issuesFound}`);
    console.log(`   - Deployments blocked: ${selfMod.nemesisStats.deploymentsBlocked}\n`);
    
    // Cleanup
    await fs.unlink(testFilePath).catch(() => {});
    
    console.log('✅ TEST COMPLETE!\n');
    
    // Summary
    if (selfMod.nemesisStats.totalReviews > 0) {
      console.log('🎉 SUCCESS: NEMESIS reviewed the generated code!');
      
      if (selfMod.nemesisStats.numericPass > 0) {
        console.log('   → Code passed numeric evaluation (fast path)');
      }
      
      if (selfMod.nemesisStats.deepReviewTriggered > 0) {
        console.log('   → Triggered deep linguistic review');
      }
      
      if (selfMod.nemesisStats.deploymentsBlocked > 0) {
        console.log('   → NEMESIS BLOCKED deployment (caught issues!)');
      }
      
      if (result.success) {
        console.log('   → Code was optimized and approved by NEMESIS');
      }
    } else {
      console.log('⚠️  WARNING: NEMESIS was not invoked');
      console.log(`   Reason: ${result.reason || 'Check logs above'}`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testNemesisFallback();
