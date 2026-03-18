/**
 * Task Assessment Service
 * 
 * Analyzes user queries to determine:
 * - Complexity level (simple/medium/complex)
 * - Whether planning is required
 * - Required tools for execution
 * - Estimated steps
 * 
 * Integrates with:
 * - SomaApiClient (QuadBrain reasoning)
 * - RecursiveSelfModel (capability awareness)
 * - CodeObservationArbiter (codebase context)
 */

import { somaApiClient } from './somaApiClient';

export interface Task {
  id: string;
  query: string;
  complexity: 'simple' | 'medium' | 'complex';
  requiresPlanning: boolean;
  requiredTools: string[];
  estimatedSteps: number;
  category: 'code' | 'information' | 'file-operation' | 'system' | 'learning';
  reasoning: string; // Why this classification was made
}

export interface TaskAssessmentResult {
  task: Task;
  shouldCreatePlan: boolean;
  confidence: number;
}

export class TaskAssessmentService {
  private simplePatterns = [
    /^(ls|pwd|cd|cat|echo|help|clear|whoami)/i,
    /^(what is|who is|explain)/i,
    /^(show|display|list)/i
  ];

  private complexPatterns = [
    /(create|build|implement|develop|refactor|optimize)/i,
    /(add.*feature|new.*arbiter|modify.*system)/i,
    /(fix.*bug|debug.*issue|solve.*problem)/i,
    /(analyze.*and.*suggest|review.*and.*improve)/i,
    /(integrate|connect|setup)/i
  ];

  private codeKeywords = [
    'arbiter', 'code', 'function', 'class', 'file', 'implementation',
    'bug', 'error', 'typescript', 'javascript', 'refactor'
  ];

  private fileOperationKeywords = [
    'create file', 'edit file', 'delete file', 'move file',
    'read file', 'write to', 'save', 'modify file'
  ];

  /**
   * Assess a user query and return task metadata
   */
  async assessTask(query: string): Promise<TaskAssessmentResult> {
    console.log('[TaskAssessment] Analyzing query:', query);

    // TIER 0: Quick responses (greetings, simple reactions)
    if (this.isQuickResponse(query)) {
      const task: Task = {
        id: `task_${Date.now()}`,
        query,
        complexity: 'simple',
        requiresPlanning: false,
        requiredTools: [],
        estimatedSteps: 0,
        category: 'information',
        reasoning: 'Quick conversational response - no reasoning needed'
      };
      return {
        task,
        shouldCreatePlan: false,
        confidence: 1.0
      };
    }

    // TIER 1: Simple commands
    if (this.isSimpleCommand(query)) {
      return this.createSimpleTask(query);
    }

    // TIER 2: Deep thinking (use interleaved reasoning, preserve thinking)
    if (this.needsDeepThinking(query)) {
      const task: Task = {
        id: `task_${Date.now()}`,
        query,
        complexity: 'medium',
        requiresPlanning: false, // No execution plan, but use deep reasoning
        requiredTools: ['deepReasoning'],
        estimatedSteps: 1,
        category: 'information',
        reasoning: 'Complex analysis requiring deep reasoning with CoT'
      };
      return {
        task,
        shouldCreatePlan: false,
        confidence: 0.85
      };
    }

    // TIER 3: Complex execution tasks (create, build, implement)
    if (this.looksComplex(query)) {
      return await this.assessComplexTask(query);
    }

    // TIER 4: Medium complexity - standard reasoning
    return await this.assessMediumTask(query);
  }

  /**
   * Check if task should create a plan
   */
  async shouldCreatePlan(task: Task): Promise<boolean> {
    // Always plan for complex tasks
    if (task.complexity === 'complex') return true;

    // Plan for medium tasks with multiple steps
    if (task.complexity === 'medium' && task.estimatedSteps >= 3) return true;

    // Plan for code modification tasks
    if (task.category === 'code' && task.requiredTools.includes('editFile')) return true;

    return false;
  }

  /**
   * Simple command detection (ls, pwd, cat, etc.)
   */
  private isSimpleCommand(query: string): boolean {
    return this.simplePatterns.some(pattern => pattern.test(query.trim()));
  }

  /**
   * Quick response detection - greetings, short reactions, casual questions
   */
  private isQuickResponse(query: string): boolean {
    const lower = query.trim().toLowerCase();
    
    // Single word greetings/reactions
    const singleWord = /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|bye|cool|nice)$/i;
    if (singleWord.test(lower)) return true;
    
    // Common greeting patterns (with or without punctuation)
    const greetingPatterns = [
      /^(hi|hello|hey)\s+(there|soma|everyone)?[!.?]?$/i,
      /^(hi|hello|hey)[,]?\s+(how are you|how's it going|what's up|wassup)[?!.]?$/i,
      /^how are you[?!.]?$/i,
      /^(good|great)\s+(morning|afternoon|evening|night)[!.]?$/i,
      /^(thanks|thank you)\s+(so much|very much|a lot)?[!.]?$/i
    ];
    
