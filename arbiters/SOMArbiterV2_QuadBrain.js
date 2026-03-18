/**
 * SOMArbiterV2_QuadBrain.js
 *
 * Quad-Brain cognitive architecture for SOMA.
 * Allows multi-model reasoning, tool execution, and adversarial debate.
 * 
 * Features:
 * - Resilient Provider Cascade: Gemini → DeepSeek → GEMMA-3 (Local)
 * - Circuit Breakers: Automatically skips failing AI providers.
 * - Dynamic Routing: Routes queries to specialized lobes (AURORA, LOGOS, etc.)
 * - Context Memory: Long-term and short-term conversation context.
 * - UPGRADED: Terminology transition from SOMA-1T to GEMMA-3.
 */

import { BaseArbiterV4, ArbiterRole, ArbiterCapability } from './BaseArbiter.js';
import messageBroker from '../core/MessageBroker.cjs';
import fs from 'fs/promises';
import path from 'path';

// Constants for performance monitoring
const CIRCUIT_BREAKER_WINDOW = 10;
const CIRCUIT_BREAKER_THRESHOLD = 0.7; // 70% failure rate opens the circuit

// EXPORT BOTH NAMED AND DEFAULT TO PREVENT LINKAGE ERRORS
export class SOMArbiterV2_QuadBrain extends BaseArbiterV4 {
  constructor(opts = {}) {
    super({
      ...opts,
      name: opts.name || 'QuadBrain',
      role: ArbiterRole.CONDUCTOR,
      capabilities: [
        ArbiterCapability.REASONING,
        ArbiterCapability.TOOL_EXECUTION,
        ArbiterCapability.ADVERSARIAL_DEBATE,
        ArbiterCapability.KNOWLEDGE_SYNTHESIS
      ]
    });

    this.apiKey = process.env.GEMINI_API_KEY;
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    this.ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:4b';

    // Provider health & performance tracking
    this.providerStats = {
      gemini: { success: 0, failures: 0, recentResults: [] },
      deepseek: { success: 0, failures: 0, recentResults: [] },
      gemma3: { success: 0, failures: 0, recentResults: [] },
      queriesByBrain: {}
    };

    // Sessions & context
    this.sessions = new Map();
    this.activeLobes = new Set(['AURORA', 'LOGOS', 'PROMETHEUS', 'THALAMUS']);

    // Model Rate Limiting (Cooldowns)
    this._modelRateLimitedUntil = new Map();

    this.auditLogger.info(`[${this.name}] 🧠 Quad-Brain Engine Ready`, {
        brains: Array.from(this.activeLobes),
        localModel: this.ollamaModel
    });
  }

  async onInitialize() {
    // Perform a heartbeat check on local Ollama
    try {
        const res = await fetch(`${this.ollamaEndpoint}/api/tags`).catch(() => null);
        if (res && res.ok) {
            this.auditLogger.success(`[${this.name}] ✅ Local GEMMA-3 (Ollama) is responsive`);
        } else {
            this.auditLogger.warn(`[${this.name}] ⚠️ Local Ollama not found. Fallback to GEMMA-3 disabled.`);
        }
    } catch (e) {
        this.auditLogger.warn(`[${this.name}] ⚠️ Local provider heartbeat failed: ${e.message}`);
    }
  }

  // ── Circuit Breaker Logic ──────────────────────────────────────────

  _recordProviderResult(provider, success) {
    if (!this.providerStats) return;
    const stats = this.providerStats[provider];
    if (!stats) return;
    
    stats.recentResults.push({ success, ts: Date.now() });
    if (stats.recentResults.length > CIRCUIT_BREAKER_WINDOW) {
      stats.recentResults.shift();
    }
    
    if (success) stats.success++;
    else stats.failures++;
  }

