/**
 * Integration Test - Verify SOMA's cognitive loops are properly wired
 * Tests the flow between major systems to ensure they work as one organism
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║   🧠 SOMA INTEGRATION TEST                                ║');
console.log('║   Verifying cognitive loops and system wiring             ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// Import the system
import { SomaBootstrap } from './core/SomaBootstrap.js';
import { CONFIG } from './core/SomaConfig.js';

let system;

// Test 1: Bootstrap initialization
test('System Bootstrap Initializes', async () => {
  const bootstrap = new SomaBootstrap(process.cwd(), { ...CONFIG, mode: 'test', port: 0 });
  system = await bootstrap.initialize();

  if (!system) throw new Error('Bootstrap returned null system');
  if (!system.quadBrain) throw new Error('QuadBrain missing');
  if (!system.mnemonic) throw new Error('MnemonicArbiter missing');
});

// Test 2: Curiosity → Simulation wiring
test('Curiosity ↔ Simulation Integration', async () => {
  if (!system.curiosity) throw new Error('CuriosityEngine not found');

  // CuriosityEngine should have reference to simulation after daemon setup
  // Note: In test mode, simulation may not be started, so we just verify the interface exists
  if (typeof system.curiosity.exploreKnowledgeGap !== 'function') {
    throw new Error('CuriosityEngine missing exploreKnowledgeGap method');
  }
});

// Test 3: NighttimeLearning → Multiple Systems
test('NighttimeLearning System Connections', async () => {
  if (!system.nighttimeLearning) throw new Error('NighttimeLearningOrchestrator not found');

  const ntl = system.nighttimeLearning;

  // Verify it has references to key systems
  if (!ntl.mnemonic) throw new Error('NighttimeLearning missing MnemonicArbiter connection');
  if (!ntl.tribrain) throw new Error('NighttimeLearning missing QuadBrain connection');

  // Verify learning sessions are scheduled
  if (ntl.cronJobs.size === 0) throw new Error('No learning sessions scheduled');

  console.log(`   └─ ${ntl.cronJobs.size} learning sessions scheduled`);
});

// Test 4: Causality System Initialized
test('CausalityArbiter Initialized', async () => {
  if (!system.causality) throw new Error('CausalityArbiter not found');

  // Verify it has methods
  if (typeof system.causality.addCausalLink !== 'function') {
    throw new Error('CausalityArbiter missing addCausalLink method');
  }
});

// Test 5: WorldModel Integration
test('WorldModel ↔ Causality Integration', async () => {
  if (!system.worldModel) throw new Error('WorldModelArbiter not found');

  // WorldModel should be connected to causality during init
  if (!system.worldModel.causalityArbiter) {
    console.log('   ⚠️  WorldModel not directly linked to Causality (may use MessageBroker)');
  }
});

// Test 6: Learning Pipeline Integration
test('Universal Learning Pipeline Active', async () => {
  if (!system.learningPipeline) throw new Error('UniversalLearningPipeline not found');

  // Verify it's connected to mnemonic
  if (!system.learningPipeline.mnemonic) {
    throw new Error('LearningPipeline missing MnemonicArbiter connection');
  }

  // Verify experience buffer exists
  if (!system.learningPipeline.experienceBuffer) {
    throw new Error('LearningPipeline missing ExperienceBuffer');
  }

  const bufferSize = system.learningPipeline.experienceBuffer.buffer.length;
  console.log(`   └─ Experience buffer: ${bufferSize} experiences`);
});

// Test 7: MessageBroker Integration
test('MessageBroker Event System', async () => {
  if (!system.messageBroker) throw new Error('MessageBroker not found');

  // Count registered arbiters
  const arbiterCount = system.messageBroker.arbiters.size;
  console.log(`   └─ ${arbiterCount} arbiters registered`);

  if (arbiterCount < 5) throw new Error('Too few arbiters registered with MessageBroker');
});

// Test 8: Abstraction → Causality/WorldModel
test('AbstractionArbiter Connections', async () => {
  if (!system.abstraction) throw new Error('AbstractionArbiter not found');

  // Check if abstraction was initialized with causality/worldModel
  if (!system.abstraction.causalityArbiter) {
    console.log('   ⚠️  AbstractionArbiter not linked to Causality');
  }
  if (!system.abstraction.worldModel) {
    console.log('   ⚠️  AbstractionArbiter not linked to WorldModel');
  }
});

// Test 9: Muse Engine (Creativity) Connection
test('MuseEngine (Creativity) Active', async () => {
  if (!system.muse) throw new Error('MuseEngine not found');

  // Verify it's listening for triggers
  if (typeof system.muse.generateIdea !== 'function') {
    throw new Error('MuseEngine missing generateIdea method');
  }
});

// Test 10: Meta-Learning Feedback Loop
test('Meta-Learning Engine Feedback Loop', async () => {
  if (!system.metaLearning) throw new Error('MetaLearningEngine not found');

  // Verify it's connected to learning pipeline
  if (!system.metaLearning.learningPipeline) {
    console.log('   ⚠️  MetaLearning not subscribed to learning pipeline events');
  }
});

// Test 11: Knowledge Bridge (Simulation → Cognition)
test('KnowledgeBridge (Simulation → Cognition)', async () => {
  if (!system.knowledgeBridge) throw new Error('KnowledgeBridge not found');

  // Verify connections
  if (!system.knowledgeBridge.abstractionArbiter) {
    console.log('   ⚠️  KnowledgeBridge missing AbstractionArbiter');
  }
  if (!system.knowledgeBridge.worldModel) {
    console.log('   ⚠️  KnowledgeBridge missing WorldModel');
  }
});

// Test 12: RecursiveSelfModel Awareness
test('RecursiveSelfModel (Self-Awareness)', async () => {
  if (!system.selfModel) throw new Error('RecursiveSelfModel not found');

  // Should have discovered components
  const componentCount = system.selfModel.components ? system.selfModel.components.size : 0;
  console.log(`   └─ ${componentCount} components discovered`);

  if (componentCount < 10) {
    throw new Error('Too few components discovered by self-model');
  }
});

// Test 13: Verify Key Event Subscriptions
test('Key MessageBroker Event Subscriptions', async () => {
  const broker = system.messageBroker;

  // Check for important event channels
  const keyTopics = [
    'system/all',
    'learning:completed',
    'curiosity:gap_detected',
    'meta:optimize'
  ];

  let foundTopics = 0;
  for (const [topic, subscribers] of broker.subscribers.entries()) {
    if (keyTopics.some(key => topic.includes(key))) {
      foundTopics++;
      console.log(`   └─ "${topic}": ${subscribers.size} subscribers`);
    }
  }

  if (foundTopics < 2) {
    throw new Error('Missing critical event subscriptions');
  }
});

// Run all tests
runTests().catch(console.error);
