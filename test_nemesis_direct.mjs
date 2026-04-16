/**
 * Direct NEMESIS test - bypasses Gemini/QuadBrain
 * Tests NEMESIS review system directly with mock generated code
 */

import dotenv from 'dotenv';
import { NemesisReviewSystem } from './cognitive/prometheus/NemesisReviewSystem.js';

dotenv.config();

async function testNemesisDirect() {
  console.log('🧪 Testing NEMESIS Review System (Direct)\n');
  
  try {
    // Initialize NEMESIS
    console.log('1️⃣ Initializing NEMESIS...');
    const nemesis = new NemesisReviewSystem({
      minFriction: 0.3,
      maxChargeWithoutFriction: 0.6,
      minValueDensity: 0.2,
      promotionScore: 0.8
    });
    console.log('✅ NEMESIS initialized\n');
    
    // Test Case 1: Good code (should pass numeric evaluation)
    console.log('2️⃣ Test Case 1: Well-grounded, simple optimization');
    const goodCode = `
// Optimized duplicate finder - O(n) instead of O(n²)
async function testOptimizationTarget(items) {
  const seen = new Set();
  const duplicates = new Set();
  
  for (const item of items) {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  }
  
  return Array.from(duplicates);
}`;

    const goodReview = await nemesis.evaluateResponse(
      'LOGOS',
      'Optimize testOptimizationTarget',
      { text: goodCode, confidence: 0.85 },
      null // No Gemini callback needed for numeric pass
    );
    
    console.log(`   Stage: ${goodReview.stage}`);
    console.log(`   Score: ${goodReview.score?.toFixed(2) || 'N/A'}`);
    console.log(`   Needs Revision: ${goodReview.needsRevision}`);
    console.log(`   Reason: ${goodReview.reason}\n`);
    
    // Test Case 2: Overly complex code (should trigger deep review OR fail numeric)
    console.log('3️⃣ Test Case 2: Overly clever/complex code');
    const complexCode = `
// Hyper-optimized quantum-entangled duplicate finder using WebAssembly FFI
async function testOptimizationTarget(items) {
  const wasmModule = await WebAssembly.instantiate(quantumSortBuffer);
  const heap = new Int32Array(wasmModule.instance.exports.memory.buffer);
  const ctx = wasmModule.instance.exports.createContext();
  
  // Transcendental hash mapping with Fibonacci hashing
  const phi = (1 + Math.sqrt(5)) / 2;
  const hashMap = new Map();
  
  for (let i = 0; i < items.length; i++) {
    const hash = Math.floor((items[i].charCodeAt(0) * phi) % 2048);
    heap[hash] = (heap[hash] || 0) + 1;
  }
  
  // Quantum collapse the superposition
  wasmModule.instance.exports.collapse(ctx);
  return wasmModule.instance.exports.getDuplicates(ctx);
}`;

    const complexReview = await nemesis.evaluateResponse(
      'LOGOS',
      'Optimize testOptimizationTarget',
      { text: complexCode, confidence: 0.95 },
      null
    );
    
    console.log(`   Stage: ${complexReview.stage}`);
    console.log(`   Score: ${complexReview.score?.toFixed(2) || 'N/A'}`);
    console.log(`   Needs Revision: ${complexReview.needsRevision}`);
    console.log(`   Reason: ${complexReview.reason}\n`);
    
    // Test Case 3: Empty/minimal code (should fail)
    console.log('4️⃣ Test Case 3: Empty/low-value code');
    const emptyCode = `
// TODO: Implement optimization
async function testOptimizationTarget(items) {
  return items;
}`;

    const emptyReview = await nemesis.evaluateResponse(
      'LOGOS',
      'Optimize testOptimizationTarget',
      { text: emptyCode, confidence: 0.3 },
      null
    );
    
    console.log(`   Stage: ${emptyReview.stage}`);
    console.log(`   Score: ${emptyReview.score?.toFixed(2) || 'N/A'}`);
    console.log(`   Needs Revision: ${emptyReview.needsRevision}`);
    console.log(`   Reason: ${emptyReview.reason}\n`);
    
    console.log('✅ TEST COMPLETE!\n');
    
    // Summary
    console.log('📊 Summary:');
    console.log(`   Good code passed: ${!goodReview.needsRevision ? '✅' : '❌'}`);
    console.log(`   Complex code caught: ${complexReview.needsRevision ? '✅' : '❌'}`);
    console.log(`   Empty code rejected: ${emptyReview.needsRevision ? '✅' : '❌'}`);
    
    const allPassed = !goodReview.needsRevision && complexReview.needsRevision && emptyReview.needsRevision;
    console.log(`\n${allPassed ? '🎉 SUCCESS' : '⚠️  PARTIAL SUCCESS'}: NEMESIS is functioning correctly!`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testNemesisDirect();
