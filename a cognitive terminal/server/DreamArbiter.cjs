/**
 * DreamArbiter - Autonomous Background Reasoning System
 * 
 * Inspired by human sleep/dream cycles, this arbiter performs:
 * - Memory consolidation (hot → warm → cold transitions)
 * - Pattern discovery across memories
 * - Insight synthesis through TriBrain reasoning
 * - Memory reorganization based on semantic clustering
 * - Transmitter network optimization
 * 
 * Dream Cycles:
 * - REM (Rapid Eye Movement): Active pattern recognition & synthesis
 * - NREM (Non-REM): Memory consolidation & reorganization
 * - Deep Sleep: Long-term archival & compression
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

class DreamArbiter extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.name = config.name || 'DreamArbiter';
    
    // Memory system connections
    this.mnemonicArbiter = config.mnemonicArbiter || null;
    this.archivistArbiter = config.archivistArbiter || null;
    this.storageArbiter = config.storageArbiter || null;
    this.transmitterManager = config.transmitterManager || null;
    
    // Cognitive system connections
    this.brainConductor = config.brainConductor || null;
    this.reasoningChamber = config.reasoningChamber || null;
    
    // Dream cycle configuration
    this.config = {
      // Cycle intervals (ms)
      remCycle: config.remCycle || 900000,        // 15 min - Active pattern synthesis
      nremCycle: config.nremCycle || 1800000,     // 30 min - Memory consolidation
      deepSleepCycle: config.deepSleepCycle || 86400000, // 24 hrs - Deep archival
      
      // Idle detection
      idleThreshold: config.idleThreshold || 300000, // 5 min of no queries = idle
      
      // Dream intensity
      maxREMDuration: config.maxREMDuration || 120000,  // 2 min max REM
      maxNREMDuration: config.maxNREMDuration || 300000, // 5 min max NREM
      
      // Memory thresholds
      consolidationThreshold: config.consolidationThreshold || 100, // memories
      patternMinOccurrences: config.patternMinOccurrences || 3,
      
      // Enable/disable features
      enableREM: config.enableREM !== false,
      enableNREM: config.enableNREM !== false,
      enableDeepSleep: config.enableDeepSleep !== false,
      enableIdleDreams: config.enableIdleDreams !== false,
      
      verbose: config.verbose !== false
    };
    
    // State
    this.state = {
      isRunning: false,
      isDreaming: false,
      currentCycle: null,
      lastActivity: Date.now(),
      lastREM: null,
      lastNREM: null,
      lastDeepSleep: null
    };
    
    // Timers
    this.timers = {
      rem: null,
      nrem: null,
      deepSleep: null,
      idleCheck: null
    };
    
    // Metrics
    this.metrics = {
      totalDreamCycles: 0,
      remCycles: 0,
      nremCycles: 0,
      deepSleepCycles: 0,
      memoriesConsolidated: 0,
      patternsDiscovered: 0,
      insightsSynthesized: 0,
      transmitterOptimizations: 0,
      avgDreamDuration: 0
    };
    
    // Dream journal (insights generated during dreams)
    this.dreamJournal = [];
    this.maxJournalSize = 1000;
    
    this._log('Initialized');
  }
  
  _log(...args) {
    if (this.config.verbose) {
      console.log(`[${this.name}]`, ...args);
    }
  }
  
  /**
   * Start the dream system
   */
  start() {
    if (this.state.isRunning) {
      this._log('Already running');
      return;
    }
    
    this._log('🌙 Starting autonomous dream system...');
    this.state.isRunning = true;
    
    // Schedule periodic dream cycles
    if (this.config.enableREM) {
      this.timers.rem = setInterval(() => this._scheduleREM(), this.config.remCycle);
      this._log(`REM scheduled every ${this.config.remCycle / 60000}min`);
    }
    
    if (this.config.enableNREM) {
      this.timers.nrem = setInterval(() => this._scheduleNREM(), this.config.nremCycle);
      this._log(`NREM scheduled every ${this.config.nremCycle / 60000}min`);
    }
    
    if (this.config.enableDeepSleep) {
      this.timers.deepSleep = setInterval(() => this._scheduleDeepSleep(), this.config.deepSleepCycle);
      this._log(`Deep Sleep scheduled every ${this.config.deepSleepCycle / 3600000}hr`);
    }
    
    // Check for idle state (triggers opportunistic dreams)
    if (this.config.enableIdleDreams) {
      this.timers.idleCheck = setInterval(() => this._checkIdleState(), 60000); // Check every minute
    }
    
    this.emit('started');
    this._log('✓ Dream system active');
  }
  
  /**
   * Stop the dream system
   */
  stop() {
    if (!this.state.isRunning) return;
    
    this._log('Stopping dream system...');
    this.state.isRunning = false;
    
    // Clear all timers
    Object.values(this.timers).forEach(timer => {
      if (timer) clearInterval(timer);
    });
    
    this.emit('stopped');
    this._log('✓ Dream system stopped');
  }
  
  /**
   * Mark activity (resets idle timer)
   */
  recordActivity() {
    this.state.lastActivity = Date.now();
  }
  
  /**
   * Check if system is idle
   */
  isIdle() {
    const idleTime = Date.now() - this.state.lastActivity;
    return idleTime > this.config.idleThreshold;
  }
  
  /**
   * Check idle state and trigger opportunistic dreams
   */
  _checkIdleState() {
    if (this.isIdle() && !this.state.isDreaming) {
      this._log('System idle detected - entering opportunistic dream state');
      this._scheduleREM();
    }
  }
  
  /**
   * Schedule REM cycle (active synthesis)
   */
  async _scheduleREM() {
    if (this.state.isDreaming) {
      this._log('Already dreaming, skipping REM');
      return;
    }
    
    this.state.isDreaming = true;
    this.state.currentCycle = 'REM';
    this.state.lastREM = Date.now();
    this.metrics.remCycles++;
    this.metrics.totalDreamCycles++;
    
    const startTime = Date.now();
    this._log('💭 Entering REM cycle (pattern synthesis)...');
    this.emit('dream_start', { cycle: 'REM' });
    
    try {
      await this._executeREMCycle();
      const duration = Date.now() - startTime;
      this._updateAvgDuration(duration);
      this._log(`✓ REM cycle complete (${duration}ms)`);
    } catch (error) {
      this._log('REM cycle error:', error.message);
    } finally {
      this.state.isDreaming = false;
      this.state.currentCycle = null;
      this.emit('dream_end', { cycle: 'REM' });
    }
  }
  
  /**
   * Schedule NREM cycle (consolidation)
   */
  async _scheduleNREM() {
    if (this.state.isDreaming) {
      this._log('Already dreaming, skipping NREM');
      return;
    }
    
    this.state.isDreaming = true;
    this.state.currentCycle = 'NREM';
    this.state.lastNREM = Date.now();
    this.metrics.nremCycles++;
    this.metrics.totalDreamCycles++;
    
    const startTime = Date.now();
    this._log('😴 Entering NREM cycle (memory consolidation)...');
    this.emit('dream_start', { cycle: 'NREM' });
    
    try {
      await this._executeNREMCycle();
      const duration = Date.now() - startTime;
      this._updateAvgDuration(duration);
      this._log(`✓ NREM cycle complete (${duration}ms)`);
    } catch (error) {
      this._log('NREM cycle error:', error.message);
    } finally {
      this.state.isDreaming = false;
      this.state.currentCycle = null;
      this.emit('dream_end', { cycle: 'NREM' });
    }
  }
  
  /**
   * Schedule Deep Sleep cycle (archival)
   */
  async _scheduleDeepSleep() {
    if (this.state.isDreaming) {
      this._log('Already dreaming, skipping Deep Sleep');
      return;
    }
    
    this.state.isDreaming = true;
    this.state.currentCycle = 'DeepSleep';
    this.state.lastDeepSleep = Date.now();
    this.metrics.deepSleepCycles++;
    this.metrics.totalDreamCycles++;
    
    const startTime = Date.now();
    this._log('🌌 Entering Deep Sleep cycle (archival & compression)...');
    this.emit('dream_start', { cycle: 'DeepSleep' });
    
    try {
      await this._executeDeepSleepCycle();
      const duration = Date.now() - startTime;
      this._updateAvgDuration(duration);
      this._log(`✓ Deep Sleep cycle complete (${duration}ms)`);
    } catch (error) {
      this._log('Deep Sleep cycle error:', error.message);
    } finally {
      this.state.isDreaming = false;
      this.state.currentCycle = null;
      this.emit('dream_end', { cycle: 'DeepSleep' });
    }
  }
  
  /**
   * REM Cycle: Active pattern discovery & synthesis
   */
  async _executeREMCycle() {
    const startTime = Date.now();
    
    // Phase 1: Retrieve recent memories
    const memories = await this._getRecentMemories(50);
    if (memories.length === 0) {
      this._log('No recent memories to process');
      return;
    }
    
    this._log(`Processing ${memories.length} memories...`);
    
    // Phase 2: Discover patterns
    const patterns = await this._discoverPatterns(memories);
    this.metrics.patternsDiscovered += patterns.length;
    this._log(`Discovered ${patterns.length} patterns`);
    
    // Phase 3: Synthesize insights through TriBrain
    if (this.brainConductor && patterns.length > 0) {
      const insights = await this._synthesizeInsights(patterns);
      this.metrics.insightsSynthesized += insights.length;
      
      // Store insights in dream journal
      for (const insight of insights) {
        this._addToDreamJournal(insight);
      }
      
      this._log(`Generated ${insights.length} insights`);
    }
    
    // Phase 4: Optimize Transmitter connections
    if (this.transmitterManager) {
      await this._optimizeTransmitters(memories);
      this.metrics.transmitterOptimizations++;
    }
    
    // Don't exceed max REM duration
    const elapsed = Date.now() - startTime;
    if (elapsed > this.config.maxREMDuration) {
      this._log('REM max duration reached, ending cycle');
    }
  }
  
  /**
   * NREM Cycle: Memory consolidation
   */
  async _executeNREMCycle() {
    if (!this.mnemonicArbiter) {
      this._log('No MnemonicArbiter - skipping consolidation');
      return;
    }
    
    // Phase 1: Move hot → warm memories
    try {
      const hotMemories = await this.mnemonicArbiter.recall('', { 
        tier: 'hot',
        limit: this.config.consolidationThreshold 
      });
      
      if (hotMemories && hotMemories.length > 0) {
        this._log(`Consolidating ${hotMemories.length} hot memories → warm`);
        
        for (const memory of hotMemories) {
          await this.mnemonicArbiter.store({
            ...memory,
            tier: 'warm'
          });
        }
        
        this.metrics.memoriesConsolidated += hotMemories.length;
      }
    } catch (error) {
      this._log('Hot→Warm consolidation failed:', error.message);
    }
    
    // Phase 2: Move warm → cold memories (>7 days old)
    try {
      const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const warmMemories = await this.mnemonicArbiter.recall('', {
        tier: 'warm',
        before: oldDate,
        limit: 100
      });
      
      if (warmMemories && warmMemories.length > 0) {
        this._log(`Moving ${warmMemories.length} old warm memories → cold`);
        
        for (const memory of warmMemories) {
          await this.mnemonicArbiter.store({
            ...memory,
            tier: 'cold'
          });
        }
        
        this.metrics.memoriesConsolidated += warmMemories.length;
      }
    } catch (error) {
      this._log('Warm→Cold consolidation failed:', error.message);
    }
  }
  
  /**
   * Deep Sleep Cycle: Long-term archival
   */
  async _executeDeepSleepCycle() {
    if (!this.archivistArbiter) {
      this._log('No ArchivistArbiter - skipping archival');
      return;
    }
    
    try {
      // Find old cold data (>30 days)
      const coldData = await this.archivistArbiter.findColdData(30);
      
      if (coldData && coldData.length > 0) {
        this._log(`Archiving ${coldData.length} cold files...`);
        await this.archivistArbiter.autonomousCompression(coldData);
        this._log(`✓ Archived ${coldData.length} files`);
      } else {
        this._log('No cold data found for archival');
      }
    } catch (error) {
      this._log('Archival failed:', error.message);
    }
  }
  
  /**
   * Get recent memories from MnemonicArbiter
   */
  async _getRecentMemories(limit = 50) {
    if (!this.mnemonicArbiter) return [];
    
    try {
      const memories = await this.mnemonicArbiter.recall('', {
        tier: 'warm',
        limit
      });
      return memories || [];
    } catch (error) {
      this._log('Failed to retrieve memories:', error.message);
      return [];
    }
  }
  
  /**
   * Discover patterns in memories
   */
  async _discoverPatterns(memories) {
    const patterns = [];
    
    // Group by semantic similarity (topics/themes)
    const clusters = new Map();
    
    for (const memory of memories) {
      const content = memory.content || memory.text || '';
      
      // Extract keywords (simple tokenization - in production use NLP)
      const keywords = content
        .toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 4 && !this._isStopWord(w));
      
      for (const keyword of keywords) {
        if (!clusters.has(keyword)) {
          clusters.set(keyword, []);
        }
        clusters.get(keyword).push(memory);
      }
    }
    
    // Find significant patterns (frequent occurrences)
    for (const [keyword, occurrences] of clusters) {
      if (occurrences.length >= this.config.patternMinOccurrences) {
        patterns.push({
          type: 'semantic_cluster',
          keyword,
          frequency: occurrences.length,
          examples: occurrences.slice(0, 5),
          confidence: Math.min(0.9, occurrences.length / 10)
        });
      }
    }
    
    // Sort by frequency
    patterns.sort((a, b) => b.frequency - a.frequency);
    
    return patterns.slice(0, 20); // Top 20 patterns
  }
  
  /**
   * Synthesize insights from patterns using TriBrain
   */
  async _synthesizeInsights(patterns) {
    if (!this.brainConductor) return [];
    
    const insights = [];
    
    // Take top 5 patterns for synthesis
    const topPatterns = patterns.slice(0, 5);
    
    for (const pattern of topPatterns) {
      try {
        const prompt = `Analyze this pattern discovered in my memory:
Topic: ${pattern.keyword}
Frequency: ${pattern.frequency} occurrences
Examples: ${pattern.examples.map(e => (e.content || e.text || '').substring(0, 100)).join('; ')}

What insight or knowledge can be derived from this pattern? Be concise and actionable.`;
        
        const result = await this.brainConductor.orchestrate({
          query: prompt,
          mode: 'deep' // Use LOGOS for analytical insights
        });
        
        if (result.success && result.response) {
          insights.push({
            pattern,
            insight: result.response,
            confidence: result.confidence,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        this._log(`Insight synthesis failed for ${pattern.keyword}:`, error.message);
      }
    }
    
    return insights;
  }
  
  /**
   * Optimize Transmitter network based on memory patterns
   */
  async _optimizeTransmitters(memories) {
    if (!this.transmitterManager) return;
    
    try {
      // Run maintenance on Transmitter network
      await this.transmitterManager.maintenanceTick();
      this._log('Transmitter network optimized');
    } catch (error) {
      this._log('Transmitter optimization failed:', error.message);
    }
  }
  
  /**
   * Add insight to dream journal
   */
  _addToDreamJournal(insight) {
    this.dreamJournal.push({
      id: crypto.randomBytes(8).toString('hex'),
      ...insight,
      dreamCycle: this.metrics.totalDreamCycles
    });
    
    // Trim journal if too large
    if (this.dreamJournal.length > this.maxJournalSize) {
      this.dreamJournal = this.dreamJournal.slice(-this.maxJournalSize);
    }
  }
  
  /**
   * Get recent insights from dream journal
   */
  getDreamJournal(limit = 10) {
    return this.dreamJournal.slice(-limit).reverse();
  }
  
  /**
   * Check if word is a stop word
   */
  _isStopWord(word) {
    const stopWords = new Set([
      'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have',
      'will', 'been', 'were', 'what', 'when', 'where', 'which', 'their'
    ]);
    return stopWords.has(word);
  }
  
  /**
   * Update average dream duration metric
   */
  _updateAvgDuration(duration) {
    const total = this.metrics.avgDreamDuration * (this.metrics.totalDreamCycles - 1);
    this.metrics.avgDreamDuration = (total + duration) / this.metrics.totalDreamCycles;
  }
  
  /**
   * Get current status
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      config: {
        remCycle: `${this.config.remCycle / 60000}min`,
        nremCycle: `${this.config.nremCycle / 60000}min`,
        deepSleepCycle: `${this.config.deepSleepCycle / 3600000}hr`,
        idleThreshold: `${this.config.idleThreshold / 60000}min`
      },
      metrics: this.metrics,
      recentDreams: this.getDreamJournal(5)
    };
  }
}

module.exports = DreamArbiter;
