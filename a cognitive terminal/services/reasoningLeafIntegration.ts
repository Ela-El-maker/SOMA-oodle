/**
 * Reasoning Leaf Integration for SOMA
 * 
 * Combines:
 * - Reasoning Chamber (multi-brain consensus)
 * - Reasoning Leaf (preserved CoT, tension tracking)
 * - Task Assessment (complexity routing)
 * 
 * Benefits:
 * - Show reasoning process to user
 * - Track contradictions between brains
 * - Preserve reasoning for future reference
 * - Enable self-critique and revision
 */

// ========== Types ==========
type LeafID = string;

interface ReasoningLeaf {
  id: LeafID;
  content: string;
  brain: 'PROMETHEUS' | 'LOGOS' | 'AURORA' | 'THALAMUS' | 'USER';
  confidence: number;
  revisionCost: number;
  createdAtTurn: number;
  dependencies: LeafID[];
  challenges: LeafID[];
  fossilized: boolean;
}

interface Interleaf {
  from: LeafID;
  to: LeafID;
  relation: 'supports' | 'contradicts' | 'reframes';
  strength: number;
}

interface TensionNode {
  id: string;
  leafA: LeafID;
  leafB: LeafID;
  evidenceForA: number;
  evidenceForB: number;
  createdAtTurn: number;
  resolved: boolean;
  resolution?: 'A_wins' | 'B_wins' | 'synthesis';
}

interface TurnRecord {
  turn: number;
  intent: string;
  assumptionsIntroduced: LeafID[];
  assumptionsRetired: LeafID[];
  unresolvedTensions: string[];
  brainContributions: { brain: string; leafIds: LeafID[] }[];
}

// ========== Enhanced Reasoning Chamber ==========
export class EnhancedReasoningChamber {
  private leaves = new Map<LeafID, ReasoningLeaf>();
  private interleaves: Interleaf[] = [];
  private tensions = new Map<string, TensionNode>();
  private turnLedger: TurnRecord[] = [];
  private currentTurn = 0;

  // ========== Integration with QuadBrain ==========
  
  /**
   * Process query with multi-brain reasoning + leaf tracking
   */
  async processWithLeafTracking(
    query: string,
    brainResponses: { brain: string; response: string; confidence: number }[]
  ): Promise<{
    finalAnswer: string;
    reasoning: ReasoningLeaf[];
    tensions: TensionNode[];
    turnId: number;
  }> {
    this.nextTurn(query);

    const brainLeaves: { brain: string; leafIds: LeafID[] }[] = [];

    // Step 1: Create leaf for each brain's response
    for (const { brain, response, confidence } of brainResponses) {
      const leafId = this.addLeaf(response, [], brain as any, confidence);
      brainLeaves.push({ brain, leafIds: [leafId] });
    }

    // Step 2: Detect contradictions between brains
    this.detectContradictions(brainLeaves);

    // Step 3: Resolve tensions
    const resolvedAnswer = await this.resolveTensions();

    // Step 4: Record turn
    const currentTurnRecord = this.turnLedger[this.turnLedger.length - 1];
    currentTurnRecord.brainContributions = brainLeaves;

    return {
      finalAnswer: resolvedAnswer,
      reasoning: Array.from(this.leaves.values()).filter(
        l => l.createdAtTurn === this.currentTurn
      ),
      tensions: Array.from(this.tensions.values()).filter(
        t => t.createdAtTurn === this.currentTurn
      ),
      turnId: this.currentTurn
    };
  }

  /**
   * Interleaved reasoning for deep thinking
   * Each step builds on previous, tracks dependencies
   */
  async interleavedReasoning(
    query: string,
    maxSteps: number = 5
  ): Promise<{
    steps: ReasoningLeaf[];
    finalConclusion: string;
    conflictsResolved: number;
  }> {
    this.nextTurn(`Interleaved reasoning: ${query}`);

    const steps: LeafID[] = [];
    let conflictsResolved = 0;

    // Step 1: Initial hypothesis
    const hypothesis = this.addLeaf(
      `Initial hypothesis for: ${query}`,
      [],
      'LOGOS',
      0.5
    );
    steps.push(hypothesis);

    // Step 2-N: Build chain of reasoning
    for (let i = 0; i < maxSteps; i++) {
      const prevLeaf = this.leaves.get(steps[steps.length - 1])!;

      // Generate next step based on previous
      const nextStep = await this.generateNextReasoningStep(prevLeaf, query);
      
      if (nextStep) {
        steps.push(nextStep.id);

        // Link to previous step
        this.linkLeaves(steps[steps.length - 2], nextStep.id, 'supports');

        // Check for contradictions with earlier steps
        for (const earlierStepId of steps.slice(0, -2)) {
          if (this.detectContradiction(earlierStepId, nextStep.id)) {
            this.linkLeaves(earlierStepId, nextStep.id, 'contradicts');
            conflictsResolved += this.attemptSynthesis(earlierStepId, nextStep.id);
          }
        }

        // Stop if high confidence reached
        if (nextStep.confidence > 0.85) break;
      }
    }

    // Final conclusion
    const conclusion = this.synthesizeConclusion(steps);

    return {
      steps: steps.map(id => this.leaves.get(id)!),
      finalConclusion: conclusion,
      conflictsResolved
    };
  }

