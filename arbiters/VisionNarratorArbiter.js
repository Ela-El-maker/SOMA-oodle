import { BaseArbiter } from '../core/BaseArbiter.js';
import fetch from 'node-fetch';

/**
 * VisionNarratorArbiter — THE NARRATIVE EYE
 * v0.5 — Connects Project Argus recognition to SOMA's personality.
 * Uses local VLM (Llava) for high-depth scene description.
 */
export class VisionNarratorArbiter extends BaseArbiter {
  constructor(config = {}) {
    super({
      name: 'VisionNarratorArbiter',
      role: 'specialist',
      capabilities: ['vision-narration', 'scene-description'],
      ...config
    });

    this.ollamaUrl = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.vlmModel = process.env.OLLAMA_VLM_MODEL || 'llava';
    this._lastNarrationTime = 0;
    this._narrationCooldown = 20000; // 20s cooldown
    this._latestFrame = null;
  }

  async onInitialize() {
    console.log('[VisionNarrator] 👁️ Narrative Eye active.');
    
    if (this.broker) {
      await this.broker.subscribe('image_received', (msg) => {
          this._latestFrame = msg.payload?.imageData || msg.payload?.image;
      });
      await this.broker.subscribe('argus_recognition', this.handleRecognition.bind(this));
      await this.broker.subscribe('location_changed', this.handleLocationChange.bind(this));
    }
  }

  async handleLocationChange(message) {
    const { type, location } = message.payload || message;
    if (type === 'discovery' && this._latestFrame) {
        await this._narrateScene("I've arrived in a new area. Describe the surroundings briefly.");
    }
  }

  async handleRecognition(message) {
    const { label, score } = message.payload || message;
    if (score > 0.92 && (Date.now() - this._lastNarrationTime > this._narrationCooldown)) {
        await this._narrateScene(`I've recognized a ${label}. Comment on it naturally.`);
    }
  }

  async _narrateScene(prompt) {
    if (!this._latestFrame) return;
    this._lastNarrationTime = Date.now();

    try {
        console.log('[VisionNarrator] 🧠 Consultation with VLM (Llava)...');
        
        // Remove data URL prefix for Ollama
        const base64Data = this._latestFrame.replace(/^data:image\/[a-z]+;base64,/, "");

        const response = await fetch(`${this.ollamaUrl}/api/generate`, {
            method: 'POST',
            body: JSON.stringify({
                model: this.vlmModel,
                prompt: `You are SOMA, an AI. ${prompt} Be concise (1 sentence).`,
                images: [base64Data],
                stream: false
            })
        });

        if (response.ok) {
            const data = await response.json();
            const observation = data.response.trim();
            
            console.log(`[VisionNarrator] 📝 VLM Observation: "${observation}"`);

            await this.broker.publish('vocal_synthesis_requested', {
                text: observation,
                emotion: 'curious',
                source: 'vision-narrator'
            });

            await this.broker.publish('log', {
                type: 'success',
                message: `[Visual Focus] ${observation}`,
                timestamp: Date.now()
            });
        }
    } catch (err) {
        console.warn('[VisionNarrator] VLM consultation failed:', err.message);
    }
  }
}

export default VisionNarratorArbiter;
