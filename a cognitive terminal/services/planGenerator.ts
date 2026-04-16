/**
 * Plan Generator - Production Grade
 * 
 * Generates detailed execution plans for complex tasks
 * Integrates with:
 * - QuadBrain (LOGOS for logic, AURORA for creativity, PROMETHEUS for strategy)
 * - CodeObservationArbiter (codebase awareness)
 * - RecursiveSelfModel (capability assessment)
 * - AdaptiveLearningPlanner (learning opportunities)
 */

import { somaApiClient } from './somaApiClient';
import type { Task } from './taskAssessmentService';

export interface ExecutionStep {
  id: string;
  description: string;
  tool: string;
  parameters: Record<string, any>;
  dependencies: string[]; // Step IDs that must complete first
  reasoning: string; // Why this step is needed
  estimatedDuration: number; // milliseconds
  validation?: string; // How to verify success
}

export interface ExecutionPlan {
  id: string;
  task: Task;
  steps: ExecutionStep[];
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed';
  createdAt: number;
  approvedAt?: number;
  completedAt?: number;
  reasoning: string; // Overall strategy
  risks: string[]; // Identified risks
  rollbackStrategy?: string; // How to undo if needed
}

export class PlanGenerator {
  /**
   * Generate execution plan for a task
   */
  async generatePlan(task: Task): Promise<ExecutionPlan> {
    console.log('[PlanGenerator] Generating plan for:', task.query);

    try {
      // Get codebase context from CodeObservationArbiter
      const codebaseContext = await this.getCodebaseContext(task);

      // Use QuadBrain to generate plan
      const plan = await this.generateWithQuadBrain(task, codebaseContext);

      return {
        id: `plan_${Date.now()}`,
        task,
        steps: plan.steps,
        status: 'pending',
        createdAt: Date.now(),
        reasoning: plan.reasoning,
        risks: plan.risks,
        rollbackStrategy: plan.rollbackStrategy
      };

    } catch (error) {
      console.error('[PlanGenerator] Failed to generate plan:', error);
      
      // Fallback to heuristic planning
      return this.generateHeuristicPlan(task);
    }
  }

  /**
   * Get codebase context from CodeObservationArbiter
   */
  private async getCodebaseContext(task: Task): Promise<any> {
    try {
      const response = await fetch('http://localhost:3001/api/code-observation/insights');
      if (response.ok) {
        const insights = await response.json();
        console.log('[PlanGenerator] Got codebase insights:', insights);
        return insights;
      }
    } catch (error) {
      console.warn('[PlanGenerator] CodeObservationArbiter unavailable');
    }
    return null;
  }

  /**
   * Generate plan using QuadBrain
   */
  private async generateWithQuadBrain(task: Task, codebaseContext: any): Promise<any> {
    const contextStr = codebaseContext ? JSON.stringify(codebaseContext, null, 2) : 'No codebase context available';

    // Use PROMETHEUS (strategic brain) for high-level planning
    const strategicResponse = await somaApiClient.reason({
      query: `Create a strategic execution plan for this task:

Task: "${task.query}"
Complexity: ${task.complexity}
Category: ${task.category}
Required Tools: ${task.requiredTools.join(', ')}

Codebase Context:
${contextStr.substring(0, 1000)}

Respond with a JSON plan:
{
  "reasoning": "Overall strategy and approach",
  "risks": ["risk1", "risk2"],
  "rollbackStrategy": "How to undo if things go wrong",
  "steps": [
    {
      "description": "What this step does",
      "tool": "toolName",
      "parameters": { "param": "value" },
      "dependencies": [],
      "reasoning": "Why this step is needed",
      "estimatedDuration": 5000,
      "validation": "How to verify success"
    }
  ]
}

Make the plan detailed, safe, and production-ready.`,
      mode: 'strategic',
      context: {
        brain: 'PROMETHEUS',
        task: 'plan-generation',
        codebaseAware: !!codebaseContext
      }
    });

    // Parse the plan
    const plan = this.parseQuadBrainPlan(strategicResponse.response);

    // Enhance with AURORA for creative optimizations
    if (task.complexity === 'complex') {
      const creativeResponse = await somaApiClient.reason({
        query: `Review this execution plan and suggest creative improvements or optimizations:

${JSON.stringify(plan, null, 2)}

What creative enhancements or alternative approaches could make this better?`,
        mode: 'creative',
        context: {
          brain: 'AURORA',
          task: 'plan-enhancement'
        }
      });

      // Add creative insights to reasoning
      plan.reasoning += `\n\nCreative Enhancements: ${creativeResponse.response.substring(0, 200)}`;
    }

    return plan;
  }

  /**
   * Parse QuadBrain's plan response
   */
  private parseQuadBrainPlan(response: string): any {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Add IDs to steps if missing
        if (parsed.steps) {
          parsed.steps = parsed.steps.map((step: any, index: number) => ({
            id: step.id || `step_${index + 1}`,
            description: step.description || 'No description',
            tool: step.tool || 'unknown',
            parameters: step.parameters || {},
            dependencies: step.dependencies || [],
            reasoning: step.reasoning || '',
            estimatedDuration: step.estimatedDuration || 5000,
            validation: step.validation || ''
          }));
        }

        return {
          reasoning: parsed.reasoning || 'AI-generated plan',
          risks: parsed.risks || [],
          rollbackStrategy: parsed.rollbackStrategy || 'Manual rollback required',
          steps: parsed.steps || []
        };
      }

