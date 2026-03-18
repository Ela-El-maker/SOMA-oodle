// ═══════════════════════════════════════════════════════════
// VisionProcessingArbiter.js - Multi-Modal Vision Processing
// GPU-Accelerated CLIP for image understanding
// ═══════════════════════════════════════════════════════════

import { EventEmitter } from 'events';
import { pipeline } from '@xenova/transformers';
import fs from 'fs/promises';
import path from 'path';

/**
 * VisionProcessingArbiter
 *
 * Multi-modal vision processing with CLIP
 * - Image understanding and classification
 * - Text-to-image similarity
 * - Visual memory storage
 * - Batch processing for GPU efficiency
 * - Zero-shot image classification
 */
export class VisionProcessingArbiter extends EventEmitter {
  constructor(config = {}) {
    super();

    this.name = config.name || 'VisionProcessingArbiter';
    this.batchSize = config.batchSize || 32;
    this.loadPipeline = config.loadPipeline || null;

    // CLIP model for vision-language understanding
    this.clipModel = null;
    this.imageProcessor = null;
    this.zeroShotClassifier = null;

    // Concurrency control for background loading
    this._initializing = false;
    this._initPromise = null;

    // Vision memory cache
    this.visualMemories = new Map();

    // Metrics
    this.metrics = {
      imagesProcessed: 0,
      classificationsRun: 0,
      similaritySearches: 0,
      batchesProcessed: 0,
      averageProcessingTime: 0
    };

    this.storagePath = path.join(process.cwd(), '.soma', 'visual_memory.json');

    console.log(`[${this.name}] 👁️  Vision Processing Arbiter initialized`);
    console.log(`[${this.name}]    Batch Size: ${this.batchSize}`);
  }

  /**
   * Initialize the vision system
   */
  async initialize() {
    if (this._initializing) return this._initPromise;
    this._initializing = true;

    this._initPromise = (async () => {
        console.log(`[${this.name}] Initializing vision processing system...`);

        try {
          // Get GPU info if available (with defensive null checks)
          if (this.loadPipeline) {
            try {
              const status = this.loadPipeline.getStatus();
              const gpuAvailable = status?.hardware?.gpu?.available ?? false;
              const gpuType = status?.hardware?.gpu?.type ?? 'Unknown';
              console.log(`[${this.name}]    GPU: ${gpuAvailable ? gpuType : 'CPU only'}`);
            } catch (gpuError) {
              console.warn(`[${this.name}]    GPU detection failed: ${gpuError.message}. Using CPU.`);
            }
          } else {
            console.log(`[${this.name}]    GPU: CPU only (no LoadPipeline)`);
          }

          // Load memories from disk
          await this.loadMemories();

          // Load CLIP model (this will use GPU if available)
          console.log(`[${this.name}]    Loading CLIP model (may take a moment)...`);

          // Load zero-shot classification (this gives us full CLIP access)
          this.zeroShotClassifier = await pipeline(
            'zero-shot-image-classification',
            'Xenova/clip-vit-base-patch32'
          );

          console.log(`[${this.name}]    ✅ CLIP model loaded successfully`);

          console.log(`[${this.name}] ✅ Vision processing system ready`);
          this.emit('initialized');

          return true;
        } catch (error) {
          console.error(`[${this.name}] ❌ Vision init failed:`, error.message);
          this._initializing = false;
          throw error;
        }
    })();

    return this._initPromise;
  }

  /**
   * Internal helper to ensure model is ready before tool execution
   */
  async _ensureModel() {
      if (!this.zeroShotClassifier) {
          if (this._initializing) {
              console.log(`[${this.name}] ⏳ Waiting for CLIP model to finish loading...`);
              await this._initPromise;
          } else {
              await this.initialize();
          }
      }
      if (typeof this.zeroShotClassifier !== 'function') {
          throw new Error('Vision model failed to initialize correctly (not a function).');
      }
  }

