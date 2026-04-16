
import { MetaLearningEngine } from './arbiters/MetaLearningEngine.js';
import ExperienceReplayBuffer from './arbiters/ExperienceReplayBuffer.js';

// Mock BaseArbiter if needed, or rely on the real one if environment allows
// Since ExperienceReplayBuffer imports BaseArbiter from ../core/BaseArbiter.cjs, 
// and we are running from root, the relative path inside ExperienceReplayBuffer.js 
// (which is in arbiters/) will be ../core/BaseArbiter.cjs.
// This resolves to ./core/BaseArbiter.cjs from root. Correct.

async function test() {
  console.log('🧪 Testing MetaLearningEngine fix...');

  try {
    // 1. Initialize Buffer
    const buffer = new ExperienceReplayBuffer({ maxSize: 100 });
    await buffer.initialize();

    console.log(`✅ Buffer initialized. Size: ${buffer.size()}`); // Should be 0

    // 2. Add dummy experience
    buffer.addExperience({
      state: { foo: 'bar' },
      action: 'test_action',
      agent: 'test_agent',
      outcome: 'success',
      reward: 1.0
    });

    console.log(`✅ Experience added. Size: ${buffer.size()}`); // Should be 1

    // 3. Initialize MetaLearningEngine with buffer
    const metaEngine = new MetaLearningEngine({
      optimizationInterval: 1, // Optimize frequently for test
      minExperiencesForOptimization: 0 // Allow optimization immediately
    });

    await metaEngine.initialize({
      experienceBuffer: buffer
    });

    console.log('✅ MetaLearningEngine initialized');

    // 4. Trigger optimization manually (which caused the crash)
    // The crash happened in _optimizeExploration which is called by optimizeMetaParameters
    console.log('🔄 Triggering optimization...');
    await metaEngine.optimizeMetaParameters();

    console.log('✅ Optimization completed without crash!');
    console.log('🎉 Fix verified!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
