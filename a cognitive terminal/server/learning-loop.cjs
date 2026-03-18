/**
 * SOMA Autonomous Learning Loop
 * 
 * Connects all memory tiers to DreamArbiter for continuous learning.
 * Analyzes interactions, extracts patterns, updates knowledge graph.
 */

class LearningLoop {
  constructor(config = {}) {
    this.mnemonicArbiter = config.mnemonicArbiter;
    this.archivistArbiter = config.archivistArbiter;
    this.analystArbiter = config.analystArbiter;
    this.brain = config.brain;
    
    this.learningInterval = config.learningInterval || 3600000; // 1 hour
    this.archivalInterval = config.archivalInterval || 86400000; // 24 hours
    
    this.isRunning = false;
    this.learningTimer = null;
    this.archivalTimer = null;
    
    this.metrics = {
      learningCycles: 0,
      archivalCycles: 0,
      memoriesProcessed: 0,
      patternsExtracted: 0,
      knowledgeNodesCreated: 0
    };
  }
  
  start() {
    if (this.isRunning) return;
    
    console.log('[LearningLoop] Starting autonomous learning...');
    this.isRunning = true;
    
    // Immediate learning cycle
    this.runLearningCycle();
    
    // Schedule periodic learning
    this.learningTimer = setInterval(() => {
      this.runLearningCycle();
    }, this.learningInterval);
    
    // Schedule periodic archival
    this.archivalTimer = setInterval(() => {
      this.runArchivalCycle();
    }, this.archivalInterval);
    
    console.log(`[LearningLoop] Active - Learning every ${this.learningInterval/60000}min, Archival every ${this.archivalInterval/3600000}hr`);
  }
  
  stop() {
    if (!this.isRunning) return;
    
    console.log('[LearningLoop] Stopping...');
    this.isRunning = false;
    
    if (this.learningTimer) clearInterval(this.learningTimer);
    if (this.archivalTimer) clearInterval(this.archivalTimer);
  }
  
  async runLearningCycle() {
    if (!this.isRunning) return;
    
    console.log('[LearningLoop] 🧠 Running learning cycle...');
    this.metrics.learningCycles++;
    
    try {
      // 1. Get recent memories from MnemonicArbiter
      let recentMemories = [];
      if (this.mnemonicArbiter) {
        try {
          // Query for recent interactions (recall auto-promotes from cold -> warm -> hot)
          const response = await this.mnemonicArbiter.recall('', 50);
          recentMemories = response.results || [];
        } catch (error) {
          console.warn('[LearningLoop] Failed to get memories:', error.message);
        }
      }
      
      if (recentMemories.length === 0) {
        console.log('[LearningLoop] No new memories to process');
        return;
      }
      
      console.log(`[LearningLoop] Processing ${recentMemories.length} memories...`);
      this.metrics.memoriesProcessed += recentMemories.length;
      
      // 2. Extract patterns with AnalystArbiter
      let patterns = [];
      if (this.analystArbiter) {
        try {
          patterns = await this.extractPatterns(recentMemories);
          this.metrics.patternsExtracted += patterns.length;
          console.log(`[LearningLoop] Extracted ${patterns.length} patterns`);
        } catch (error) {
          console.warn('[LearningLoop] Pattern extraction failed:', error.message);
        }
      }
      
      // 3. Synthesize learnings through TriBrain
      if (this.brain && patterns.length > 0) {
        try {
          const synthesis = await this.synthesizeLearnings(patterns);
          console.log(`[LearningLoop] Synthesized: ${synthesis.insights?.length || 0} insights`);
          this.metrics.knowledgeNodesCreated += synthesis.insights?.length || 0;
        } catch (error) {
          console.warn('[LearningLoop] Synthesis failed:', error.message);
        }
      }
      
      console.log('[LearningLoop] ✓ Learning cycle complete');
      
    } catch (error) {
      console.error('[LearningLoop] Learning cycle error:', error);
    }
  }
  
  async runArchivalCycle() {
    if (!this.isRunning) return;
    
    console.log('[LearningLoop] 📦 Running archival cycle...');
    this.metrics.archivalCycles++;
    
    try {
      // 1. Find cold data in MnemonicArbiter (>30 days old)
      if (this.mnemonicArbiter) {
        try {
          const coldStats = await this.mnemonicArbiter.getStats();
          console.log(`[LearningLoop] Cold tier: ${coldStats.cold?.count || 0} memories`);
          
          // TODO: Trigger cold tier scan and extract old memories
        } catch (error) {
          console.warn('[LearningLoop] Cold tier scan failed:', error.message);
        }
      }
      
      // 2. Compress and archive with ArchivistArbiter
      if (this.archivistArbiter) {
        try {
          const coldData = await this.archivistArbiter.findColdData(30);
          console.log(`[LearningLoop] Found ${coldData.length} files to archive`);
          
          if (coldData.length > 0) {
            await this.archivistArbiter.autonomousCompression(coldData);
            console.log(`[LearningLoop] Archived ${coldData.length} files`);
          }
        } catch (error) {
          console.warn('[LearningLoop] Archival failed:', error.message);
        }
      }
      
      console.log('[LearningLoop] ✓ Archival cycle complete');
      
    } catch (error) {
      console.error('[LearningLoop] Archival cycle error:', error);
    }
  }
  
  async extractPatterns(memories) {
    const patterns = [];
    
    // Group by topic/theme
    const topics = new Map();
    for (const memory of memories) {
      const content = memory.content || '';
      
      // Simple keyword extraction (in production, use NLP)
      const words = content.toLowerCase().split(/\W+/).filter(w => w.length > 4);
      for (const word of words) {
        if (!topics.has(word)) {
          topics.set(word, []);
        }
        topics.get(word).push(memory);
      }
    }
    
    // Find patterns (topics with >3 occurrences)
    for (const [topic, occurrences] of topics) {
      if (occurrences.length >= 3) {
        patterns.push({
          type: 'topic',
          value: topic,
          frequency: occurrences.length,
          examples: occurrences.slice(0, 3)
        });
      }
    }
    
    return patterns;
  }
  
  async synthesizeLearnings(patterns) {
    if (!this.brain) return { insights: [] };
    
    // Create learning prompt from patterns
    const topPatterns = patterns.slice(0, 10);
    const prompt = `Analyze these interaction patterns and extract key learnings:\n\n${
      topPatterns.map(p => `- ${p.type}: "${p.value}" (${p.frequency}x)`).join('\n')
    }\n\nWhat should SOMA learn from these patterns?`;
    
    try {
      const result = await this.brain.processQuery(prompt);
      
      // Parse insights from response
      const insights = this.parseInsights(result.text);
      
      return { insights, raw: result.text };
    } catch (error) {
      console.error('[LearningLoop] Synthesis error:', error);
      return { insights: [] };
    }
  }
  
  parseInsights(text) {
    // Simple parsing - split by lines, extract bullet points
    const lines = text.split('\n');
    const insights = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[-*•]\s+/)) {
        insights.push({
          type: 'insight',
          text: trimmed.replace(/^[-*•]\s+/, ''),
          timestamp: Date.now()
        });
      }
    }
    
    return insights;
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      isRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }
}

module.exports = LearningLoop;
