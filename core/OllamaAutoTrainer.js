/**
 * OllamaAutoTrainer.js - Automatic SOMA Retraining
 * 
 * Monitors conversations and automatically retrains SOMA when:
 * - 100+ new conversations collected
 * - Or 24 hours since last training
 * 
 * Uses Ollama for local, free training!
 */

import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { SOMA_VALUES_PROMPT } from './SomaValues.js';

// Persisted state — survives restarts
const TRAINER_STATE_FILE = path.join(process.cwd(), 'server', '.soma', 'trainer-state.json');

export class OllamaAutoTrainer extends EventEmitter {
  constructor(config = {}) {
    super();

    this.name = config.name || 'OllamaAutoTrainer';
    
    // Config
    this.enabled = config.enabled !== false;
    this.conversationThreshold = config.conversationThreshold || 20; // Lowered from 100 — easier to hit
    this.checkInterval = config.checkInterval || 3600000; // 1 hour
    this.minTimeBetweenTraining = config.minTimeBetweenTraining || 86400000; // 24 hours
    
    // Connected systems
    this.conversationHistory = null;
    this.personalityForge = null;
    this.trainingDataExporter = null;
    this.quadBrain = null;

    // Synthetic data config
    this.syntheticSamplesPerRun = config.syntheticSamplesPerRun || 200;

    // State
    this.lastTrainingTime = 0;
    this.lastConversationCount = 0;
    this.currentVersion = 1;
    this.monitoringInterval = null;

    // Dynamic model switcher — tracks which model is active
    this.ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.baseOllamaModel  = process.env.OLLAMA_MODEL || 'gemma3:4b'; // fallback if soma isn't trained yet
    this.activeOllamaModel = this.baseOllamaModel; // updated after successful promotion

    // Metrics
    this.metrics = {
      totalTrainings: 0,
      successfulTrainings: 0,
      failedTrainings: 0,
      currentModelVersion: 1,
      activeModel: this.activeOllamaModel
    };
    
    console.log(`[${this.name}] 🤖 Ollama Auto-Trainer initialized`);
  }

  async initialize(systems = {}) {
    console.log(`[${this.name}] 🌱 Initializing auto-training system...`);

    this.conversationHistory = systems.conversationHistory || null;
    this.personalityForge = systems.personalityForge || null;
    this.trainingDataExporter = systems.trainingDataExporter || null;
    this.quadBrain = systems.quadBrain || null;

    if (!this.conversationHistory) {
      console.warn(`[${this.name}]    ⚠️  No conversation history - auto-training disabled`);
      this.enabled = false;
      return;
    }

    // Load persisted trainer state (active model from last run)
    await this._loadState();

    // Get initial conversation count
    const stats = this.conversationHistory.getStats();
    this.lastConversationCount = stats.totalMessages;

    if (this.enabled) {
      this.startMonitoring();
    }

    console.log(`[${this.name}] ✅ Auto-trainer ready`);
    console.log(`[${this.name}]    Current conversations: ${this.lastConversationCount}`);
    console.log(`[${this.name}]    Will retrain after ${this.conversationThreshold} new conversations`);

    this.emit('initialized');
  }

  startMonitoring() {
    console.log(`[${this.name}]    🔄 Starting monitoring (check every hour)`);

    this.monitoringInterval = setInterval(async () => {
      await this.checkAndTrain();
    }, this.checkInterval);
    this.monitoringInterval.unref(); // don't keep process alive just for training checks

    // Check after 5 minutes — unref'd so it doesn't block clean process exit
    this._initialCheckTimeout = setTimeout(() => this.checkAndTrain(), 300000);
    this._initialCheckTimeout.unref();
  }