    return query.length < 40 && greetingPatterns.some(p => p.test(lower));
  }

  /**
   * Needs deep thinking - complex reasoning, analysis, multi-step logic
   */
  private needsDeepThinking(query: string): boolean {
    const deepKeywords = [
      'analyze', 'compare', 'evaluate', 'explain why', 'how does',
      'what if', 'pros and cons', 'trade-offs', 'implications',
      'reasoning', 'logic', 'philosophy', 'ethical'
    ];
    const lower = query.toLowerCase();
    return deepKeywords.some(kw => lower.includes(kw)) || query.length > 100;
  }

  /**
   * Complex query detection
   */
  private looksComplex(query: string): boolean {
    return this.complexPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Create simple task metadata
   */
  private createSimpleTask(query: string): TaskAssessmentResult {
    const task: Task = {
      id: `task_${Date.now()}`,
      query,
      complexity: 'simple',
      requiresPlanning: false,
      requiredTools: this.detectRequiredTools(query),
      estimatedSteps: 1,
      category: this.detectCategory(query),
      reasoning: 'Simple command or query - direct execution'
    };

    return {
      task,
      shouldCreatePlan: false,
      confidence: 0.95
    };
  }

  /**
   * Assess medium complexity tasks
   */
  private async assessMediumTask(query: string): Promise<TaskAssessmentResult> {
    const requiredTools = this.detectRequiredTools(query);
    const estimatedSteps = Math.max(2, requiredTools.length);

    const task: Task = {
      id: `task_${Date.now()}`,
      query,
      complexity: 'medium',
      requiresPlanning: estimatedSteps >= 3,
      requiredTools,
      estimatedSteps,
      category: this.detectCategory(query),
      reasoning: 'Multi-step task with straightforward requirements'
    };

    return {
      task,
      shouldCreatePlan: estimatedSteps >= 3,
      confidence: 0.75
    };
  }

  /**
   * Assess complex tasks using QuadBrain
   */
  private async assessComplexTask(query: string): Promise<TaskAssessmentResult> {
    console.log('[TaskAssessment] Complex task detected, consulting QuadBrain...');

    try {
      // Use QuadBrain LOGOS for analytical assessment
      const response = await somaApiClient.reason({
        query: `Analyze this task and provide a structured assessment in JSON format:
        
Task: "${query}"

Respond with:
{
  "complexity": "medium" or "complex",
  "estimatedSteps": <number>,
  "requiredTools": ["readFile", "editFile", "runCommand", etc.],
  "category": "code" | "information" | "file-operation" | "system" | "learning",
  "reasoning": "Brief explanation of complexity and approach"
}`,
        mode: 'analytical',
        context: {
          brain: 'LOGOS',
          task: 'task-assessment'
        }
      });

      // Parse QuadBrain response
      const assessment = this.parseQuadBrainAssessment(response.response);

      const task: Task = {
        id: `task_${Date.now()}`,
        query,
        complexity: assessment.complexity || 'complex',
        requiresPlanning: true,
        requiredTools: assessment.requiredTools || this.detectRequiredTools(query),
        estimatedSteps: assessment.estimatedSteps || 5,
        category: assessment.category || this.detectCategory(query),
        reasoning: assessment.reasoning || 'Complex multi-step task requiring careful planning'
      };

      return {
        task,
        shouldCreatePlan: true,
        confidence: response.confidence
      };

    } catch (error) {
      console.warn('[TaskAssessment] QuadBrain unavailable, using heuristics:', error);

      // Fallback to heuristic assessment
      const task: Task = {
        id: `task_${Date.now()}`,
        query,
        complexity: 'complex',
        requiresPlanning: true,
        requiredTools: this.detectRequiredTools(query),
        estimatedSteps: 5,
        category: this.detectCategory(query),
        reasoning: 'Complex task detected (QuadBrain unavailable, using heuristics)'
      };

      return {
        task,
        shouldCreatePlan: true,
        confidence: 0.6
      };
    }
  }

  /**
   * Parse QuadBrain's assessment response
   */
  private parseQuadBrainAssessment(response: string): Partial<Task> {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // If no JSON, parse text manually
      return {
        reasoning: response.substring(0, 200)
      };
    } catch (error) {
      console.warn('[TaskAssessment] Failed to parse QuadBrain response:', error);
      return {};
    }
  }

  /**
   * Detect required tools based on query keywords
   */
  private detectRequiredTools(query: string): string[] {
    const tools = new Set<string>();
    const lowerQuery = query.toLowerCase();

    // File operations
    if (lowerQuery.includes('read') || lowerQuery.includes('show') || lowerQuery.includes('cat')) {
      tools.add('readFile');
    }
    if (lowerQuery.includes('create') || lowerQuery.includes('write')) {
      tools.add('createFile');
    }
    if (lowerQuery.includes('edit') || lowerQuery.includes('modify') || lowerQuery.includes('change')) {
      tools.add('editFile');
    }
    if (lowerQuery.includes('delete') || lowerQuery.includes('remove')) {
      tools.add('deleteFile');
    }

    // Code analysis
    if (this.codeKeywords.some(kw => lowerQuery.includes(kw))) {
      tools.add('analyzeCode');
    }

    // Search
    if (lowerQuery.includes('find') || lowerQuery.includes('search') || lowerQuery.includes('grep')) {
      tools.add('grep');
    }

    // Command execution
    if (lowerQuery.includes('run') || lowerQuery.includes('execute') || lowerQuery.includes('test')) {
      tools.add('runCommand');
    }

    // Git operations
    if (lowerQuery.includes('commit') || lowerQuery.includes('git')) {
      tools.add('git');
    }

    return Array.from(tools);
  }

  /**
   * Detect task category
   */
  private detectCategory(query: string): Task['category'] {
    const lowerQuery = query.toLowerCase();

    if (this.codeKeywords.some(kw => lowerQuery.includes(kw))) {
      return 'code';
    }

    if (this.fileOperationKeywords.some(kw => lowerQuery.includes(kw))) {
      return 'file-operation';
    }

    if (lowerQuery.includes('learn') || lowerQuery.includes('teach') || lowerQuery.includes('explain')) {
      return 'learning';
    }

    if (lowerQuery.includes('system') || lowerQuery.includes('config') || lowerQuery.includes('setup')) {
      return 'system';
    }

    return 'information';
  }
}

// Singleton instance
export const taskAssessmentService = new TaskAssessmentService();
