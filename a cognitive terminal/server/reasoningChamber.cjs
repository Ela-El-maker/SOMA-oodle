
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');

const iso = (t = Date.now()) => new Date(t).toISOString();
const traceId = (pref = 'rc') => `${pref}_${crypto.randomBytes(6).toString('hex')}`;

/* -------------------------
   Default model adapter stubs
 --------------------------------*/
const DefaultAdapters = {
  async gema(query, opts = {}) {
    return { text: `[GEMA] interpret: ${query}`, confidence: 0.8 };
  },
  async deepseek(prompt, opts = {}) {
    return { text: `[DEEPSEEK] deep answer for: ${prompt}`, confidence: 0.6 };
  },
  async gemini(prompt, opts = {}) {
    return { text: `[GEMINI] confirm/refine: ${prompt}`, confidence: 0.75 };
  },
  async retriever(query, opts = {}) {
    return { sources: [], snippets: [] };
  },
  async calibrator(samples = []) {
    return (rawConf) => Math.max(0, Math.min(0.999, rawConf)); 
  }
};

/* -------------------------
   ReasoningChamber
 -------------------------*/
class ReasoningChamber extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.name = opts.name || 'ReasoningChamber';
    this.mode = opts.mode || 'inprocess'; 
    this.adapters = { ...DefaultAdapters, ...(opts.adapters || {}) };
    this.arbiter = opts.arbiter || null;
    this.memoryPath = opts.memoryPath || path.resolve(process.cwd(), 'rc_provenance');
    this.docker = {
      image: opts.dockerImage || null,
      cmd: opts.dockerCmd || null,
      args: opts.dockerArgs || []
    };
    this.maxReflection = opts.maxReflection || 3;
    this.finalizeConfidence = opts.finalizeConfidence ?? 0.90;
    this.escalateConfidence = opts.escalateConfidence ?? 0.75;
    this.calibrator = opts.calibrator || DefaultAdapters.calibrator;
    this.safetyCheck = opts.safetyCheck || (async (meta, fused) => ({ ok: true }));
    this.verbose = opts.verbose ?? false;
    this._ensureMemoryDir();
  }

  async _ensureMemoryDir() {
    try {
      await fs.mkdir(this.memoryPath, { recursive: true });
    } catch (e) {
      // ignore
    }
  }

  _log(...args) {
    if (this.verbose) console.log(`[RC ${this.name}]`, ...args);
    this.emit('log', { ts: iso(), args });
  }

  _traceId(prefix = 'rc') { return traceId(prefix); }

  _fuseCandidates(candidates = [], meta = {}) {
    const novelty = meta.novelty ?? 0.5;
    const roleWeight = (r) => {
      if (!r) return 0.5;
      r = r.toLowerCase();
      if (r.includes('deep') || r.includes('logos')) return 0.7 * (novelty) + 0.3;
      if (r.includes('gemini') || r.includes('aurora')) return 0.8 * (1 - novelty) + 0.2;
      if (r.includes('gema') || r.includes('prometheus')) return 0.6;
      if (r.includes('external')) return 0.9;
      return 0.5;
    };

    const scores = candidates.map((c, i) => {
      const w = roleWeight(c.role) * (c.confidence ?? 0.1);
      return { idx: i, w, text: c.text, source: c.source, conf: c.confidence ?? 0.0 };
    });

    const totalW = scores.reduce((s, x) => s + x.w, 0) || 1;
    scores.forEach(s => s.norm = s.w / totalW);
    
    // Pick top weighted
    const best = scores.reduce((a, b) => (a.w > b.w ? a : b), scores[0]);
    const fusedConfidence = Math.min(0.995, scores.reduce((s, x) => s + x.norm * x.conf, 0));
    const weights = scores.map(s => ({ source: s.source, norm: s.norm, conf: s.conf }));

    return {
      text: best.text,
      weights: weights,
      confidence: fusedConfidence,
      provenance: candidates.map(c => ({ source: c.source, snippet: (c.text || '').slice(0, 200), confidence: c.confidence }))
    };
  }

  async _persistTrace(trace) {
    try {
      await fs.mkdir(this.memoryPath, { recursive: true });
      const fn = path.join(this.memoryPath, `${Date.now()}_${trace.traceId}.json`);
      await fs.writeFile(fn, JSON.stringify(trace, null, 2), 'utf8');
    } catch (e) {
      this._log('persistTrace error', e.message || e);
    }
  }

  async evaluate(query, opts = {}) {
    const tid = this._traceId();
    const meta = { ...(opts.meta || {}) };

    this._log('evaluate start', { tid, query, meta });

    let candidates = [];
    
    // If responses already provided by BrainConductor, use them directly (avoid infinite loop!)
    if (opts.responses && Array.isArray(opts.responses) && opts.responses.length > 0) {
      this._log('Using pre-computed brain responses', opts.responses.length);
      candidates = opts.responses.map(r => ({
        source: r.source,
        text: r.text,
        confidence: r.confidence,
        role: r.source.toLowerCase()
      }));
    } else {
      // Normal evaluation - call adapters
      const gemaAdapter = opts.adapters?.gema || this.adapters.gema;
      const deepAdapter = opts.adapters?.deepseek || this.adapters.deepseek;
      const geminiAdapter = opts.adapters?.gemini || this.adapters.gemini;
      const retriever = opts.adapters?.retriever || this.adapters.retriever;
      const calibrate = opts.calibrator || this.calibrator;

      // 1) Gema (Prometheus) - Router
      let gemaOut = { text: '', confidence: 0.0 };
      try {
        gemaOut = await this._safeCallAdapter('gema', gemaAdapter, query, { meta });
        gemaOut.role = 'gema';
      } catch (e) {
        this._log('gema failed', e.message || e);
      }

      // 2) DeepSeek (Logos) + Gemini (Aurora) Parallel
      const deepPromise = this._safeCallAdapter('deepseek', deepAdapter, query, { meta });
      const geminiPromise = this._safeCallAdapter('gemini', geminiAdapter, query, { meta });

      let deepOut = { text: '', confidence: 0.0 };
      let geminiOut = { text: '', confidence: 0.0 };
      try { deepOut = await deepPromise; deepOut.role = 'deepseek'; }
      catch (e) { this._log('deepseek fail', e.message || e); }
      try { geminiOut = await geminiPromise; geminiOut.role = 'gemini'; }
      catch (e) { this._log('gemini fail', e.message || e); }

      candidates = [
        { source: 'Prometheus (Gema)', text: gemaOut.text, confidence: gemaOut.confidence, role: gemaOut.role },
        { source: 'Logos (DeepSeek)', text: deepOut.text, confidence: deepOut.confidence, role: deepOut.role },
        { source: 'Aurora (Gemini)', text: geminiOut.text, confidence: geminiOut.confidence, role: geminiOut.role }
      ];
    }

    // 3) Fuse
    let fused = this._fuseCandidates(candidates, meta);
    
    // 4) Reflection loop (skip if using pre-computed responses - they're already evaluated)
    let iter = 0;
    const usePrecomputedResponses = opts.responses && Array.isArray(opts.responses) && opts.responses.length > 0;
    
    if (!usePrecomputedResponses) {
      const gemaAdapter = opts.adapters?.gema || this.adapters.gema;
      const deepAdapter = opts.adapters?.deepseek || this.adapters.deepseek;
      const geminiAdapter = opts.adapters?.gemini || this.adapters.gemini;
      
      while (fused.confidence < (opts.mode === 'fast' ? this.escalateConfidence : this.finalizeConfidence) && iter < this.maxReflection) {
        iter += 1;
        
        const critiqueTasks = [
          this._safeCallAdapter('gemini_critique', geminiAdapter, `Critique: ${fused.text}`, { meta }),
          this._safeCallAdapter('deepseek_expand', deepAdapter, `Expand: ${fused.text}`, { meta })
        ];

        const critiques = await Promise.all(critiqueTasks.map(p => p.catch(e => ({ text: '', confidence: 0.0, error: e }))));
        critiques.forEach((c, i) => {
          const label = i === 0 ? 'AuroraCritic' : 'LogosAlt';
          candidates.push({ source: label, text: c.text || '', confidence: c.confidence || 0.0, role: label.toLowerCase() });
        });

        fused = this._fuseCandidates(candidates, meta);
      }
    }

    const trace = { traceId: tid, ts: iso(), query, meta, candidates, fused, iter };
    await this._persistTrace(trace);

    return {
      final: fused.text,
      confidence: fused.confidence,
      fused,
      traceId: tid,
      provenancePath: path.resolve(this.memoryPath)
    };
  }

  async _safeCallAdapter(name, adapterFn, prompt, opts = {}) {
      try {
          const out = await adapterFn(prompt, opts) || {};
          return { 
              text: String(out.text || out || ''), 
              confidence: typeof out.confidence === 'number' ? out.confidence : 0.5, 
              meta: out.meta || {} 
          };
      } catch (e) {
          return { text: '', confidence: 0.0, error: e.message };
      }
  }
}

module.exports = { ReasoningChamber, DefaultAdapters };