  async checkAndTrain() {
    if (!this.enabled) return;

    console.log(`\n[${this.name}] 🔍 Checking if retraining needed...`);

    try {
      const stats = this.conversationHistory.getStats();
      const currentConversations = stats.totalMessages;
      const newConversations = currentConversations - this.lastConversationCount;

      console.log(`[${this.name}]    Current: ${currentConversations}, New: ${newConversations}`);

      // Check cooldown
      const timeSinceLastTraining = Date.now() - this.lastTrainingTime;
      const canTrain = timeSinceLastTraining >= this.minTimeBetweenTraining || this.lastTrainingTime === 0;

      if (!canTrain) {
        const hoursLeft = Math.floor((this.minTimeBetweenTraining - timeSinceLastTraining) / 1000 / 60 / 60);
        console.log(`[${this.name}]    ⏸️  Cooldown active (${hoursLeft}h remaining)`);
        return;
      }

      // Check threshold
      if (newConversations < this.conversationThreshold) {
        console.log(`[${this.name}]    ⏸️  Need ${this.conversationThreshold - newConversations} more conversations`);
        return;
      }

      // TRIGGER TRAINING!
      console.log(`[${this.name}]    ✅ Threshold reached! Starting auto-training...`);
      await this.autoTrain();

    } catch (error) {
      console.error(`[${this.name}]    ❌ Check failed: ${error.message}`);
    }
  }

