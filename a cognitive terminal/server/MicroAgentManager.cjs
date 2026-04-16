/**
 * MicroAgentManager - Spawns and manages ephemeral task executors
 * 
 * Capabilities:
 * - Spawn agents on-demand for specific tasks
 * - Auto-terminate agents after TTL or idle timeout
 * - Track active agents and metrics
 * - Pool management with limits
 * - Specialized agent types for different task categories
 */

const { EventEmitter } = require('events');
const { BaseMicroAgent } = require('./BaseMicroAgent.cjs');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class MicroAgentManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.name = config.name || 'MicroAgentManager';
    this.agents = new Map(); // agentId -> agent instance
    
    // Pool limits
    this.maxAgents = config.maxAgents || 50;
    this.defaultTTL = config.defaultTTL || 60000; // 1 minute
    this.defaultIdleTimeout = config.defaultIdleTimeout || 30000; // 30 seconds
    
    // Access to SOMA components
    this.toolManager = config.toolManager || null;
    this.mnemonicArbiter = config.mnemonicArbiter || null;
    
    // Metrics
    this.metrics = {
      totalSpawned: 0,
      totalTerminated: 0,
      currentActive: 0,
      tasksByType: {},
      avgLifetime: 0,
      totalLifetime: 0
    };
    
    // Cleanup interval
    this._cleanupInterval = setInterval(() => this._cleanupTerminated(), 60000);
    
    console.log(`[${this.name}] Initialized (max agents: ${this.maxAgents})`);
  }
  
  /**
   * Spawn a new agent
   */
  async spawnAgent(type, config = {}) {
    if (this.agents.size >= this.maxAgents) {
      // Clean up terminated agents first
      this._cleanupTerminated();
      
      if (this.agents.size >= this.maxAgents) {
        throw new Error(`Agent pool full: ${this.agents.size}/${this.maxAgents}`);
      }
    }
    
    // Create specialized agent based on type
    let agent;
    switch (type) {
      case 'file':
        agent = new FileAgent({
          ...config,
          ttl: config.ttl || this.defaultTTL,
          idleTimeout: config.idleTimeout || this.defaultIdleTimeout
        });
        break;
        
      case 'code':
        agent = new CodeExecAgent({
          ...config,
          ttl: config.ttl || this.defaultTTL,
          idleTimeout: config.idleTimeout || this.defaultIdleTimeout
        });
        break;
        
      case 'memory':
        agent = new MemoryQueryAgent({
          ...config,
          mnemonicArbiter: this.mnemonicArbiter,
          ttl: config.ttl || this.defaultTTL,
          idleTimeout: config.idleTimeout || this.defaultIdleTimeout
        });
        break;
        
      case 'shell':
        agent = new ShellAgent({
          ...config,
          ttl: config.ttl || this.defaultTTL,
          idleTimeout: config.idleTimeout || this.defaultIdleTimeout
        });
        break;

      case 'coding_arbiter':
      case 'architect':
        agent = new CodingAgent({
          ...config,
          ttl: config.ttl || this.defaultTTL,
          idleTimeout: config.idleTimeout || this.defaultIdleTimeout
        });
        break;
        
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
    
    // Initialize agent
    await agent.initialize();
    
    // Track agent
    this.agents.set(agent.id, agent);
    this.metrics.totalSpawned++;
    this.metrics.currentActive = this.agents.size;
    
    if (!this.metrics.tasksByType[type]) {
      this.metrics.tasksByType[type] = 0;
    }
    
    // Listen for termination
    agent.once('terminated', (data) => {
      this._handleAgentTermination(agent.id, data);
    });
    
    console.log(`[${this.name}] Spawned ${type} agent: ${agent.id}`);
    this.emit('agent_spawned', { id: agent.id, type });
    
    return agent;
  }
  
  /**
   * Execute a task using an agent (spawn if needed)
   */
  async executeTask(type, task, config = {}) {
    const agent = await this.spawnAgent(type, config);
    
    this.metrics.tasksByType[type]++;
    
    try {
      const result = await agent.executeTask(task);
      return { success: true, agentId: agent.id, ...result };
    } catch (error) {
      return { success: false, agentId: agent.id, error: error.message };
    }
  }
  
  /**
   * Get agent by ID
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }
  
  /**
   * List all active agents
   */
  listAgents() {
    return Array.from(this.agents.values())
      .filter(a => a.state !== 'terminated')
      .map(a => a.getStatus());
  }
  
  /**
   * Terminate an agent
   */
  async terminateAgent(agentId, reason = 'manual') {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }
    
    return await agent.terminate(reason);
  }
  
  /**
   * Handle agent termination
   */
  _handleAgentTermination(agentId, data) {
    this.metrics.totalTerminated++;
    this.metrics.totalLifetime += data.lifetime;
    this.metrics.avgLifetime = this.metrics.totalLifetime / this.metrics.totalTerminated;
    
    console.log(`[${this.name}] Agent ${agentId} terminated (reason: ${data.reason}, lifetime: ${data.lifetime}ms)`);
    this.emit('agent_terminated', { id: agentId, ...data });
  }
  
  /**
   * Clean up terminated agents
   */
  _cleanupTerminated() {
    let cleaned = 0;
    for (const [id, agent] of this.agents.entries()) {
      if (agent.state === 'terminated') {
        this.agents.delete(id);
        cleaned++;
      }
    }
    
    this.metrics.currentActive = this.agents.size;
    
    if (cleaned > 0) {
      console.log(`[${this.name}] Cleaned up ${cleaned} terminated agents`);
    }
  }
  
  /**
   * Get status
   */
  getStatus() {
    return {
      name: this.name,
      activeAgents: this.agents.size,
      maxAgents: this.maxAgents,
      metrics: this.metrics,
      agents: this.listAgents()
    };
  }
  
  /**
   * Shutdown
   */
  async shutdown() {
    console.log(`[${this.name}] Shutting down...`);
    
    clearInterval(this._cleanupInterval);
    
    // Terminate all agents
    const terminationPromises = [];
    for (const agent of this.agents.values()) {
      if (agent.state !== 'terminated') {
        terminationPromises.push(agent.terminate('shutdown'));
      }
    }
    
    await Promise.all(terminationPromises);
    this.agents.clear();
    
    console.log(`[${this.name}] Shutdown complete`);
  }
}

