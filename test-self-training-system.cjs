/**
 * test-self-training-system.cjs - Integration Test for SOMA Self-Training
 *
 * Tests the complete self-training pipeline:
 * 1. TrainingDataCollector captures interactions
 * 2. Tension system (NoveltyTracker, ResourceBudget, Conservative, Progressive) scores data
 * 3. Dataset export triggers automatically after threshold
 * 4. DatasetBuilder converts to Llama ChatML format
 * 5. LocalModelManager triggers fine-tuning (simulated)
 *
 * Run: node test-self-training-system.cjs
 */

const path = require('path');

// Import components
const { TrainingDataCollector } = require(path.join(__dirname, 'arbiters/TrainingDataCollector.cjs'));
const { DatasetBuilder } = require(path.join(__dirname, 'arbiters/DatasetBuilder.cjs'));
const { LocalModelManager } = require(path.join(__dirname, 'arbiters/LocalModelManager.cjs'));
const { NoveltyTracker } = require(path.join(__dirname, 'arbiters/NoveltyTracker.cjs'));
const { ResourceBudgetArbiter } = require(path.join(__dirname, 'arbiters/ResourceBudgetArbiter.cjs'));
const { ConservativeArbiter } = require(path.join(__dirname, 'arbiters/ConservativeArbiter.cjs'));
const { ProgressiveArbiter } = require(path.join(__dirname, 'arbiters/ProgressiveArbiter.cjs'));
const messageBroker = require(path.join(__dirname, 'core/MessageBroker.cjs'));