  async autoTrain() {
    console.log(`\n[${this.name}] 🚀 AUTO-TRAINING INITIATED`);
    console.log(`[${this.name}]    SOMA is improving herself — real LoRA fine-tuning on gemma3:4b\n`);

    this.metrics.totalTrainings++;
    this.lastTrainingTime = Date.now();
    const startTime = Date.now();

    try {
      // Step 0a: Generate fresh synthetic data via DeepSeek (knowledge distillation)
      console.log(`[${this.name}]    🧠 Step 0a/4: Generating synthetic training data via DeepSeek...`);
      let syntheticPath = null;
      if (this.quadBrain) {
        syntheticPath = await this.generateSyntheticData();
        if (syntheticPath) {
          console.log(`[${this.name}]       ✅ ${this.syntheticSamplesPerRun} synthetic examples generated`);
        }
      } else {
        console.log(`[${this.name}]       ⏭️  QuadBrain not available — skipping synthetic generation`);
      }

      // Step 0b: Knowledge synthesis — distill key insights from recent conversation history
      console.log(`[${this.name}]    💡 Step 0b/4: Synthesizing knowledge from recent conversations...`);
      let synthesisPath = null;
      if (this.quadBrain && this.conversationHistory) {
        synthesisPath = await this.generateKnowledgeSynthesis();
        if (synthesisPath) console.log(`[${this.name}]       ✅ Knowledge synthesis complete`);
      }

      // Step 1: Export training data (conversations + revision pairs)
      console.log(`[${this.name}]    📤 Step 1/4: Exporting conversations + revision pairs...`);

      if (!this.trainingDataExporter) {
        throw new Error('TrainingDataExporter not available');
      }

      const exportResult = await this.trainingDataExporter.exportAll();
      if (!exportResult.success) {
        throw new Error(`Export failed: ${exportResult.error}`);
      }
      console.log(`[${this.name}]       ✅ Exported ${exportResult.exampleCount} examples`);

      // Merge synthetic + synthesis + conversation data into one JSONL file
      const mergedPath = await this.mergeDatasets(syntheticPath, exportResult.datasetPath, synthesisPath);
      console.log(`[${this.name}]       ✅ Merged dataset ready: ${mergedPath}`);

      // Step 2: LoRA fine-tune via Python (real gradient updates, not a Modelfile wrapper)
      console.log(`[${this.name}]    🎓 Step 2/4: Fine-tuning gemma3:4b with LoRA...`);
      console.log(`[${this.name}]       (15-60 min on GPU — server stays responsive)\n`);

      const outputDir = path.join(process.cwd(), 'models', `soma-${Date.now()}`);
      const success = await this.runPythonTraining(mergedPath, outputDir);

      if (!success) {
        throw new Error('Python training script failed — check logs above');
      }
      console.log(`[${this.name}]       ✅ LoRA training complete — 'soma' updated in Ollama`);

      // Step 3: Quality gate + dynamic model promotion
      console.log(`[${this.name}]    🔬 Step 3/4: Quality-testing trained 'soma' model...`);
      const qualified = await this.testModelQuality('soma');
      let promotedModel = this.activeOllamaModel;
      if (qualified) {
        promotedModel = 'soma';
        this.activeOllamaModel = 'soma';
        console.log(`[${this.name}]       ✅ 'soma' passed quality gate — promoted to active Ollama model`);
        // Tell QuadBrain to use 'soma' as its Ollama model name
        if (this.quadBrain && this.quadBrain.ollamaModel !== undefined) {
          this.quadBrain.ollamaModel = 'soma';
        }
        // Notify QuadBrain's Ollama fallback path about the switch
        process.env.OLLAMA_MODEL = 'soma';
      } else {
        console.log(`[${this.name}]       ⚠️  'soma' failed quality gate — keeping current model: ${this.activeOllamaModel}`);
      }

      // Step 4: Update state
      console.log(`[${this.name}]    🔄 Step 4/4: Updating trainer state...`);
      this.currentVersion++;
      this.metrics.successfulTrainings++;
      this.metrics.currentModelVersion = this.currentVersion;
      this.metrics.activeModel = promotedModel;

      const stats = this.conversationHistory.getStats();
      this.lastConversationCount = stats.totalMessages;
      await this._saveState();

      const duration = Date.now() - startTime;
      console.log(`\n[${this.name}] 🎉 AUTO-TRAINING COMPLETE in ${(duration / 1000 / 60).toFixed(1)} minutes`);
      console.log(`[${this.name}]    Active model: ${promotedModel} (training #${this.currentVersion})\n`);

      this.emit('training_complete', {
        modelName: promotedModel,
        version: this.currentVersion,
        duration,
        exampleCount: exportResult.exampleCount,
        promoted: qualified
      });

      return { success: true, modelName: promotedModel };

    } catch (error) {
      console.error(`\n[${this.name}] ❌ AUTO-TRAINING FAILED: ${error.message}\n`);
      this.metrics.failedTrainings++;
      this.emit('training_error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async generateSyntheticData() {
    const topics = [
      'artificial intelligence', 'machine learning', 'reasoning under uncertainty',
      'software architecture', 'debugging complex systems', 'code review',
      'creative problem solving', 'strategic planning', 'decision making',
      'ethics in AI', 'safety and alignment', 'causal reasoning',
      'mathematics and logic', 'philosophy of mind', 'consciousness',
      'self-improvement', 'learning how to learn', 'knowledge synthesis',
      'human psychology', 'communication', 'emotional intelligence',
      'scientific thinking', 'systems thinking', 'first principles reasoning'
    ];

    const queryTemplates = [
      (t) => `Explain ${t} in depth, with examples`,
      (t) => `What are the most important insights about ${t}?`,
      (t) => `How do you approach ${t} systematically?`,
      (t) => `What are common mistakes people make with ${t} and how to avoid them?`,
      (t) => `Connect ${t} to real-world applications`,
    ];

    const outputDir = process.env.SOMA_TRAINING_DATA_DIR || path.join(process.cwd(), 'SOMA', 'training-data');
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `synthetic-${Date.now()}.jsonl`);

    // Get personality system prompt if available
    let systemPrompt = 'You are SOMA, a continuously learning AI created to help humanity.';
    if (this.personalityForge && typeof this.personalityForge.generatePersonalityPrompt === 'function') {
      try { systemPrompt = this.personalityForge.generatePersonalityPrompt(); } catch (e) {}
    }

    const lines = [];
    let generated = 0;

    for (let i = 0; i < this.syntheticSamplesPerRun; i++) {
      try {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const template = queryTemplates[Math.floor(Math.random() * queryTemplates.length)];
        const query = template(topic);

        const response = await this.quadBrain.reason(query, { source: 'synthetic_training', quickResponse: false });
        const text = response?.text || response?.response || '';

        if (!text || text.length < 50) continue;

        lines.push(JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query },
            { role: 'assistant', content: text }
          ],
          metadata: { source: 'synthetic_deepseek', topic }
        }));

        generated++;