  // ========== Core Reasoning Leaf Operations ==========

  nextTurn(intent: string) {
    this.currentTurn++;
    this.turnLedger.push({
      turn: this.currentTurn,
      intent,
      assumptionsIntroduced: [],
      assumptionsRetired: [],
      unresolvedTensions: Array.from(this.tensions.values())
        .filter(t => !t.resolved)
        .map(t => t.id),
      brainContributions: []
    });
    this.decayConfidence();
  }

  addLeaf(
    content: string,
    deps: LeafID[] = [],
    brain: ReasoningLeaf['brain'] = 'LOGOS',
    confidence: number = 0.6
  ): LeafID {
    const id = this.generateId();
    this.leaves.set(id, {
      id,
      content,
      brain,
      confidence,
      revisionCost: deps.length + 1,
      createdAtTurn: this.currentTurn,
      dependencies: deps,
      challenges: [],
      fossilized: false
    });
    this.turnLedger.at(-1)?.assumptionsIntroduced.push(id);
    return id;
  }

  linkLeaves(from: LeafID, to: LeafID, relation: Interleaf['relation']) {
    this.interleaves.push({ from, to, relation, strength: 0.5 });
    if (relation === 'contradicts') {
      this.spawnTension(from, to);
    }
  }

  fossilizeLeaf(id: LeafID) {
    const leaf = this.leaves.get(id);
    if (!leaf) return;
    leaf.fossilized = true;
    leaf.confidence = Math.min(leaf.confidence, 0.85);
  }

  boostConfidence(id: LeafID, amount = 0.1) {
    const leaf = this.leaves.get(id);
    if (!leaf) return;
    leaf.confidence = Math.min(1, leaf.confidence + amount);
  }

  // ========== Tension Management ==========

  private spawnTension(a: LeafID, b: LeafID) {
    const id = `${a}::${b}`;
    if (this.tensions.has(id)) return;

    this.tensions.set(id, {
      id,
      leafA: a,
      leafB: b,
      evidenceForA: 0,
      evidenceForB: 0,
      createdAtTurn: this.currentTurn,
      resolved: false
    });
  }

  addEvidence(tensionId: string, favor: 'A' | 'B', weight = 1) {
    const t = this.tensions.get(tensionId);
    if (!t || t.resolved) return;

    if (favor === 'A') t.evidenceForA += weight;
    else t.evidenceForB += weight;

    this.tryResolveTension(t);
  }

  private tryResolveTension(t: TensionNode) {
    const total = t.evidenceForA + t.evidenceForB;
    if (total < 3) return;

    if (Math.abs(t.evidenceForA - t.evidenceForB) >= 2) {
      t.resolved = true;
      const winner = t.evidenceForA > t.evidenceForB ? t.leafA : t.leafB;
      t.resolution = t.evidenceForA > t.evidenceForB ? 'A_wins' : 'B_wins';
      this.boostConfidence(winner, 0.15);
    }
  }

  // ========== Helper Methods ==========

  private detectContradictions(
    brainLeaves: { brain: string; leafIds: LeafID[] }[]
  ) {
    // Compare each brain's leaves with others
    for (let i = 0; i < brainLeaves.length; i++) {
      for (let j = i + 1; j < brainLeaves.length; j++) {
        const leavesA = brainLeaves[i].leafIds;
        const leavesB = brainLeaves[j].leafIds;

        for (const leafA of leavesA) {
          for (const leafB of leavesB) {
            if (this.detectContradiction(leafA, leafB)) {
              this.linkLeaves(leafA, leafB, 'contradicts');
            }
          }
        }
      }
    }
  }