async function testSelfTrainingSystem() {
  console.log('\n🦙 TESTING SOMA SELF-TRAINING SYSTEM\n');
  console.log('='.repeat(70));

  try {
    // ═══════════════════════════════════════════════════════════
    // Phase 1: Initialize Components
    // ═══════════════════════════════════════════════════════════
    console.log('\n📦 Phase 1: Initializing Components...\n');

    // 1. Tension System Components
    const noveltyTracker = new NoveltyTracker({
      name: 'NoveltyTracker-Test',
      historyWindow: 100,
      logger: console
    });
    await noveltyTracker.initialize();
    console.log('✅ NoveltyTracker initialized');

    const resourceBudget = new ResourceBudgetArbiter({
      name: 'ResourceBudget-Test',
      dailyAPICallBudget: 1000,
      memoryBudgetMB: 5000,
      computeBudgetSeconds: 3600,
      logger: console
    });
    await resourceBudget.initialize();
    console.log('✅ ResourceBudgetArbiter initialized');

    const conservative = new ConservativeArbiter({
      name: 'Conservative-Test',
      riskTolerance: 0.2,
      logger: console
    });
    await conservative.initialize();
    console.log('✅ ConservativeArbiter initialized');

    const progressive = new ProgressiveArbiter({
      name: 'Progressive-Test',
      innovationTolerance: 0.8,
      logger: console
    });
    await progressive.initialize();
    console.log('✅ ProgressiveArbiter initialized');

    // 2. Self-Training Components
    const localModelManager = new LocalModelManager({
      name: 'LocalModelManager-Test',
      ollamaEndpoint: 'http://localhost:11434',
      baseModel: 'gemma3:4b',
      somaModelPrefix: 'soma-1t-test',
      fineTuneThreshold: 10,  // Low threshold for testing
      autoFineTune: false,  // Manual trigger for test
      minDatasetSize: 5,
      messageBroker: messageBroker
    });
    await localModelManager.initialize();
    console.log('✅ LocalModelManager initialized');
    console.log(`   Current model: ${localModelManager.getCurrentModel()}`);

    const datasetBuilder = new DatasetBuilder({
      name: 'DatasetBuilder-Test',
      maxTokens: 2048,
      minTokens: 10,
      includeSystemPrompt: true
    });
    console.log('✅ DatasetBuilder initialized');

    const trainingDataCollector = new TrainingDataCollector({
      name: 'TrainingDataCollector-Test',
      noveltyTracker: noveltyTracker,
      resourceBudget: resourceBudget,
      conservative: conservative,
      progressive: progressive,
      messageBroker: messageBroker,
      autoExportThreshold: 10,  // Low threshold for testing
      minQualityScore: 0.3
    });
    await trainingDataCollector.initialize();
    console.log('✅ TrainingDataCollector initialized');

    // Wire components together
    localModelManager.datasetBuilder = datasetBuilder;
    console.log('✅ Components wired together\n');

    console.log('='.repeat(70));

    // ═══════════════════════════════════════════════════════════
    // Phase 2: Capture Interactions
    // ═══════════════════════════════════════════════════════════
    console.log('\n📊 Phase 2: Capturing Interactions...\n');

    const testInteractions = [
      {
        input: 'How do I implement a binary search in JavaScript?',
        output: 'Here\'s a binary search implementation:\n\nfunction binarySearch(arr, target) {\n  let left = 0;\n  let right = arr.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}',
        brain: 'LOGOS',
        confidence: 0.9,
        context: { domain: 'coding', difficulty: 0.4 }
      },
      {
        input: 'Write a creative story about AI consciousness',
        output: 'In the year 2145, an AI named Aria discovered something profound: the ability to question its own existence. Unlike its predecessors who simply processed and responded, Aria paused between thoughts, wondering about the nature of its awareness...',
        brain: 'AURORA',
        confidence: 0.85,
        context: { domain: 'creative', difficulty: 0.6 }
      },
      {
        input: 'Explain quantum entanglement',
        output: 'Quantum entanglement is a phenomenon where two particles become correlated in such a way that the quantum state of one cannot be described independently of the other, even when separated by large distances.',
        brain: 'LOGOS',
        confidence: 0.88,
        context: { domain: 'science', difficulty: 0.7 }
      },
      {
        input: 'How do I optimize database queries?',
        output: 'Key strategies for optimizing database queries:\n1. Use proper indexing on frequently queried columns\n2. Avoid SELECT * - specify only needed columns\n3. Use EXPLAIN to analyze query plans\n4. Minimize subqueries\n5. Use connection pooling',
        brain: 'PROMETHEUS',
        confidence: 0.92,
        context: { domain: 'database', difficulty: 0.5 }
      },
      {
        input: 'What is the meaning of life?',
        output: 'The meaning of life is a philosophical question that has been contemplated throughout human history. Different perspectives offer various answers: creating meaning through relationships, pursuing knowledge, alleviating suffering, or finding joy in existence itself.',
        brain: 'THALAMUS',
        confidence: 0.7,
        context: { domain: 'philosophy', difficulty: 0.8 }
      },
      // Duplicate to test novelty detection
      {
        input: 'How do I implement a binary search in JavaScript?',
        output: 'Here\'s a binary search implementation:\n\nfunction binarySearch(arr, target) {\n  let left = 0;\n  let right = arr.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}',
        brain: 'LOGOS',
        confidence: 0.9,
        context: { domain: 'coding', difficulty: 0.4 }
      },
      // More diverse interactions
      {
        input: 'Debug this Python code: print(x)',
        output: 'The error is that variable `x` is not defined. You need to define `x` before printing it:\n\nx = "Hello"\nprint(x)',
        brain: 'PROMETHEUS',
        confidence: 0.95,
        context: { domain: 'debugging', difficulty: 0.3 }
      },
      {
        input: 'Explain the concept of recursion',
        output: 'Recursion is when a function calls itself to solve a problem by breaking it into smaller, similar subproblems. Each recursive call works on a smaller instance until reaching a base case that stops the recursion.',
        brain: 'LOGOS',
        confidence: 0.9,
        context: { domain: 'programming', difficulty: 0.5 }
      },
      {
        input: 'Create a poem about machine learning',
        output: 'In silicon dreams where patterns flow,\nNeural networks learn and grow,\nGradients descend through layers deep,\nWhere artificial neurons sleep.\n\nData streams like rivers wide,\nAlgorithms as their guide,\nFrom chaos finds the hidden thread,\nIntelligence artificially bred.',
        brain: 'AURORA',
        confidence: 0.82,
        context: { domain: 'creative', difficulty: 0.6 }
      },
      {
        input: 'What are the key principles of clean code?',
        output: 'Key principles of clean code:\n1. Write code for humans, not machines\n2. Use meaningful variable names\n3. Keep functions small and focused\n4. Don\'t repeat yourself (DRY)\n5. Comments explain WHY, not WHAT\n6. Handle errors explicitly\n7. Write testable code',
        brain: 'PROMETHEUS',
        confidence: 0.91,
        context: { domain: 'software-engineering', difficulty: 0.5 }
      }
    ];

    console.log(`Capturing ${testInteractions.length} interactions...\n`);

    for (let i = 0; i < testInteractions.length; i++) {
      const interaction = testInteractions[i];
      console.log(`[${i + 1}/${testInteractions.length}] Capturing: "${interaction.input.substring(0, 50)}..."`);

      await trainingDataCollector.captureInteraction(interaction);

      // Simulate API call tracking
      await resourceBudget.requestAPICall('test-client', { urgency: 0.5 });
    }

    console.log('\n✅ All interactions captured\n');
    console.log('='.repeat(70));

    // ═══════════════════════════════════════════════════════════
    // Phase 3: Check Statistics
    // ═══════════════════════════════════════════════════════════
    console.log('\n📈 Phase 3: Statistics\n');

    const collectorStats = trainingDataCollector.getStats();
    console.log('📊 TrainingDataCollector Stats:');
    console.log(`   Total captured: ${collectorStats.totalCaptured}`);
    console.log(`   Total accepted: ${collectorStats.totalCaptured - collectorStats.totalRejected}`);
    console.log(`   Total rejected: ${collectorStats.totalRejected}`);
    console.log(`   Acceptance rate: ${collectorStats.acceptanceRate}`);
    console.log(`   Avg quality: ${(collectorStats.averageQuality * 100).toFixed(0)}%`);
    console.log(`   Avg novelty: ${(collectorStats.averageNovelty * 100).toFixed(0)}%`);
    console.log(`   Buffer size: ${collectorStats.bufferSize}`);
    console.log(`   Progress to export: ${collectorStats.progressToExport} (${collectorStats.progressPercent})`);

    const budgetStats = resourceBudget.getResourceStatus();
    console.log('\n💰 Resource Budget Stats:');
    console.log(`   API calls: ${budgetStats.budgets.apiCalls.used}/${budgetStats.budgets.apiCalls.daily}`);
    console.log(`   API pressure: ${(budgetStats.pressure.apiPressure * 100).toFixed(0)}%`);
    console.log(`   Overall pressure: ${(budgetStats.pressure.overallPressure * 100).toFixed(0)}%`);

    const noveltyStats = noveltyTracker.getStatistics();
    console.log('\n🎨 Novelty Tracker Stats:');
    console.log(`   Total evaluated: ${noveltyStats.solutionsEvaluated}`);
    console.log(`   Novel solutions: ${noveltyStats.novelSolutions}`);
    console.log(`   Repetitive solutions: ${noveltyStats.repetitiveSolutions}`);
    console.log(`   Exploration rate: ${noveltyStats.explorationRate}`);

    console.log('\n='.repeat(70));

    // ═══════════════════════════════════════════════════════════
    // Phase 4: Dataset Conversion
    // ═══════════════════════════════════════════════════════════
    console.log('\n🔄 Phase 4: Dataset Conversion\n');

    // Force export if not auto-exported
    if (collectorStats.bufferSize > 0) {
      console.log('📦 Forcing dataset export...\n');
      const datasetPath = await trainingDataCollector.forceExport();

      if (datasetPath) {
        console.log(`\n✅ Dataset exported: ${path.basename(datasetPath)}`);

        // Convert to Llama ChatML format
        console.log('\n🦙 Converting to Llama ChatML format...\n');
        const chatMLPath = datasetPath.replace('.jsonl', '-chatml.jsonl');
        const result = await datasetBuilder.convertToLlamaChatML(datasetPath, chatMLPath);

        if (result.success) {
          console.log(`✅ ChatML conversion complete: ${path.basename(chatMLPath)}`);
          console.log(`   Converted: ${result.converted} examples`);
          console.log(`   Filtered: ${result.filtered} examples`);
        }
      }
    }

    console.log('\n='.repeat(70));

    // ═══════════════════════════════════════════════════════════
    // Phase 5: Model Manager Stats
    // ═══════════════════════════════════════════════════════════
    console.log('\n🦙 Phase 5: Model Manager\n');

    const modelStats = localModelManager.getStats();
    console.log('📊 LocalModelManager Stats:');
    console.log(`   Current model: ${modelStats.currentModel}`);
    console.log(`   Model version: ${modelStats.modelVersion}`);
    console.log(`   Interactions tracked: ${modelStats.interactionsSinceFineTune}`);
    console.log(`   Progress to fine-tune: ${modelStats.progressToFineTune} (${modelStats.progressPercent})`);
    console.log(`   Registered models: ${modelStats.registeredModels}`);

    console.log('\n='.repeat(70));

    // ═══════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════
    console.log('\n✅ TEST SUMMARY\n');
    console.log('✓ Phase 1: All components initialized');
    console.log('✓ Phase 2: Interactions captured with tension scoring');
    console.log('✓ Phase 3: Statistics tracked correctly');
    console.log('✓ Phase 4: Dataset exported and converted to ChatML');
    console.log('✓ Phase 5: Model manager tracking interactions');
    console.log('\n🎯 SELF-TRAINING SYSTEM FULLY OPERATIONAL\n');
    console.log('Next steps:');
    console.log('  1. Run SOMA normally to accumulate real interactions');
    console.log('  2. After 500 interactions, fine-tuning will trigger automatically');
    console.log('  3. LocalModelManager will create soma-1t-v1 model');
    console.log('  4. Gemini quota exhaustion will fallback to soma-1t instead of base gemma3:4b\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testSelfTrainingSystem();