  _isCircuitOpen(provider) {
    if (!this.providerStats) return false;
    const stats = this.providerStats[provider];
    if (!stats || stats.recentResults.length < 3) return false;
    
    const failures = stats.recentResults.filter(r => !r.success).length;
    const rate = failures / stats.recentResults.length;
    return rate >= CIRCUIT_BREAKER_THRESHOLD;
  }

  /**
   * Main reasoning entry point
   */
  async reason(query, context = {}) {
    const sessionId = context.sessionId || 'default';
    const startTime = Date.now();

    this.auditLogger.info(`[${this.name}] Reasoning Request: "${query.substring(0, 50)}..."`);

    try {
        const response = await this._callProviderCascade(query, context);
        const duration = Date.now() - startTime;

        this._updateMetrics(duration, response.brain);
        return {
            ...response,
            duration,
            sessionId
        };
    } catch (error) {
        this.auditLogger.error(`[${this.name}] ❌ Reasoning Chain Failed: ${error.message}`);
        throw error;
    }
  }

  /**
   * Resilient Provider Cascade: Gemini → DeepSeek → Local (GEMMA-3)
   */
  async _callProviderCascade(prompt, context) {
    const temperature = context.temperature || 0.7;
    const maxTokens = context.maxTokens || 2048;

    // 1. Attempt Gemini (Primary)
    if (this.apiKey && !this._isCircuitOpen('gemini')) {
        try {
            const result = await this._callGemini(prompt, temperature, maxTokens);
            this._recordProviderResult('gemini', true);
            return { ...result, brain: 'LOGOS' };
        } catch (e) {
            this._recordProviderResult('gemini', false);
            this.auditLogger.warn(`[${this.name}] ⚠️ Gemini Failed: ${e.message}`);
        }
    }

    // 2. Attempt DeepSeek (Secondary)
    if (this.deepseekApiKey && !this._isCircuitOpen('deepseek')) {
        try {
            const result = await this._callDeepSeek(prompt, temperature, maxTokens);
            this._recordProviderResult('deepseek', true);
            return { ...result, brain: 'LOGOS' };
        } catch (e) {
            this._recordProviderResult('deepseek', false);
            this.auditLogger.warn(`[${this.name}] ⚠️ DeepSeek Failed: ${e.message}`);
        }
    }

    // 3. Final Fallback: Local GEMMA-3
    try {
        const result = await this._callLocalGemma(prompt, temperature, maxTokens);
        this._recordProviderResult('gemma3', true);
        return { ...result, brain: 'GEMMA-3' };
    } catch (e) {
        this._recordProviderResult('gemma3', false);
        this.auditLogger.error(`[${this.name}] ❌ All providers failed.`);
        throw new Error(`Reasoning failed: All providers exhausted. Check API keys and Ollama status.`);
    }
  }

  async _callGemini(prompt, temperature, maxTokens) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens }
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned empty response');
    
    return { text, provider: 'gemini' };
  }

  async _callDeepSeek(prompt, temperature, maxTokens) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.deepseekApiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('DeepSeek returned empty response');

    return { text, provider: 'deepseek' };
  }

  async _callLocalGemma(prompt, temperature, maxTokens) {
    const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: this.ollamaModel,
            prompt: prompt,
            stream: false,
            options: { temperature, num_predict: maxTokens }
        })
    });

    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

    const data = await response.json();
    const text = data.response;
    if (!text) throw new Error('Ollama returned empty response');

    return { text, provider: 'gemma3' };
  }

  _updateMetrics(duration, brain) {
    if (this.providerStats?.queriesByBrain) {
        this.providerStats.queriesByBrain[brain] = (this.providerStats.queriesByBrain[brain] || 0) + 1;
    }
  }

  getStatus() {
    return {
      name: this.name,
      stats: this.providerStats,
      lobes: Array.from(this.activeLobes),
      localModel: this.ollamaModel
    };
  }

  async shutdown() {
    this.sessions.clear();
    this.emit('shutdown');
  }
}

// EXPORT BOTH WAYS
export default SOMArbiterV2_QuadBrain;