// ========== SPECIALIZED AGENT TYPES ==========

/**
 * FileAgent - File operations
 */
class FileAgent extends BaseMicroAgent {
  constructor(config) {
    super({ ...config, type: 'file' });
  }
  
  async execute(task) {
    const { operation, path: filePath, content, pattern } = task;
    
    switch (operation) {
      case 'read':
        const data = await fs.readFile(filePath, 'utf8');
        return { operation, path: filePath, content: data, size: data.length };
        
      case 'write':
        await fs.writeFile(filePath, content, 'utf8');
        return { operation, path: filePath, written: true, size: content.length };
        
      case 'list':
        const entries = await fs.readdir(filePath, { withFileTypes: true });
        return {
          operation,
          path: filePath,
          files: entries.filter(e => !e.isDirectory()).map(e => e.name),
          directories: entries.filter(e => e.isDirectory()).map(e => e.name)
        };
        
      case 'search':
        // Simple file search
        const results = [];
        async function searchDir(dir, depth = 0) {
          if (depth > 5) return;
          const items = await fs.readdir(dir, { withFileTypes: true });
          for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
              await searchDir(fullPath, depth + 1);
            } else if (item.name.includes(pattern)) {
              results.push(fullPath);
            }
          }
        }
        await searchDir(filePath);
        return { operation, pattern, matches: results, count: results.length };
        
      default:
        throw new Error(`Unknown file operation: ${operation}`);
    }
  }
}

/**
 * CodeExecAgent - Execute code in sandbox
 */
class CodeExecAgent extends BaseMicroAgent {
  constructor(config) {
    super({ ...config, type: 'code' });
  }
  
  async execute(task) {
    const { language, code, timeout = 30000 } = task;
    
    if (language === 'javascript') {
      // Sandboxed JavaScript execution
      const sandbox = {
        console: { log: (...args) => args.join(' ') },
        Math, Date, JSON
      };
      
      const fn = new Function(...Object.keys(sandbox), `return (async () => { ${code} })();`);
      const result = await Promise.race([
        fn(...Object.values(sandbox)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]);
      
      return { language, result: String(result), success: true };
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }
  }
}

/**
 * MemoryQueryAgent - Query SOMA memory
 */
class MemoryQueryAgent extends BaseMicroAgent {
  constructor(config) {
    super({ ...config, type: 'memory' });
    this.mnemonicArbiter = config.mnemonicArbiter;
  }
  
  async execute(task) {
    if (!this.mnemonicArbiter) {
      throw new Error('MnemonicArbiter not available');
    }
    
    const { operation, query, content, metadata, limit = 10 } = task;
    
    switch (operation) {
      case 'query':
        const results = await this.mnemonicArbiter.recall(query, { limit });
        return { operation, query, results: results || [], count: (results || []).length };
        
      case 'store':
        const stored = await this.mnemonicArbiter.remember(content, metadata || {});
        return { operation, stored: true, id: stored.id, tier: stored.tier };
        
      default:
        throw new Error(`Unknown memory operation: ${operation}`);
    }
  }
}

/**
 * ShellAgent - Execute shell commands
 */
class ShellAgent extends BaseMicroAgent {
  constructor(config) {
    super({ ...config, type: 'shell' });
  }
  
  async execute(task) {
    const { command, cwd, timeout = 30000 } = task;
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || process.cwd(),
        timeout
      });
      
      return {
        command,
        stdout,
        stderr,
        success: true
      };
    } catch (error) {
      return {
        command,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * CodingAgent - Wrapper for CodingArbiter
 */
class CodingAgent extends BaseMicroAgent {
  constructor(config) {
    super({ ...config, type: 'coding_arbiter' });
    this.arbiterInstance = null;
  }

  async initialize() {
    try {
      // Dynamic import of the ESM module
      const codingArbiterPath = path.join(__dirname, '../../arbiters/CodingArbiter.mjs');
      const module = await import('url').then(u => import(u.pathToFileURL(codingArbiterPath).href));
      const { CodingArbiter } = module;
      
      this.arbiterInstance = new CodingArbiter({
        name: `CodingAgent-${this.id}`,
        generation: 1
      });
      
      console.log(`[CodingAgent] Initialized CodingArbiter instance`);
    } catch (error) {
      console.error(`[CodingAgent] Failed to initialize CodingArbiter:`, error);
      throw error;
    }
  }

  async execute(task) {
    if (!this.arbiterInstance) {
      throw new Error('CodingArbiter not initialized');
    }
    return await this.arbiterInstance.execute(task);
  }
}

module.exports = { MicroAgentManager, FileAgent, CodeExecAgent, MemoryQueryAgent, ShellAgent, CodingAgent };