      // If no valid JSON, create basic plan from text
      return this.extractPlanFromText(response);

    } catch (error) {
      console.error('[PlanGenerator] Failed to parse QuadBrain response:', error);
      throw error;
    }
  }

  /**
   * Extract plan from text response (fallback)
   */
  private extractPlanFromText(text: string): any {
    const steps: ExecutionStep[] = [];
    
    // Look for numbered steps or bullet points
    const stepMatches = text.match(/(?:^|\n)(?:\d+\.|[-*])\s*(.+?)(?=\n|$)/gm);
    
    if (stepMatches) {
      stepMatches.forEach((match, index) => {
        const description = match.replace(/^[\d\.\-\*\s]+/, '').trim();
        steps.push({
          id: `step_${index + 1}`,
          description,
          tool: 'runCommand', // Default tool
          parameters: {},
          dependencies: index > 0 ? [`step_${index}`] : [],
          reasoning: 'Extracted from AI response',
          estimatedDuration: 10000,
          validation: 'Check console output'
        });
      });
    }

    return {
      reasoning: 'Plan extracted from text response',
      risks: ['Plan may need refinement'],
      rollbackStrategy: 'Manual rollback',
      steps
    };
  }

  /**
   * Generate heuristic plan (fallback when AI unavailable)
   */
  private generateHeuristicPlan(task: Task): ExecutionPlan {
    const steps: ExecutionStep[] = [];
    let stepId = 1;

    // Generate steps based on required tools
    if (task.requiredTools.includes('analyzeCode')) {
      steps.push({
        id: `step_${stepId++}`,
        description: 'Analyze codebase structure',
        tool: 'analyzeCode',
        parameters: { path: '.' },
        dependencies: [],
        reasoning: 'Understand current code before making changes',
        estimatedDuration: 5000,
        validation: 'Code analysis results received'
      });
    }

    if (task.requiredTools.includes('readFile')) {
      steps.push({
        id: `step_${stepId++}`,
        description: 'Read relevant files',
        tool: 'readFile',
        parameters: {},
        dependencies: steps.length > 0 ? [steps[steps.length - 1].id] : [],
        reasoning: 'Need to see existing code',
        estimatedDuration: 2000,
        validation: 'File contents retrieved'
      });
    }

    if (task.requiredTools.includes('editFile') || task.requiredTools.includes('createFile')) {
      steps.push({
        id: `step_${stepId++}`,
        description: 'Make code changes',
        tool: task.requiredTools.includes('createFile') ? 'createFile' : 'editFile',
        parameters: {},
        dependencies: steps.length > 0 ? [steps[steps.length - 1].id] : [],
        reasoning: 'Implement the requested changes',
        estimatedDuration: 10000,
        validation: 'Code changes applied successfully'
      });
    }

    if (task.requiredTools.includes('runCommand')) {
      steps.push({
        id: `step_${stepId++}`,
        description: 'Validate changes',
        tool: 'runCommand',
        parameters: { command: 'npm test' },
        dependencies: steps.length > 0 ? [steps[steps.length - 1].id] : [],
        reasoning: 'Ensure changes don\'t break anything',
        estimatedDuration: 15000,
        validation: 'Tests pass'
      });
    }

    if (task.requiredTools.includes('git')) {
      steps.push({
        id: `step_${stepId++}`,
        description: 'Commit changes',
        tool: 'git',
        parameters: { action: 'commit', message: `Implement: ${task.query}` },
        dependencies: steps.length > 0 ? [steps[steps.length - 1].id] : [],
        reasoning: 'Save work to version control',
        estimatedDuration: 3000,
        validation: 'Commit created'
      });
    }

    return {
      id: `plan_${Date.now()}`,
      task,
      steps,
      status: 'pending',
      createdAt: Date.now(),
      reasoning: 'Heuristic plan generated (AI unavailable)',
      risks: ['Plan generated without AI assistance - review carefully'],
      rollbackStrategy: 'Use git reset to undo changes'
    };
  }

  /**
   * Validate plan before execution
   */
  async validatePlan(plan: ExecutionPlan): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check for empty steps
    if (plan.steps.length === 0) {
      issues.push('Plan has no steps');
    }

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (stepId: string): boolean => {
      if (!visited.has(stepId)) {
        visited.add(stepId);
        recursionStack.add(stepId);

        const step = plan.steps.find(s => s.id === stepId);
        if (step) {
          for (const dep of step.dependencies) {
            if (!visited.has(dep) && hasCycle(dep)) {
              return true;
            } else if (recursionStack.has(dep)) {
              return true;
            }
          }
        }
      }
      recursionStack.delete(stepId);
      return false;
    };

    for (const step of plan.steps) {
      if (hasCycle(step.id)) {
        issues.push('Plan has circular dependencies');
        break;
      }
    }

    // Check for missing dependencies
    const stepIds = new Set(plan.steps.map(s => s.id));
    for (const step of plan.steps) {
      for (const dep of step.dependencies) {
        if (!stepIds.has(dep)) {
          issues.push(`Step ${step.id} depends on non-existent step ${dep}`);
        }
      }
    }

    // Check for risky operations without validation
    for (const step of plan.steps) {
      if (['editFile', 'deleteFile', 'runCommand'].includes(step.tool) && !step.validation) {
        issues.push(`Risky step ${step.id} (${step.tool}) has no validation`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// Singleton instance
export const planGenerator = new PlanGenerator();
