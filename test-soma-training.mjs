/**
 * test-soma-training.mjs
 *
 * Quick test to verify the training pipeline works
 * Tests loading experiences and preparing them for training
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing SOMA Training Pipeline');
console.log('=' .repeat(80));

async function testExperienceLoading() {
  console.log('\n📊 Test 1: Check experience files');

  const experiencesDir = path.join(__dirname, '.soma', 'experiences');

  try {
    const files = await fs.readdir(experiencesDir);
    const experienceFiles = files.filter(f => f.startsWith('experiences_') && f.endsWith('.json'));

    console.log(`✅ Found ${experienceFiles.length} experience files`);

    if (experienceFiles.length === 0) {
      console.log('⚠️  No experience files found - SOMA needs to run first!');
      return false;
    }

    // Read one file to check format
    const sampleFile = path.join(experiencesDir, experienceFiles[0]);
    const content = await fs.readFile(sampleFile, 'utf8');
    const data = JSON.parse(content);

    const experiences = Array.isArray(data) ? data : (data.experiences || []);
    console.log(`✅ Sample file contains ${experiences.length} experiences`);

    if (experiences.length > 0) {
      const sample = experiences[0];
      console.log('📝 Sample experience structure:');
      console.log('   - state:', typeof sample.state);
      console.log('   - action:', typeof sample.action);
      console.log('   - agent:', sample.agent || 'unknown');
      console.log('   - reward:', sample.reward !== undefined ? sample.reward : 'N/A');
      console.log('   - category:', sample.category || 'unknown');
    }

    return true;

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function testPythonDependencies() {
  console.log('\n🐍 Test 2: Check Python dependencies');

  return new Promise((resolve) => {
    const python = spawn('python', ['-c', `
import sys
try:
    import torch
    import transformers
    import peft
    print('✅ All dependencies installed')
    print(f'   torch: {torch.__version__}')
    print(f'   transformers: {transformers.__version__}')
    print(f'   CUDA available: {torch.cuda.is_available()}')
    sys.exit(0)
except ImportError as e:
    print(f'❌ Missing dependency: {e}')
    print('   Run: pip install -r requirements-training.txt')
    sys.exit(1)
`]);

    python.stdout.on('data', (data) => {
      console.log(data.toString().trim());
    });

    python.stderr.on('data', (data) => {
      console.log(data.toString().trim());
    });

    python.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function testTrainingScript() {
  console.log('\n🔧 Test 3: Verify training script exists');

  const scriptPath = path.join(__dirname, 'train-soma-llama.py');

  try {
    await fs.access(scriptPath);
    console.log(`✅ Training script found: ${scriptPath}`);

    // Check if script is valid Python
    return new Promise((resolve) => {
      const python = spawn('python', [scriptPath, '--help']);

      let output = '';
      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0 && output.includes('usage')) {
          console.log('✅ Training script is valid and ready to use');
          resolve(true);
        } else {
          console.log('❌ Training script has errors');
          resolve(false);
        }
      });
    });

  } catch (error) {
    console.log(`❌ Training script not found: ${error.message}`);
    return false;
  }
}

async function runTests() {
  const test1 = await testExperienceLoading();
  const test2 = await testPythonDependencies();
  const test3 = await testTrainingScript();

  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Results:');
  console.log(`   Experience Files: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Python Dependencies: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Training Script: ${test3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(80));

  if (test1 && test2 && test3) {
    console.log('\n🎉 All tests passed! Ready for 4 AM training.');
    console.log('\n📝 Next steps:');
    console.log('   1. Install dependencies: pip install -r requirements-training.txt');
    console.log('   2. Run training manually: python train-soma-llama.py');
    console.log('   3. Or wait for 4 AM automatic training session');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix issues before training.');

    if (!test2) {
      console.log('\n💡 To install Python dependencies:');
      console.log('   pip install -r requirements-training.txt');
    }
  }
}

runTests().catch(console.error);
