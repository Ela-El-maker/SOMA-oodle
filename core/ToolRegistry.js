
/**
 * ToolRegistry.js
 * 
 * Central registry for SOMA's tools.
 * Allows Arbiters to discover and execute tools.
 * Features upgraded dependency management and topological sorting.
 */

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.dependencies = new Map(); // toolName -> string[]
  }

  /**
   * Register a new tool
   * @param {Object} tool - Tool definition
   * @param {string} tool.name - Unique name (e.g., 'calculator')
   * @param {string} tool.description - Description for the LLM
   * @param {Object} tool.parameters - JSON Schema for arguments
   * @param {string[]} [tool.dependencies] - Names of tools this tool depends on
   * @param {Function} tool.execute - Async function(args) => result
   */
  registerTool(tool) {
    if (!tool.name || !tool.execute) {
      console.error('[ToolRegistry] Invalid tool definition:', tool);
      return;
    }
    this.tools.set(tool.name, tool);
    this.dependencies.set(tool.name, tool.dependencies || []);
    
    console.log(`[ToolRegistry] Registered tool: ${tool.name}${tool.dependencies ? ` (deps: ${tool.dependencies.join(', ')})` : ''}`);
  }

  /**
   * Validate all tool dependencies for cycles or missing tools.
   */
  validateDependencies() {
    const visited = new Set();
    const stack = new Set();

    const check = (name) => {
      if (stack.has(name)) {
        throw new Error(`[ToolRegistry] Circular dependency detected: ${Array.from(stack).join(' -> ')} -> ${name}`);
      }
      if (visited.has(name)) return;

      visited.add(name);
      stack.add(name);

      const deps = this.dependencies.get(name) || [];
      for (const dep of deps) {
        if (!this.tools.has(dep)) {
          console.warn(`[ToolRegistry] Tool '${name}' depends on missing tool '${dep}'`);
          continue;
        }
        check(dep);
      }

      stack.delete(name);
    };

    for (const toolName of this.tools.keys()) {
      check(toolName);
    }
    
    return true;
  }

  /**
   * Get tools in an order that satisfies dependencies (topological sort)
   */
  getExecutionOrder(targetTools = []) {
    const list = targetTools.length > 0 ? targetTools : Array.from(this.tools.keys());
    const sorted = [];
    const visited = new Set();
    const stack = new Set();

    const visit = (name) => {
      if (stack.has(name)) throw new Error(`Circular dependency involving ${name}`);
      if (visited.has(name)) return;

      stack.add(name);
      const deps = this.dependencies.get(name) || [];
      for (const dep of deps) {
        if (this.tools.has(dep)) visit(dep);
      }
      stack.delete(name);
      visited.add(name);
      sorted.push(name);
    };

    for (const name of list) {
      visit(name);
    }

    return sorted;
  }

  /**
   * Get all tools formatted for LLM system prompt
   */
  getToolsManifest() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
      dependencies: t.dependencies || []
    }));
  }

  getTool(name) {
    return this.tools.get(name);
  }

  async execute(name, args) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    
    try {
      console.log(`[ToolRegistry] Executing ${name} with args:`, args);
      const result = await tool.execute(args);
      return result;
    } catch (error) {
      console.error(`[ToolRegistry] Execution failed for ${name}:`, error);
      throw error;
    }
  }
}

export default new ToolRegistry();