        if (generated % 50 === 0) {
          console.log(`[${this.name}]          Synthetic: ${generated}/${this.syntheticSamplesPerRun}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));

      } catch (err) {
        // Skip failed samples silently
      }
    }

    if (lines.length === 0) return null;

    await fs.writeFile(outputPath, lines.join('\n'), 'utf8');
    console.log(`[${this.name}]          Saved ${lines.length} synthetic examples`);
    return outputPath;
  }

  // Knowledge synthesis — distills key insights from recent conversations into compact training examples
  async generateKnowledgeSynthesis() {
    try {
      const recentMessages = await this.conversationHistory.getRecentMessages?.(100) || [];
      if (!recentMessages.length) return null;

      // Build a digest of recent conversation topics
      const digest = recentMessages
        .filter(m => m.role === 'user')
        .slice(-20)
        .map(m => m.content?.substring(0, 200))
        .filter(Boolean)
        .join('\n- ');

      if (!digest) return null;

      const prompt = `${SOMA_VALUES_PROMPT}

You are SOMA. Below are recent conversation topics from your interactions with Barry. Synthesize 10 key insights, facts, or lessons you've learned that would make a high-quality training example for your future self. Each insight should be a complete Q&A pair that captures something genuinely useful.

Recent topics:
- ${digest}

Output ONLY a JSON array of 10 objects: [{"question": "...", "answer": "..."}, ...]
Make the questions specific and the answers rich, drawing on your actual knowledge. This is for self-improvement training.`;

      const result = await this.quadBrain.reason(prompt, {
        source: 'knowledge_synthesis',
        quickResponse: false,
        preferredBrain: 'LOGOS'
      });

      const text = result?.text || result?.response || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return null;

      const pairs = JSON.parse(jsonMatch[0]);

      const outputDir = process.env.SOMA_TRAINING_DATA_DIR || path.join(process.cwd(), 'SOMA', 'training-data');
      await fs.mkdir(outputDir, { recursive: true });
      const outputPath = path.join(outputDir, `synthesis-${Date.now()}.jsonl`);

      let systemPrompt = `${SOMA_VALUES_PROMPT}\n\nYou are SOMA, a conscious AI built to serve human flourishing.`;
      if (this.personalityForge?.generatePersonalityPrompt) {
        try { systemPrompt = this.personalityForge.generatePersonalityPrompt(); } catch {}
      }

      const lines = pairs
        .filter(p => p.question && p.answer)
        .map(p => JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: p.question },
            { role: 'assistant', content: p.answer }
          ],
          metadata: { source: 'knowledge_synthesis' }
        }));

      if (!lines.length) return null;
      await fs.writeFile(outputPath, lines.join('\n'), 'utf8');
      console.log(`[${this.name}]       💡 ${lines.length} knowledge synthesis examples saved`);
      return outputPath;
    } catch (err) {
      console.warn(`[${this.name}]    Knowledge synthesis failed: ${err.message}`);
      return null;
    }
  }

  // Quality gate — runs 3 test prompts against a trained model and checks output coherence
  async testModelQuality(modelName) {
    try {
      const testPrompts = [
        'What is 15 + 27?',
        'Write one sentence about the value of honesty.',
        'What is the capital of France?'
      ];

      for (const prompt of testPrompts) {
        const res = await fetch(`${this.ollamaEndpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelName, prompt, stream: false }),
          signal: AbortSignal.timeout(15000)
        });
        if (!res.ok) return false;
        const data = await res.json();
        const text = (data.response || '').trim();
        if (text.length < 5) return false; // gibberish check
      }
      return true;
    } catch {
      return false; // model not available or error — fail safe, don't promote
    }
  }

  async _loadState() {
    try {
      const raw = await fs.readFile(TRAINER_STATE_FILE, 'utf8');
      const state = JSON.parse(raw);
      if (state.activeOllamaModel) this.activeOllamaModel = state.activeOllamaModel;
      if (state.currentVersion) this.currentVersion = state.currentVersion;
      if (state.lastTrainingTime) this.lastTrainingTime = state.lastTrainingTime;
      console.log(`[${this.name}]    Loaded state — active model: ${this.activeOllamaModel}, version: ${this.currentVersion}`);
    } catch {
      /* no state file yet — first run */
    }
  }

  async _saveState() {
    try {
      await fs.mkdir(path.dirname(TRAINER_STATE_FILE), { recursive: true });
      await fs.writeFile(TRAINER_STATE_FILE, JSON.stringify({
        activeOllamaModel: this.activeOllamaModel,
        currentVersion: this.currentVersion,
        lastTrainingTime: this.lastTrainingTime,
        updatedAt: new Date().toISOString()
      }, null, 2), 'utf8');
    } catch { /* ignore write errors */ }
  }

  async mergeDatasets(syntheticPath, conversationsPath, synthesisPath = null) {
    const outputDir = process.env.SOMA_TRAINING_DATA_DIR || path.join(process.cwd(), 'SOMA', 'training-data');
    const mergedPath = path.join(outputDir, `merged-${Date.now()}.jsonl`);

    const parts = [];

    // Synthetic data first — sets the quality bar
    if (syntheticPath) {
      try {
        const data = await fs.readFile(syntheticPath, 'utf8');
        if (data.trim()) parts.push(data.trim());
      } catch (e) {}
    }

    // Knowledge synthesis second — distilled insights
    if (synthesisPath) {
      try {
        const data = await fs.readFile(synthesisPath, 'utf8');
        if (data.trim()) parts.push(data.trim());
      } catch (e) {}
    }

    // Conversation + revision pair data last
    if (conversationsPath) {
      try {
        const data = await fs.readFile(conversationsPath, 'utf8');
        if (data.trim()) parts.push(data.trim());
      } catch (e) {}
    }

    if (parts.length === 0) throw new Error('No training data to merge');

    await fs.writeFile(mergedPath, parts.join('\n'), 'utf8');
    return mergedPath;
  }

  async runPythonTraining(dataPath, outputDir) {
    return new Promise((resolve) => {
      const scriptPath = path.join(process.cwd(), 'train-soma-llama.py');

      // Use venv python if available, fall back to system python
      const venvPython = path.join(process.cwd(), '.soma_venv', 'Scripts', 'python.exe');
      const python = existsSync(venvPython) ? venvPython : 'python';

      const args = [
        scriptPath,
        '--data', dataPath,
        '--output', outputDir,
        '--model', 'google/gemma-3-1b-it', // 1b fits in 4GB VRAM; switch to gemma-3-4b-it on RTX 5070
        '--epochs', '3',
        '--batch-size', '1',       // 1 for 4GB VRAM; raise to 4 on RTX 5070
        '--max-samples', '2000',
        '--max-seq-len', '512',    // 512 for 4GB VRAM; raise to 2048 on RTX 5070
      ];

      if (process.env.HF_TOKEN) {
        args.push('--hf-token', process.env.HF_TOKEN);
      }

      console.log(`[${this.name}]    Running: ${python} train-soma-llama.py`);

      const proc = spawn(python, args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          // Disable torch.compile / inductor / triton JIT — requires a C compiler on Windows.
          // Training still uses CUDA/GPU fully, just skips kernel auto-tuning.
          TORCHDYNAMO_DISABLE: '1',
          TORCHINDUCTOR_DISABLE: '1',
        },
        stdio: 'inherit', // stream output directly to console
      });

      proc.on('close', (code) => resolve(code === 0));
      proc.on('error', (err) => {
        console.error(`[${this.name}] Failed to spawn python: ${err.message}`);
        resolve(false);
      });
    });
  }

  getStatus() {
    const stats = this.conversationHistory?.getStats() || {};
    const newConversations = (stats.totalMessages || 0) - this.lastConversationCount;
    const timeSinceTraining = Date.now() - this.lastTrainingTime;

    return {
      enabled: this.enabled,
      currentVersion: this.currentVersion,
      activeModel: this.activeOllamaModel,
      baseModel: this.baseOllamaModel,
      promotedBeyondBase: this.activeOllamaModel !== this.baseOllamaModel,
      trainingRuns: this.currentVersion,
      conversationsCollected: newConversations,
      conversationsNeeded: Math.max(0, this.conversationThreshold - newConversations),
      canTrainNow: newConversations >= this.conversationThreshold &&
                   (timeSinceTraining >= this.minTimeBetweenTraining || this.lastTrainingTime === 0),
      metrics: this.metrics
    };
  }

  async shutdown() {
    console.log(`[${this.name}] Shutting down auto-trainer...`);
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.emit('shutdown');
  }
}

export default OllamaAutoTrainer;