  private detectContradiction(leafA: LeafID, leafB: LeafID): boolean {
    const a = this.leaves.get(leafA)?.content.toLowerCase() || '';
    const b = this.leaves.get(leafB)?.content.toLowerCase() || '';

    // Simple heuristic: look for negation patterns
    const contradictionWords = ['not', 'never', 'false', 'incorrect', 'wrong'];
    
    // If one contains negation and they share key terms, likely contradiction
    const aHasNegation = contradictionWords.some(w => a.includes(w));
    const bHasNegation = contradictionWords.some(w => b.includes(w));

    if (aHasNegation !== bHasNegation) {
      // Check if they share subject matter
      const aWords = new Set(a.split(' ').filter(w => w.length > 4));
      const bWords = new Set(b.split(' ').filter(w => w.length > 4));
      const overlap = [...aWords].filter(w => bWords.has(w));
      return overlap.length > 2;
    }

    return false;
  }

  private async generateNextReasoningStep(
    prevLeaf: ReasoningLeaf,
    query: string
  ): Promise<ReasoningLeaf | null> {
    // Placeholder: would call LOGOS brain to generate next step
    // For now, return null to end chain
    return null;
  }

  private attemptSynthesis(leafA: LeafID, leafB: LeafID): number {
    const tensionId = `${leafA}::${leafB}`;
    const tension = this.tensions.get(tensionId);
    
    if (!tension) return 0;

    // Simple synthesis: boost both slightly (compromise)
    this.boostConfidence(leafA, 0.05);
    this.boostConfidence(leafB, 0.05);
    
    tension.resolved = true;
    tension.resolution = 'synthesis';
    
    return 1;
  }

  private synthesizeConclusion(steps: LeafID[]): string {
    const leaves = steps.map(id => this.leaves.get(id)!);
    const highestConfidence = leaves.reduce((max, leaf) => 
      leaf.confidence > max.confidence ? leaf : max
    );
    return highestConfidence.content;
  }

  private async resolveTensions(): Promise<string> {
    const unresolved = Array.from(this.tensions.values()).filter(t => !t.resolved);
    
    for (const tension of unresolved) {
      // Add equal evidence to trigger resolution logic
      this.addEvidence(tension.id, 'A', 2);
      this.addEvidence(tension.id, 'B', 1);
    }

    // Return highest confidence leaf
    const allLeaves = Array.from(this.leaves.values())
      .filter(l => l.createdAtTurn === this.currentTurn);
    
    if (allLeaves.length === 0) return '';
    
    const best = allLeaves.reduce((max, leaf) => 
      leaf.confidence > max.confidence ? leaf : max
    );
    
    return best.content;
  }

  private decayConfidence() {
    for (const leaf of this.leaves.values()) {
      if (!leaf.fossilized && leaf.createdAtTurn < this.currentTurn - 2) {
        leaf.confidence *= 0.98;
      }
    }
  }

  private generateId(): LeafID {
    return `leaf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  // ========== Introspection ==========

  metaScan(): string {
    const unresolved = Array.from(this.tensions.values()).filter(t => !t.resolved);
    if (unresolved.length > 3) {
      return 'Meta alert: excessive unresolved tensions. Reframe or prune.';
    }
    return 'Meta scan: reasoning stable.';
  }

  snapshot() {
    return {
      turn: this.currentTurn,
      leaves: Array.from(this.leaves.values()),
      interleaves: this.interleaves,
      tensions: Array.from(this.tensions.values()),
      ledger: this.turnLedger
    };
  }

  /**
   * Format reasoning chain for display
   */
  formatReasoningChain(turnId?: number): string {
    const turn = turnId || this.currentTurn;
    const leaves = Array.from(this.leaves.values())
      .filter(l => l.createdAtTurn === turn)
      .sort((a, b) => a.createdAtTurn - b.createdAtTurn);

    let output = `## 🧠 Reasoning Process (Turn ${turn})\n\n`;

    for (const leaf of leaves) {
      const icon = leaf.brain === 'PROMETHEUS' ? '⚡' : 
                   leaf.brain === 'LOGOS' ? '🔬' :
                   leaf.brain === 'AURORA' ? '🌟' : '🛡️';
      
      output += `${icon} **${leaf.brain}** (confidence: ${(leaf.confidence * 100).toFixed(0)}%)\n`;
      output += `   ${leaf.content}\n\n`;
    }

    const tensions = Array.from(this.tensions.values())
      .filter(t => t.createdAtTurn === turn && !t.resolved);
    
    if (tensions.length > 0) {
      output += `### ⚠️ Tensions Detected:\n`;
      for (const t of tensions) {
        const leafA = this.leaves.get(t.leafA);
        const leafB = this.leaves.get(t.leafB);
        output += `- ${leafA?.brain} vs ${leafB?.brain}\n`;
      }
    }

    return output;
  }
}

// Singleton export
export const enhancedReasoningChamber = new EnhancedReasoningChamber();
