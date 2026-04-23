import { RecursiveSelfModel } from './arbiters/RecursiveSelfModel.js';
import { CuriosityEngine } from './arbiters/CuriosityEngine.js';

async function testCuriosity() {
  console.log('--- 🧠 STARTING CURIOSITY GROUNDING TEST ---');

  // 1. Setup Mock System
  const system = {
    fragmentRegistry: { listFragments: () => [] }
  };

  // 2. Init Self Model
  const sm = new RecursiveSelfModel();
  await sm.initialize(system);

  // 3. Init Curiosity Engine
  const ce = new CuriosityEngine({ selfModel: sm });
  await ce.initialize();

  // 4. Force Gap Detection
  console.log('[TEST] Detecting Knowledge Gaps...');
  const gaps = await ce.detectKnowledgeGaps();
  console.log(`[RESULT] Gaps found: ${gaps.map(g => g.gap).join(', ')}`);

  // 5. Generate Questions
  console.log('[TEST] Generating Curious Questions...');
  const questions = await ce.generateCuriousQuestions(5);
  
  console.log('\n--- 📊 NEW CURIOSITY QUEUE ---');
  questions.forEach((q, i) => {
    console.log(`${i+1}. [${q.type}] ${q.question}`);
  });

  if (gaps.some(g => g.gap === 'physical_embodiment')) {
      console.log('\n❌ FAILED: Physical Embodiment is still flagged as a gap.');
  } else {
      console.log('\n✅ SUCCESS: Physical Embodiment gap has been cleared.');
  }

  process.exit(0);
}

testCuriosity();
