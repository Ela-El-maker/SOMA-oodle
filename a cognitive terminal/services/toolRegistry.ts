/**
 * Tool Registry - Production Grade
 * 
 * Complete toolkit for autonomous operation:
 * - File operations (read, write, edit, delete)
 * - Code analysis (CodeObservationArbiter integration)
 * - Command execution (shell commands)
 * - Git operations (commit, diff, status)
 * - Search operations (grep, find)
 */

import { apiClient } from './apiClient';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface Tool {
  name: string;
  description: string;
  requiresApproval: boolean;
  isRisky: boolean;
  execute: (params: Record<string, any>) => Promise<ToolResult>;
  validate: (params: Record<string, any>) => boolean;
}

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  constructor() {
    this.registerCoreTools();
  }

  /**
   * Register all core tools
   */
  private registerCoreTools() {
    // File operations
    this.registerTool(this.createReadFileTool());
    this.registerTool(this.createWriteFileTool());
    this.registerTool(this.createEditFileTool());
    this.registerTool(this.createCreateFileTool());
    this.registerTool(this.createDeleteFileTool());
    
    // Code analysis
    this.registerTool(this.createAnalyzeCodeTool());
    
    // Search
    this.registerTool(this.createGrepTool());
    this.registerTool(this.createFindFilesTool());
    
    // Command execution
    this.registerTool(this.createRunCommandTool());
    
    // Git operations
    this.registerTool(this.createGitDiffTool());
    this.registerTool(this.createGitStatusTool());
    this.registerTool(this.createGitCommitTool());

    console.log(`[ToolRegistry] Registered ${this.tools.size} tools`);
  }

  /**
   * Register a tool
   */
  registerTool(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  /**
   * Execute a tool
   */
  async executeTool(name: string, params: Record<string, any>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' not found`
      };
    }

    // Validate parameters
    if (!tool.validate(params)) {
      return {
        success: false,
        error: `Invalid parameters for tool '${name}'`
      };
    }

    console.log(`[ToolRegistry] Executing ${name} with params:`, params);

    try {
      const result = await tool.execute(params);
      console.log(`[ToolRegistry] ${name} completed:`, result.success ? 'SUCCESS' : 'FAILED');
      return result;
    } catch (error: any) {
      console.error(`[ToolRegistry] ${name} threw error:`, error);
      return {
        success: false,
        error: error.message || 'Tool execution failed'
      };
    }
  }

  /**
   * Get available tools
   */
  getAvailableTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  // ==================== TOOL DEFINITIONS ====================

  private createReadFileTool(): Tool {
    return {
      name: 'readFile',
      description: 'Read contents of a file',
      requiresApproval: false,
      isRisky: false,
      validate: (params) => typeof params.path === 'string',
      execute: async (params) => {
        try {
          const response = await fetch('http://localhost:3001/api/fs/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: params.path })
          });

          if (!response.ok) {
            return {
              success: false,
              error: `Failed to read file: ${response.statusText}`
            };
          }

          const data = await response.json();
          return {
            success: true,
            data: data.content,
            metadata: {
              path: params.path,
              size: data.size,
              lines: data.content.split('\n').length
            }
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
  }

  private createWriteFileTool(): Tool {
    return {
      name: 'writeFile',
      description: 'Write content to a file (overwrites existing)',
      requiresApproval: true,
      isRisky: true,
      validate: (params) => typeof params.path === 'string' && typeof params.content === 'string',
      execute: async (params) => {
        try {
          const response = await fetch('http://localhost:3001/api/fs/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path: params.path,
              content: params.content
            })
          });

          if (!response.ok) {
            return {
              success: false,
              error: `Failed to write file: ${response.statusText}`
            };
          }

          return {
            success: true,
            data: `File written: ${params.path}`,
            metadata: {
              path: params.path,
              bytesWritten: params.content.length
            }
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
  }

  private createEditFileTool(): Tool {
    return {
      name: 'editFile',
      description: 'Edit file by search and replace',
      requiresApproval: true,
      isRisky: true,
      validate: (params) => 
        typeof params.path === 'string' &&
        typeof params.search === 'string' &&
        typeof params.replace === 'string',
      execute: async (params) => {
        try {
          // Read current content
          const readResult = await this.executeTool('readFile', { path: params.path });
          if (!readResult.success) {
            return readResult;
          }

          const content = readResult.data as string;
          
          // Perform replacement
          if (!content.includes(params.search)) {
            return {
              success: false,
              error: `Search string not found in ${params.path}`
            };
          }

          const newContent = content.replace(params.search, params.replace);
          
          // Write back
          const writeResult = await this.executeTool('writeFile', {
            path: params.path,
            content: newContent
          });

          return {
            success: writeResult.success,
            data: writeResult.success ? `Edited ${params.path}` : writeResult.error,
            metadata: {
              path: params.path,
              replacements: 1
            }
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
  }

  private createCreateFileTool(): Tool {
    return {
      name: 'createFile',
      description: 'Create a new file',
      requiresApproval: true,
      isRisky: false,
      validate: (params) => typeof params.path === 'string' && typeof params.content === 'string',
      execute: async (params) => {
        // Same as writeFile for now
        return this.executeTool('writeFile', params);
      }
    };
  }

  private createDeleteFileTool(): Tool {
    return {
      name: 'deleteFile',
      description: 'Delete a file',
      requiresApproval: true,
      isRisky: true,
      validate: (params) => typeof params.path === 'string',
      execute: async (params) => {
        try {
          const response = await fetch('http://localhost:3001/api/fs/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: params.path })
          });

          if (!response.ok) {
            return {
              success: false,
              error: `Failed to delete file: ${response.statusText}`
            };
          }

          return {
            success: true,
            data: `Deleted ${params.path}`
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
  }

  private createAnalyzeCodeTool(): Tool {
    return {
      name: 'analyzeCode',
      description: 'Analyze code using CodeObservationArbiter',
      requiresApproval: false,
      isRisky: false,
      validate: (params) => typeof params.path === 'string',
      execute: async (params) => {
        try {
          const response = await fetch('http://localhost:3001/api/code-observation/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: params.path })
          });

          if (!response.ok) {
            return {
              success: false,
              error: 'CodeObservationArbiter unavailable'
            };
          }

          const analysis = await response.json();
          return {
            success: true,
            data: analysis,
            metadata: {
              path: params.path
            }
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
  }

  private createGrepTool(): Tool {
    return {
      name: 'grep',
      description: 'Search for pattern in files',
      requiresApproval: false,
      isRisky: false,
      validate: (params) => typeof params.pattern === 'string',
      execute: async (params) => {
        try {
          const response = await fetch('http://localhost:3001/api/fs/grep', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pattern: params.pattern,
              path: params.path || '.',
              recursive: params.recursive !== false
            })
          });

          if (!response.ok) {
            return {
              success: false,
              error: `Grep failed: ${response.statusText}`
            };
          }

          const results = await response.json();
          return {
            success: true,
            data: results,
            metadata: {
              matchCount: results.length
            }
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
  }

  private createFindFilesTool(): Tool {
    return {
      name: 'findFiles',
      description: 'Find files matching pattern',
      requiresApproval: false,
      isRisky: false,
      validate: (params) => typeof params.pattern === 'string',
      execute: async (params) => {
        try {
          const response = await fetch('http://localhost:3001/api/fs/find', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pattern: params.pattern,
              path: params.path || '.'
            })
          });

          if (!response.ok) {
            return {
              success: false,
              error: `Find failed: ${response.statusText}`
            };
          }

          const files = await response.json();
          return {
            success: true,
            data: files,
            metadata: {
              fileCount: files.length
            }
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
  }

  private createRunCommandTool(): Tool {
    return {
      name: 'runCommand',
      description: 'Execute shell command',
      requiresApproval: true,
      isRisky: true,
      validate: (params) => typeof params.command === 'string',
      execute: async (params) => {
        try {
          const response = await apiClient.executeCommand(params.command);
          return {
            success: response.code === 0,
            data: response.stdout,
            error: response.code !== 0 ? response.stderr : undefined,
            metadata: {
              exitCode: response.code,
              duration: response.duration
            }
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    };
  }

  private createGitDiffTool(): Tool {
    return {
      name: 'gitDiff',
      description: 'Show git diff',
      requiresApproval: false,
      isRisky: false,
      validate: () => true,
      execute: async (params) => {
        return this.executeTool('runCommand', {
          command: 'git --no-pager diff'
        });
      }
    };
  }

  private createGitStatusTool(): Tool {
    return {
      name: 'gitStatus',
      description: 'Show git status',
      requiresApproval: false,
      isRisky: false,
      validate: () => true,
      execute: async (params) => {
        return this.executeTool('runCommand', {
          command: 'git status --short'
        });
      }
    };
  }

  private createGitCommitTool(): Tool {
    return {
      name: 'gitCommit',
      description: 'Create git commit',
      requiresApproval: true,
      isRisky: false,
      validate: (params) => typeof params.message === 'string',
      execute: async (params) => {
        // Stage all changes
        const stageResult = await this.executeTool('runCommand', {
          command: 'git add -A'
        });

        if (!stageResult.success) {
          return stageResult;
        }

        // Commit with co-author
        const message = `${params.message}\n\nCo-Authored-By: Warp <agent@warp.dev>`;
        const commitResult = await this.executeTool('runCommand', {
          command: `git commit -m "${message.replace(/"/g, '\\"')}"`
        });

        return commitResult;
      }
    };
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();