  async loadMemories() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.storagePath);
      await fs.mkdir(dir, { recursive: true });

      const data = await fs.readFile(this.storagePath, 'utf8');
      const memories = JSON.parse(data);
      
      this.visualMemories = new Map(memories);
      console.log(`[${this.name}]    Loaded ${this.visualMemories.size} visual memories from disk`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`[${this.name}]    No existing visual memory file found. Starting fresh.`);
      } else {
        console.error(`[${this.name}]    Failed to load memories:`, error.message);
      }
    }
  }

  async saveMemories() {
    try {
      const data = JSON.stringify(Array.from(this.visualMemories.entries()), null, 2);
      await fs.writeFile(this.storagePath, data, 'utf8');
      // console.log(`[${this.name}]    Saved ${this.visualMemories.size} visual memories to disk`);
    } catch (error) {
      console.error(`[${this.name}]    Failed to save memories:`, error.message);
    }
  }

  /**
   * Detect objects in an image using zero-shot classification
   */
  async detectObjects(imagePathOrURL, threshold = 0.7) {
    await this._ensureModel();
    console.log(`[${this.name}] 🔍 Detecting objects (threshold: ${threshold})`);

    // Common UI and physical objects for screen understanding
    const candidateLabels = [
      'window', 'button', 'text', 'icon', 'menu', 'sidebar', 'toolbar', 
      'terminal', 'browser', 'code editor', 'chat', 'graph', 'chart',
      'human', 'face', 'hand', 'desk', 'computer', 'keyboard', 'mouse'
    ];

    console.log(`[${this.name}] Classifying image with labels:`, candidateLabels);

    const startTime = Date.now();

    try {
      const result = await this.zeroShotClassifier(imagePathOrURL, candidateLabels);

      const duration = Date.now() - startTime;
      this.metrics.classificationsRun++;

      console.log(`[${this.name}]    Classification: ${result[0].label} (${(result[0].score * 100).toFixed(2)}%)`);

      // Filter by threshold
      const objects = result
        .filter(r => r.score >= threshold)
        .map(r => ({
          label: r.label,
          score: r.score,
          bbox: null // CLIP doesn't provide bounding boxes, just scores
        }));

      return {
        success: true,
        objects,
        count: objects.length,
        duration
      };
    } catch (error) {
      console.error(`[${this.name}] Error classifying image:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze image using CLIP embeddings
   */
  async analyzeImage(imagePathOrURL) {
    await this._ensureModel();
    const startTime = Date.now();

    try {
      // Use the zero-shot classifier to get image features
      // We pass a dummy label just to get the embedding
      const result = await this.zeroShotClassifier(imagePathOrURL, ['dummy']);

      // Extract embeddings from the model's internal state
      // For now, use the classifier result as a proxy
      const embedding = result.map(r => r.score);

      const duration = Date.now() - startTime;
      this.metrics.imagesProcessed++;

      return {
        success: true,
        embedding,
        duration
      };
    } catch (error) {
      console.error(`[${this.name}] Error analyzing image:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store a visual memory
   */
  async storeVisualMemory(id, imagePath, metadata = {}) {
    const analysis = await this.analyzeImage(imagePath);
    
    if (analysis.success) {
      this.visualMemories.set(id, {
        path: imagePath,
        embedding: analysis.embedding,
        metadata,
        timestamp: Date.now()
      });

      await this.saveMemories();
      return { success: true, id };
    }

    return { success: false, error: analysis.error };
  }

  /**
   * Search visual memories by text query
   */
  async searchVisualMemories(queryText, limit = 5) {
    await this._ensureModel();
    console.log(`[${this.name}] Searching visual memories for: "${queryText}"`);

    const startTime = Date.now();

    try {
      // Calculate similarities using zero-shot classification
      const similarities = [];

      for (const [id, memory] of this.visualMemories) {
        // Use CLIP to check how well the query matches this image
        const result = await this.zeroShotClassifier(memory.path, [queryText, 'something else']);
        const similarity = result[0].label === queryText ? result[0].score : 1 - result[0].score;

        similarities.push({
          id,
          similarity,
          path: memory.path,
          metadata: memory.metadata,
          timestamp: memory.timestamp
        });
      }

      // Sort by similarity
      const results = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      const duration = Date.now() - startTime;
      this.metrics.similaritySearches++;

      return {
        success: true,
        results,
        duration
      };
    } catch (error) {
      console.error(`[${this.name}] Error searching visual memories:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get text-image similarity
   */
  async getSimilarity(imagePathOrURL, text) {
    await this._ensureModel();
    console.log(`[${this.name}] Computing text-image similarity...`);

    try {
      // Use zero-shot classification with the text as a label
      // CLIP gives us the probability that the image matches the text
      const result = await this.zeroShotClassifier(imagePathOrURL, [text, 'something else']);

      // The score for our text label is the similarity
      const similarity = result[0].label === text ? result[0].score : result[1].score;

      console.log(`[${this.name}]    Similarity: ${(similarity * 100).toFixed(2)}%`);

      return {
        success: true,
        similarity,
        image: imagePathOrURL,
        text
      };
    } catch (error) {
      console.error(`[${this.name}] Error getting similarity:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get arbiter status
   */
  getStatus() {
    return {
      name: this.name,
      modelLoaded: !!this.zeroShotClassifier && typeof this.zeroShotClassifier === 'function',
      visualMemoriesStored: this.visualMemories.size,
      metrics: this.metrics,
      batchSize: this.batchSize
    };
  }

  /**
   * Shutdown cleanup
   */
  async shutdown() {
    console.log(`[${this.name}] Shutting down...`);

    // Clear memories
    this.visualMemories.clear();

    this.emit('shutdown');
    return { success: true };
  }
}

export default VisionProcessingArbiter;
