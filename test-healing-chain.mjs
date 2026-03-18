#!/usr/bin/env node
/**
 * Test: SafeArbiter → Watchdog → ImmuneSystem Healing Chain
 * 
 * This tests if the self-healing pipeline actually works.
 */

import { SafeArbiter } from './core/SafeArbiter.js';
import { Watchdog } from './core/Watchdog.js';

console.log('🧪 Testing Self-Healing Chain...\n');

// 1. Create a mock "flaky" arbiter that fails sometimes
class FlakyArbiter {
  constructor(config) {
    this.name = config.name || 'FlakyArbiter';
    this.failCount = 0;
    this.maxFails = 3; // Fail 3 times then recover
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
    this.failCount = 0;
    console.log(`[${this.name}] Initialized!`);
  }

  async reason(query) {
    this.failCount++;
    
    if (this.failCount <= this.maxFails) {
      console.log(`[${this.name}] 💥 FAILING (${this.failCount}/${this.maxFails})`);
      throw new Error(`Simulated failure #${this.failCount}`);
    }
    
    console.log(`[${this.name}] ✅ Working now!`);
    return { text: `Response to: ${query}`, confidence: 0.9 };
  }

  isHealthy() {
    return this.initialized && this.failCount < this.maxFails;
  }

  reset() {
    this.failCount = 0;
    console.log(`[${this.name}] Reset!`);
  }
}

// 2. Create a mock ImmuneSystem
const mockImmuneSystem = {
  heal: async (component, error) => {
    console.log(`[ImmuneSystem] 🏥 Healing ${component}: ${error?.message}`);
    // Simulate successful heal
    return { healed: true, action: 'reset_component' };
  }
};

// 3. Set up the chain
async function testHealingChain() {
  console.log('='.repeat(60));
  console.log('STEP 1: Setting up Watchdog');
  console.log('='.repeat(60));
  
  const watchdog = new Watchdog({
    checkInterval: 60000, // Don't auto-check during test
    maxRecoveryAttempts: 3
  });
  
  // Register ImmuneSystem as helper
  watchdog.registerHelper('ImmuneSystem', mockImmuneSystem);
  console.log('✅ ImmuneSystem registered as helper\n');

  console.log('='.repeat(60));
  console.log('STEP 2: Creating SafeArbiter-wrapped FlakyArbiter');
  console.log('='.repeat(60));
  
  const safeArbiter = new SafeArbiter(FlakyArbiter, { name: 'TestBrain' });
  await safeArbiter.initialize();
  
  // Connect to Watchdog
  safeArbiter.setWatchdog(watchdog);
  console.log('✅ SafeArbiter connected to Watchdog\n');

  // Register with Watchdog for monitoring
  watchdog.watch('TestBrain', 
    async () => safeArbiter.healthy,
    async () => safeArbiter.recover()
  );

  console.log('='.repeat(60));
  console.log('STEP 3: Triggering failures to test healing');
  console.log('='.repeat(60));
  
  // Make calls that will fail
  for (let i = 1; i <= 5; i++) {
    console.log(`\n--- Call #${i} ---`);
    const result = await safeArbiter.call('reason', `Test query ${i}`);
    console.log(`Result:`, result);
    console.log(`SafeArbiter status: healthy=${safeArbiter.healthy}, errorCount=${safeArbiter.errorCount}`);
    
    // Small delay to let healing happen
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('STEP 4: Final Status');
  console.log('='.repeat(60));
  
  console.log('\nSafeArbiter:', safeArbiter.getStatus());
  console.log('Watchdog:', watchdog.getStatus());
  console.log('Repair History:', watchdog.getRepairHistory());

  // Cleanup
  watchdog.stop();
  
  console.log('\n✅ Test complete!');
}

testHealingChain().catch(console.error);
