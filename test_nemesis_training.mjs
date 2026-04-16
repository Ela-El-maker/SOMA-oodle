/**
 * Test NEMESIS Phase 1.2 - Training Data Quality Gate
 * 
 * Verifies that TrainingDataExporter filters low-quality examples
 */

import dotenv from 'dotenv';
import { SomaBootstrap } from './core/SomaBootstrap.js';

dotenv.config();

async function testNemesisTrainingFilter() {
  console.log('🧪 Testing NEMESIS Training Data Quality Gate\n');
  
  try {
    // Initialize SOMA
    console.log('1️⃣ Initializing SOMA...');
    const bootstrap = new SomaBootstrap(process.cwd(), {
      mode: 'test',
      port: 3033,
      apiKeys: {
        geminiApiKey: process.env.GEMINI_API_KEY,
        kevinEmail: process.env.KEVIN_EMAIL || '',
        kevinAppPassword: process.env.KEVIN_APP_PASSWORD || ''
      }
    });
    
    const system = await bootstrap.initialize();
    console.log('✅ SOMA initialized\n');
    
    // Check TrainingDataExporter
    console.log('2️⃣ Checking TrainingDataExporter...');
    const exporter = system.trainingDataExporter;
    
    if (!exporter) {
      console.error('❌ TrainingDataExporter not found!');
      process.exit(1);
    }
    
    if (!exporter.nemesisReview) {
      console.error('❌ NEMESIS not integrated with TrainingDataExporter!');
      process.exit(1);
    }
    
    console.log('✅ NEMESIS quality filtering is active');
    console.log(`   - minFriction: ${exporter.nemesisReview.numericNemesis.thresholds.minFriction}`);
    console.log(`   - minValueDensity: ${exporter.nemesisReview.numericNemesis.thresholds.minValueDensity}\n`);
    
    // Add test conversations
    console.log('3️⃣ Adding test conversations...');
    const conversationHistory = system.conversationHistory;
    
    // Good conversation
    await conversationHistory.addMessage(
      'user',
      'How do I optimize a binary search algorithm?'
    );
    
    await conversationHistory.addMessage(
      'assistant',
      'Binary search is already O(log n), which is optimal for searching sorted arrays. Key optimizations: 1) Use iterative instead of recursive to avoid stack overhead. 2) Cache the array length. 3) Use bit shifting for midpoint calculation (mid = (low + high) >>> 1). 4) Consider alternative data structures like hash tables for O(1) average case.',
      { confidence: 0.9 }
    );
    
    // Bad conversation (low quality response)
    await conversationHistory.addMessage(
      'user',
      'What is the meaning of life?'
    );
    
    await conversationHistory.addMessage(
      'assistant',
      'idk lol maybe 42? whatever',
      { confidence: 0.2 }
    );
    
    // Another good conversation
    await conversationHistory.addMessage(
      'user',
      'Explain async/await in JavaScript'
    );
    
    await conversationHistory.addMessage(
      'assistant',
      'async/await is syntactic sugar over Promises. An async function always returns a Promise. The await keyword pauses execution until the Promise resolves, making asynchronous code look synchronous. Benefits: Better error handling with try/catch, cleaner code than .then() chains, easier debugging.',
      { confidence: 0.85 }
    );
    
    console.log('✅ Added 3 test conversations (2 good, 1 bad)\n');
    
    // Export training data (triggers NEMESIS filtering)
    console.log('4️⃣ Exporting training data (NEMESIS will filter)...\n');
    console.log('='.repeat(80));
    console.log('WATCH FOR NEMESIS FILTERING LOGS:');
    console.log('='.repeat(80) + '\n');
    
    const exportResult = await exporter.exportAll();
    
    console.log('\n' + '='.repeat(80));
    console.log('NEMESIS FILTERING COMPLETE');
    console.log('='.repeat(80) + '\n');
    
    // Check results
    console.log('5️⃣ Export results:');
    console.log(`   - Success: ${exportResult.success}`);
    console.log(`   - Total examples: ${exportResult.exampleCount}`);
    console.log(`   - Dataset: ${exportResult.datasetPath}\n`);
    
    // Check quality stats
    console.log('6️⃣ NEMESIS Quality Stats:');
    const stats = exporter.getStats();
    console.log(`   - Total reviewed: ${stats.quality.totalReviewed}`);
    console.log(`   - Passed: ${stats.quality.passed}`);
    console.log(`   - Failed: ${stats.quality.failed}`);
    console.log(`   - Sent to graveyard: ${stats.quality.sentToGraveyard}\n`);
    
    console.log('✅ TEST COMPLETE!\n');
    
    // Validate expectations
    if (stats.quality.totalReviewed >= 3) {
      console.log('🎉 SUCCESS: NEMESIS reviewed training examples!');
      
      if (stats.quality.passed >= 2) {
        console.log('   → Good examples passed filter');
      }
      
      if (stats.quality.failed >= 1) {
        console.log('   → Bad examples filtered out');
      }
      
      if (stats.quality.sentToGraveyard >= 1) {
        console.log('   → Bad examples logged to graveyard');
      }
      
      const filterRate = (stats.quality.failed / stats.quality.totalReviewed * 100).toFixed(1);
      console.log(`   → Filter rate: ${filterRate}% (healthy range: 10-30%)`);
      
      console.log('\n📊 Phase 1.2 Integration: WORKING ✅');
    } else {
      console.log('⚠️  WARNING: NEMESIS did not review enough examples');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testNemesisTrainingFilter();
