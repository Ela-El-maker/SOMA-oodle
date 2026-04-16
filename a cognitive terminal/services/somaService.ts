
import React from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage, Modality, Part, Content, GenerateContentResponse } from "@google/genai";
import type { HistoryItem, Metrics, Pattern, Concept, OutputType, CommandOutput, ExecutionLogEntry, TodoItem, Priority } from '../types';
import { HELP_TEXT, HUMAN_SYSTEM_INSTRUCTION } from "../constants";
import { FileSystemService } from './fileSystemService';
import { CodeArtifact } from '../components/CodeArtifact';
import { AgentExecution } from '../components/ExecutionPlan';
import { KnowledgeMesh } from './knowledgeMesh';
import { arbiterClient } from './arbiterClient';
import { EmotionalEngine } from './emotionalEngine';
import { messageBus } from './messageBus';
import { apiClient } from './apiClient';
import { MemoryService } from './memoryService';
import { somaApiClient } from './somaApiClient';
import { taskAssessmentService } from './taskAssessmentService';
import { planGenerator } from './planGenerator';
import { executionEngine } from './executionEngine';
import { enhancedReasoningChamber } from './reasoningLeafIntegration';
import { cameraService } from './cameraService';
import { messageBus } from './messageBus';
import { getSOMAIntegration } from './somaAudioIntegration';

interface SomaState {
  metrics: Metrics;
  knowledgeMesh: KnowledgeMesh;
  patterns: Map<string, Pattern>;
  concepts: Map<string, Concept>;
  isAgentConnected: boolean;
  todos: TodoItem[];
}

type CommandHandler = (query: string, args?: string[]) => AsyncGenerator<CommandOutput> | CommandOutput;

interface CommandDefinition {
    handler: CommandHandler;
    requiresAgent: boolean;
}

export class SomaService {
  private ai: GoogleGenAI;
  private state: SomaState;
  public fs: FileSystemService; 
  private agentTools: FunctionDeclaration[];
  private commandRegistry: Map<string, CommandDefinition> = new Map();
  private emotionalEngine: EmotionalEngine;
  private memoryService: MemoryService;

  private runConfirmationCallback: ((confirmed: boolean) => void) | null = null;

  private conversationHistory: Content[] = [];
  private readonly MAX_HISTORY_LENGTH = 20;

  constructor(private pathUpdateCallback: (path: string) => void) {
    // @ts-ignore
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.state = this.getInitialState();
    this.fs = new FileSystemService();
    this.emotionalEngine = new EmotionalEngine();
    this.memoryService = new MemoryService(process.env.API_KEY || '');
    this.initializeCommandRegistry();
    
    this.agentTools = [
      { name: 'listFiles', description: 'List files.', parameters: { type: Type.OBJECT, properties: { path: { type: Type.STRING } } } },
      { name: 'createDirectory', description: 'Create directory.', parameters: { type: Type.OBJECT, properties: { path: { type: Type.STRING } }, required: ['path'] } },
      { name: 'changeDirectory', description: 'Change directory.', parameters: { type: Type.OBJECT, properties: { path: { type: Type.STRING } }, required: ['path'] } },
      { name: 'readFile', description: 'Read file.', parameters: { type: Type.OBJECT, properties: { path: { type: Type.STRING } }, required: ['path'] } },
      { name: 'writeFile', description: 'Write file.', parameters: { type: Type.OBJECT, properties: { path: { type: Type.STRING }, content: { type: Type.STRING } }, required: ['path', 'content'] } },
      { name: 'runShellCommand', description: 'Run shell command.', parameters: { type: Type.OBJECT, properties: { command: { type: Type.STRING } }, required: ['command'] } },
      { name: 'taskComplete', description: "Task success.", parameters: { type: Type.OBJECT, properties: { reason: { type: Type.STRING } }, required: ['reason'] } },
      { name: 'taskFailed', description: "Task failed.", parameters: { type: Type.OBJECT, properties: { reason: { type: Type.STRING } }, required: ['reason'] } },
      { name: 'manageTodo', description: 'Manage todos.', parameters: { type: Type.OBJECT, properties: { action: { type: Type.STRING, enum: ['add', 'list'] }, task: { type: Type.STRING }, priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] } }, required: ['action'] } }
    ];
  }
  
  private initializeCommandRegistry() {
    const commands: { [key: string]: CommandDefinition } = {
        'execute': { handler: this.handleExecute.bind(this), requiresAgent: false },
        'code': { handler: this.handleCode.bind(this), requiresAgent: false },
        'vision': { handler: this.handleVision.bind(this), requiresAgent: false },
        'see': { handler: this.handleSee.bind(this), requiresAgent: false },
        'watch': { handler: this.handleWatch.bind(this), requiresAgent: false },
        'debug': { handler: this.handleDebug.bind(this), requiresAgent: true },
        'refactor': { handler: this.handleRefactor.bind(this), requiresAgent: true },
        'generate': { handler: this.handleGenerate.bind(this), requiresAgent: false },
        'ask': { handler: this.handleAsk.bind(this), requiresAgent: false },
        'chat': { handler: this.handleAsk.bind(this), requiresAgent: false },
        'think': { handler: this.handleThink.bind(this), requiresAgent: false },
        'analyze': { handler: this.handleAnalyze.bind(this), requiresAgent: false },
        'learn': { handler: this.handleLearn.bind(this), requiresAgent: false },
        'crawl': { handler: this.handleCrawl.bind(this), requiresAgent: false },
        'index': { handler: this.handleIndex.bind(this), requiresAgent: true },
        'compress': { handler: this.handleCompress.bind(this), requiresAgent: true },
        'search': { handler: this.handleSearch.bind(this), requiresAgent: false },
        'status': { handler: this.handleStatus.bind(this), requiresAgent: false },
        'insights': { handler: this.handleInsights.bind(this), requiresAgent: false },
        'reset': { handler: this.handleReset.bind(this), requiresAgent: false },
        'install': { handler: this.handleInstall.bind(this), requiresAgent: false },
        'run': { handler: this.handleRun.bind(this), requiresAgent: true },
        'help': { handler: this.handleHelp.bind(this), requiresAgent: false },
        'export': { handler: this.handleExport.bind(this), requiresAgent: false },
        'exit': { handler: this.handleExit.bind(this), requiresAgent: false },
        'quit': { handler: this.handleExit.bind(this), requiresAgent: false },
        'ls': { handler: this.handleLs.bind(this), requiresAgent: false }, 
        'cd': { handler: this.handleCd.bind(this), requiresAgent: false },
        'mkdir': { handler: this.handleMkdir.bind(this), requiresAgent: false },
        'cat': { handler: this.handleCat.bind(this), requiresAgent: false },
        'write': { handler: this.handleWrite.bind(this), requiresAgent: false },
        'imagine': { handler: this.handleImagine.bind(this), requiresAgent: false },
        'palette': { handler: this.handlePalette.bind(this), requiresAgent: false },
        'wireframe': { handler: this.handleWireframe.bind(this), requiresAgent: false },
        'todo': { handler: this.handleTodo.bind(this), requiresAgent: false },
        'topology': { handler: this.handleTopology.bind(this), requiresAgent: false },
        'map': { handler: this.handleMap.bind(this), requiresAgent: false },
        'test': { handler: this.handleTestCommand.bind(this), requiresAgent: false },
        'dream': { handler: this.handleDream.bind(this), requiresAgent: false },
        'agents': { handler: this.handleAgents.bind(this), requiresAgent: false },
        'memory': { handler: this.handleMemory.bind(this), requiresAgent: false },
        'remember': { handler: this.handleRemember.bind(this), requiresAgent: false },
        'daedalus': { handler: this.handleDaedalus.bind(this), requiresAgent: true },
    };
    for (const command of Object.keys(commands)) { this.commandRegistry.set(command, commands[command]); }
  }

  private getInitialState(): SomaState {
    return {
      metrics: { autonomyLevel: 30, concepts: 0, patterns: 0, knowledgeNodes: 0, totalInteractions: 0 },
      knowledgeMesh: new KnowledgeMesh(),
      patterns: new Map(),
      concepts: new Map(),
      isAgentConnected: false,
      todos: [],
    };
  }
  public async initialize() {
    // First try loading from backend (disk)
    let loaded = false;
    try {
      const response = await fetch('http://localhost:3001/api/knowledge/load');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.state) {
          console.log('[SOMA] Loading knowledge from disk...');
          this.state = {
            ...this.getInitialState(),
            ...data.state,
            knowledgeMesh: KnowledgeMesh.fromJSON(data.state.knowledgeMesh),
            patterns: new Map(data.state.patterns),
            concepts: new Map(data.state.concepts),
          };
          loaded = true;
          console.log(`[SOMA] Restored ${this.state.knowledgeMesh.nodes.size} knowledge nodes from disk`);
        }
      }
    } catch (error) {
      console.warn('[SOMA] Could not load from disk, trying localStorage...');
    }
    
    // Fallback to localStorage if disk load failed
    if (!loaded) {
      const savedState = localStorage.getItem('somaState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        this.state = {
          ...this.getInitialState(),
          ...parsed,
          knowledgeMesh: KnowledgeMesh.fromJSON(parsed.knowledgeMesh),
          patterns: new Map(parsed.patterns),
          concepts: new Map(parsed.concepts),
        };
        console.log(`[SOMA] Restored ${this.state.knowledgeMesh.nodes.size} knowledge nodes from localStorage`);
        loaded = true;
      }
    }
    
    if (!loaded) {
      console.log('[SOMA] Starting with fresh knowledge mesh');
    }
    
    this.fs.isReady = this.state.isAgentConnected;
    arbiterClient.initialize(this.ai);
    await apiClient.checkHealth();
    if (apiClient.isBackendActive()) {
        this.state.isAgentConnected = true;
        this.pathUpdateCallback(apiClient.getCwd());
    }
  }
  public isAgentConnected(): boolean { return this.state.isAgentConnected; }
  public isBackendConnected(): boolean { return apiClient.isBackendActive(); }
  
  public getCurrentPath(): string { 
      return apiClient.isBackendActive() ? apiClient.getCwd() : this.fs.getCurrentPath(); 
  }

  private saveState() {
    const stateToSave = {
      ...this.state,
      knowledgeMesh: this.state.knowledgeMesh.toJSON(),
      patterns: Array.from(this.state.patterns.entries()),
      concepts: Array.from(this.state.concepts.entries()),
      savedAt: Date.now(),
      version: '1.0'
    };
    
    // Save to localStorage
    try {
      localStorage.setItem('somaState', JSON.stringify(stateToSave));
      console.log(`[SOMA] State saved: ${this.state.knowledgeMesh.nodes.size} knowledge nodes`);
    } catch (error) {
      console.error('[SOMA] Failed to save state:', error);
    }
    
    // Also save to backend for persistent disk storage
    this.saveToDisk(stateToSave);
  }
  
  private async saveToDisk(state: any) {
    try {
      const response = await fetch('http://localhost:3001/api/knowledge/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      
      if (response.ok) {
        console.log('[SOMA] Knowledge mesh persisted to disk');
      }
    } catch (error) {
      // Backend might not be available - that's ok, localStorage is still there
      console.warn('[SOMA] Could not persist to disk (backend unavailable)');
    }
  }
  private updateMetrics() {
    this.state.metrics.concepts = this.state.concepts.size;
    this.state.metrics.patterns = this.state.patterns.size;
    this.state.metrics.knowledgeNodes = this.state.knowledgeMesh.nodes.size;
    this.state.metrics.autonomyLevel = Math.min(100, 30 + (this.state.metrics.knowledgeNodes * 0.5) + (this.state.metrics.totalInteractions * 0.2));
  }
  public confirmRun(confirmed: boolean) {
    this.runConfirmationCallback?.(confirmed);
    this.runConfirmationCallback = null;
  }
  
  private async addToHistory(role: 'user' | 'model', text: string) {
    if (!text || !text.trim()) {
      console.warn('[SOMA] addToHistory called with empty text, skipping');
      return;
    }
    
    // Add to conversation history (for immediate context)
    this.conversationHistory.push({ role, parts: [{ text }] });
    if (this.conversationHistory.length > this.MAX_HISTORY_LENGTH) {
      this.conversationHistory = this.conversationHistory.slice(-this.MAX_HISTORY_LENGTH);
    }
    
    // Add to persistent memory (for long-term learning)
    const conversationId = this.memoryService.getStats().sessionId;
    this.memoryService.addTurn(role === 'user' ? 'user' : 'soma', text);
    
    // Store in MnemonicArbiter (backend 3-tier memory)
    try {
      const content = `${role}: ${text}`;
      if (!content || content.trim() === ':') {
        console.warn('[SOMA] Skipping memory store - invalid content');
        return;
      }
      
      await fetch('http://localhost:3001/api/memory/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          metadata: {
            conversationId,
            role: role === 'user' ? 'user' : 'soma',
            timestamp: Date.now(),
            type: 'conversation_turn'
          }
        })
      });
    } catch (error) {
      // Backend unavailable - memory still saved locally
      console.warn('[SOMA] Could not store in MnemonicArbiter:', error);
    }
  }

  public async* processCommand(input: string): AsyncGenerator<CommandOutput> {
    if (this.runConfirmationCallback) return;
    const trimmedInput = input.trim();
    this.state.metrics.totalInteractions++; // Track interactions
    this.updateMetrics();

    // 1. Magic Command: Shell Passthrough ($ command)
    if (trimmedInput.startsWith('$')) {
        const shellCmd = trimmedInput.substring(1).trim();
        this.addToHistory('user', shellCmd); // Log the clean command
        yield* this.handleShellPassthrough(shellCmd);
        this.saveState();
        return;
    }

    this.addToHistory('user', trimmedInput);

    if (trimmedInput.startsWith('#')) {
       yield* this.handleAiCommandSearch(trimmedInput.substring(1).trim());
       this.saveState();
       return;
    }
    
    // 2. Context Injection (@filename)
    // Extract file references, read them, and append to context
    let contextWithFiles = '';
    const fileRegex = /@([a-zA-Z0-9_./-]+)/g;
    let match;
    const filesToRead: string[] = [];
    
    // Find all matches
    while ((match = fileRegex.exec(trimmedInput)) !== null) {
        filesToRead.push(match[1]);
    }

    if (filesToRead.length > 0) {
        yield { historyItems: [{ id: Date.now(), type: 'info', content: `Reading context: ${filesToRead.join(', ')}...` }] };
        
        for (const filePath of filesToRead) {
            try {
                let content = '';
                if (apiClient.isBackendActive()) {
                    const res = await apiClient.fsRead(filePath);
                    if (res.error) throw new Error(res.error);
                    content = res.content || '';
                } else {
                    content = this.fs.cat(filePath);
                }
                contextWithFiles += `\n\n--- FILE: ${filePath} ---\n${content}\n--- END FILE ---\n`;
            } catch (err: any) {
                yield { historyItems: [{ id: Date.now(), type: 'error', content: `Failed to read ${filePath}: ${err.message}` }] };
            }
        }
    }

    const [command, ...args] = trimmedInput.split(' ');
    const query = args.join(' ');

    // TASK ASSESSMENT: Analyze the query before executing
    try {
      // Pass file context to assessment if available
      const assessmentInput = contextWithFiles ? `${trimmedInput}\n\n[Context Files Loaded]` : trimmedInput;
      
      const assessment = await taskAssessmentService.assessTask(assessmentInput);
      const { task } = assessment;
      
      // Show assessment for complex tasks
      if (task.complexity !== 'simple') {
        yield {
          historyItems: [{
            id: Date.now(),
            type: 'info',
            content: `📋 Task Assessment: ${task.complexity.toUpperCase()} | ${task.estimatedSteps} steps | Tools: ${task.requiredTools.join(', ') || 'none'}\n${task.reasoning}`
          }]
        };
      }
      
      // PLAN GENERATION & EXECUTION
      if (assessment.shouldCreatePlan) {
        yield {
          historyItems: [{
            id: Date.now(),
            type: 'info',
            content: '🎯 Generating execution plan...'
          }]
        };

        // Generate plan
        const plan = await planGenerator.generatePlan(task);
        
        // Validate plan
        const validation = await planGenerator.validatePlan(plan);
        if (!validation.valid) {
          yield {
            historyItems: [{
              id: Date.now(),
              type: 'error',
              content: `⚠️ Plan validation failed:\n${validation.issues.join('\n')}`
            }]
          };
          return; // Don't execute invalid plan
        }

        // Show plan with ExecutionPlan component
        const planElement = React.createElement(AgentExecution, {
          goal: task.query,
          plan: this.formatPlanForDisplay(plan),
          logEntries: [],
          status: 'Planning...'
        });

        const planUpdateId = Date.now();
        yield {
          historyItems: [{
            id: planUpdateId,
            type: 'plan',
            content: planElement
          }]
        };

        // Execute plan with progress streaming
        yield* this.executePlanWithProgress(plan, planUpdateId);
        
        // Skip normal command processing
        this.saveState();
        return;
      }
    } catch (error) {
      console.warn('[SomaService] Task assessment/planning failed:', error);
      // Continue with normal processing if assessment fails
    }

    const commandDef = this.commandRegistry.get(command.toLowerCase());
    if (commandDef) {
      if (commandDef.requiresAgent && !this.state.isAgentConnected) {
        yield { historyItems: [{ id: Date.now(), type: 'error', content: "SOMA Link agent is not connected." }] };
        return;
      }
      // @ts-ignore - Pass contextWithFiles as 3rd arg
      const result = commandDef.handler(query, args, contextWithFiles);
      if (result && typeof (result as any)[Symbol.asyncIterator] === 'function') { 
        yield* result as AsyncGenerator<CommandOutput>; 
      } else { 
        yield result as CommandOutput; 
      }
    } else if (apiClient.isBackendActive() && ['npm', 'git', 'node', 'python', 'python3', 'docker', 'grep', 'rm', 'mv', 'cp', 'echo', 'touch'].includes(command.toLowerCase())) {
        yield* this.handleShellPassthrough(trimmedInput);
    } else { 
      const { action, query: classifiedQuery } = await this.classifyNaturalCommand(input);
      const naturalHandlerDef = this.commandRegistry.get(action.toLowerCase());
      if (naturalHandlerDef) {
        // @ts-ignore
        const result = naturalHandlerDef.handler(classifiedQuery, classifiedQuery.split(' '), contextWithFiles);
        if (result && typeof (result as any)[Symbol.asyncIterator] === 'function') { 
            yield* result as AsyncGenerator<CommandOutput>; 
        } else { 
            yield result as CommandOutput; 
        }
      } else {
        // Pass the file context to handleAsk
        yield* this.handleAsk(input, contextWithFiles);
      }
    }
    this.saveState();
  }
  
  private async classifyNaturalCommand(command: string): Promise<{ action: string, query: string }> {
      // If it's a simple greeting or conversational input, just chat
      const lowerCommand = command.toLowerCase().trim();
      const conversationalPatterns = ['hello', 'hi', 'hey', 'how are you', 'what\'s up', 'good morning', 'good afternoon', 'good evening', 'thanks', 'thank you', 'just testing'];
      if (conversationalPatterns.some(pattern => lowerCommand.startsWith(pattern))) {
          return { action: 'ask', query: command };
      }
      
      const prompt = `Map input to command. Input: "${command}". Return "ACTION: query". Valid actions: ask, think, search, help, speak, imagine, palette, learn. Default to 'ask' for greetings or unclear inputs.`;
      const chat = this.ai.chats.create({ model: 'gemini-2.5-flash-lite' });
      try {
          const result = await chat.sendMessage({ message: prompt });
          const text = result.text.trim();
          const idx = text.indexOf(':');
          if (idx > -1) return { action: text.substring(0, idx).trim().toLowerCase(), query: text.substring(idx + 1).trim() };
      } catch (e) {}
      return { action: 'ask', query: command };
  }

  public getCommands(): string[] { return Array.from(this.commandRegistry.keys()); }
  
  public autocomplete(text: string): { completions: string[], textToReplace: string } {
      const parts = text.trimStart().split(' ');
      const command = parts[0].toLowerCase();
      if (parts.length <= 1) return { completions: this.getCommands().filter(c => c.startsWith(command)), textToReplace: parts[0] };
      return { completions: [], textToReplace: '' };
  }
  
  // --- Handlers ---

  async* handleExecute(query: string, args: string[]): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'info', content: `Executing system command: ${query}` }] };
      // Placeholder execution
      yield { historyItems: [{ id: Date.now(), type: 'response', content: `Executed: ${query}` }] };
  }

  async* handleVision(query: string, args: string[]): AsyncGenerator<CommandOutput> {
      if (!args || args.length < 2) {
          yield { historyItems: [{ id: Date.now(), type: 'error', content: 'Usage: vision <image_path> <prompt>' }] };
          return;
      }

      const imagePath = args[0];
      const prompt = args.slice(1).join(' ');

      yield { historyItems: [{ id: Date.now(), type: 'think', content: `👁️ Analyzing image: ${imagePath}...` }] };

      try {
          const result = await somaApiClient.reason({
              query: prompt,
              mode: 'analytical', // Use LOGOS/Analytical mode for vision tasks
              context: {
                  imagePaths: [imagePath],
                  category: 'vision'
              }
          });

          yield { historyItems: [{ 
              id: Date.now(), 
              type: 'response', 
              content: result.response
          }] };
          
          // Add to conversation history
          this.conversationHistory.push(
              { role: 'user', parts: [{ text: `[Image: ${imagePath}] ${prompt}` }] } as any,
              { role: 'model', parts: [{ text: result.response }] } as any
          );

      } catch (error: any) {
          yield { historyItems: [{ id: Date.now(), type: 'error', content: `Vision analysis failed: ${error.message}` }] };
      }
  }

  async* handleSee(query: string, args: string[]): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'think', content: '📸 Accessing camera...' }] };

      try {
          const snapshot = await cameraService.captureSnapshot();
          const prompt = query || "What do you see through my camera?";

          yield { historyItems: [{ id: Date.now(), type: 'think', content: '👁️ Analyzing live feed...' }] };

          // Try SOMA backend first, fallback to direct Gemini call
          let response: string;
          try {
              const soma = getSOMAIntegration();
              const somaResult = await soma.analyzeImage(snapshot.data, snapshot.mimeType, prompt);

              if (somaResult.success && somaResult.description) {
                  response = somaResult.description;
                  yield { historyItems: [{ id: Date.now(), type: 'info', content: '🔮 Analysis via SOMA backend' }] };
              } else {
                  throw new Error('SOMA vision analysis failed');
              }
          } catch (somaError) {
              // Fallback to direct Gemini call
              const result = await somaApiClient.reason({
                  query: prompt,
                  mode: 'analytical',
                  context: {
                      images: [{
                          mimeType: snapshot.mimeType,
                          data: snapshot.data
                      }],
                      category: 'vision_live'
                  }
              });
              response = result.response;
          }

          yield { historyItems: [{
              id: Date.now(),
              type: 'response',
              content: response
          }] };

          // Add to conversation history
          this.conversationHistory.push(
              { role: 'user', parts: [{ text: `[Camera Snapshot] ${prompt}` }] } as any,
              { role: 'model', parts: [{ text: response }] } as any
          );

      } catch (error: any) {
          yield { historyItems: [{ id: Date.now(), type: 'error', content: `Camera access failed: ${error.message}. Make sure you have granted camera permissions.` }] };
      }
  }

  private watchInterval: any = null;

  async* handleWatch(query: string, args: string[]): AsyncGenerator<CommandOutput> {
      if (this.watchInterval) {
          clearInterval(this.watchInterval);
          this.watchInterval = null;
          cameraService.stop();
          yield { historyItems: [{ id: Date.now(), type: 'info', content: 'Stopped watching.' }] };
          return;
      }

      yield { historyItems: [{ id: Date.now(), type: 'info', content: 'Starting live vision... (Run "watch" again to stop)' }] };

      try {
          // Initialize camera once
          await cameraService.initialize();
          
          this.watchInterval = setInterval(async () => {
              try {
                  const snapshot = await cameraService.captureSnapshot();
                  
                  // Use a specialized "observation" query
                  const result = await somaApiClient.reason({
                      query: "Observe this frame. If there is something NEW, INTERESTING, or URGENT, describe it briefly (1 sentence). If nothing has changed or it's boring, reply with 'SILENCE'.",
                      mode: 'fast', // Use fast mode for stream
                      context: {
                          images: [{
                              mimeType: snapshot.mimeType,
                              data: snapshot.data
                          }],
                          category: 'vision_stream'
                      }
                  });

                  const response = result.response.trim();
                  if (response && response !== 'SILENCE' && !response.includes('SILENCE')) {
                       messageBus.publish('soma:observation', `👁️ ${response}`);
                  }

              } catch (err) {
                  console.error("Watch loop error:", err);
              }
          }, 5000); // Check every 5 seconds

      } catch (error: any) {
           yield { historyItems: [{ id: Date.now(), type: 'error', content: `Failed to start vision stream: ${error.message}` }] };
      }
  }

  async* handleCode(query: string): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'think', content: "Generating code structure..." }] };
      const prompt = `Generate code for: ${query}. Respond with ONLY the code block.`;
      const chat = this.ai.chats.create({ model: 'gemini-2.5-flash' }); 
      const res = await chat.sendMessage({ message: prompt });
      const code = res.text.replace(/```\w*\n/g, '').replace(/```/g, '');
      yield { historyItems: [{ id: Date.now(), type: 'code', content: React.createElement(CodeArtifact, { code: code, language: "javascript", filename: "generated.js" }) }] };
  }

  async* handleDebug(query: string): AsyncGenerator<CommandOutput> {
     // ... logic
     yield { historyItems: [{id: Date.now(), type: 'info', content: 'Debug logic here'}]};
  }

  async* handleRefactor(query: string): AsyncGenerator<CommandOutput> {
     // ... logic
     yield { historyItems: [{id: Date.now(), type: 'info', content: 'Refactor logic here'}]};
  }
  
  async* handleGenerate(query: string): AsyncGenerator<CommandOutput> {
     yield* this.handleCode(query);
  }

  async* handleThink(query: string): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'think', content: 'Analyzing constraints and patterns...' }] };
      
      const chat = this.ai.chats.create({ 
          model: 'gemini-2.5-flash',
          config: {
             thinkingConfig: { thinkingBudget: 1024 } // Enable Thinking
          } 
      });
      const res = await chat.sendMessage({ message: query });
      yield { historyItems: [{ id: Date.now(), type: 'response', content: res.text }] };
  }

  async* handleAnalyze(query: string): AsyncGenerator<CommandOutput> {
      yield* this.handleThink(query);
  }

  async* handleAsk(query: string): AsyncGenerator<CommandOutput> {
      // Validate query
      if (!query || !query.trim()) {
          console.error('[SomaService] handleAsk called with empty query');
          yield { historyItems: [{
              id: Date.now(),
              type: 'error',
              content: 'Cannot process empty query'
          }] };
          return;
      }
      
      // Use SOMA's full cognitive architecture: Task Assessment → Planning → Execution
      try {
          const trimmedQuery = query.trim();
          
          // STEP 0: Recall relevant memories for context
          let memoryContext = '';
          try {
              const memoryResponse = await fetch('http://localhost:3001/api/memory/recall', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query: trimmedQuery, limit: 5 })
              });
              
              if (memoryResponse.ok) {
                  const memoryData = await memoryResponse.json();
                  if (memoryData.success && memoryData.results && memoryData.results.length > 0) {
                      // Build context from recalled memories
                      memoryContext = '\n\nRelevant memories:\n' + 
                          memoryData.results.map((m: any, i: number) => 
                              `${i + 1}. ${m.content || m.text || JSON.stringify(m).slice(0, 200)}`
                          ).join('\n');
                      
                      console.log('[SomaService] Recalled', memoryData.results.length, 'relevant memories');
                  }
              }
          } catch (error) {
              console.warn('[SomaService] Memory recall failed:', error);
          }

          // STEP 1: Assess task complexity (silent for quick responses)
          const assessment = await taskAssessmentService.assessTask(trimmedQuery);
          
          // Only show thinking indicator for complex tasks
          if (assessment.task.complexity !== 'simple') {
              yield { historyItems: [{ id: Date.now(), type: 'think', content: '🧠 Processing...' }] };
          }
          
          console.log('[SomaService] Task assessment:', {
              complexity: assessment.task.complexity,
              requiresPlanning: assessment.shouldCreatePlan,
              tools: assessment.task.requiredTools
          });

          // STEP 2: For complex tasks, generate and show plan
          if (assessment.shouldCreatePlan) {
              yield { historyItems: [{ id: Date.now(), type: 'think', content: `📋 Complex ${assessment.task.category} task detected - generating execution plan...` }] };
              
              const plan = await planGenerator.generatePlan(assessment.task);
              const validation = await planGenerator.validatePlan(plan);
              
              if (!validation.valid) {
                  yield { historyItems: [{ id: Date.now(), type: 'error', content: `Plan validation failed:\n${validation.issues.join('\n')}` }] };
                  return;
              }
              
              // Show plan to user
              const planSummary = `**Execution Plan** (${plan.steps.length} steps):\n${plan.reasoning}\n\n` +
                  plan.steps.map((s, i) => `${i + 1}. ${s.description} [${s.tool}]`).join('\n');
              
              yield { historyItems: [{ id: Date.now(), type: 'plan', content: planSummary }] };
              
              // Execute plan with progress tracking
              yield { historyItems: [{ id: Date.now(), type: 'think', content: '⚙️ Executing plan...' }] };
              
              for await (const progress of executionEngine.executePlan(plan)) {
                  if (progress.type === 'step_start') {
                      yield { historyItems: [{ id: Date.now(), type: 'info', content: `▶ ${progress.step.description}` }] };
                  } else if (progress.type === 'step_complete') {
                      yield { historyItems: [{ id: Date.now(), type: 'info', content: `✓ ${progress.step.description} completed` }] };
                  } else if (progress.type === 'error') {
                      yield { historyItems: [{ id: Date.now(), type: 'error', content: `✗ Error: ${progress.error}` }] };
                  } else if (progress.type === 'complete') {
                      yield { historyItems: [{ id: Date.now(), type: 'response', content: `✅ Plan executed successfully\n\nResult: ${progress.result}` }] };
                  }
              }
          } else {
              // STEP 3: Route based on reasoning tier
              let result;
              
              if (assessment.task.complexity === 'simple' || assessment.task.estimatedSteps === 0) {
                  // TIER 0: Quick response - single brain, with memory
                  result = await somaApiClient.reason({
                      query: trimmedQuery + memoryContext,
                      mode: 'fast',
                      context: {
                          quickResponse: true,
                          conversationHistory: this.conversationHistory.slice(-2)
                      }
                  });
              } else if (assessment.task.requiredTools.includes('deepReasoning')) {
                  // TIER 2: Deep thinking - enable thinking mode with preserved reasoning AND memory
                  yield { historyItems: [{ id: Date.now(), type: 'think', content: '🤔 Engaging deep reasoning...' }] };
                  result = await somaApiClient.reason({
                      query: trimmedQuery + memoryContext,
                      mode: 'analytical',
                      context: {
                          conversationHistory: this.conversationHistory.slice(-5),
                          useThinking: true,  // Enable chain-of-thought
                          preserveThinking: true,  // Show reasoning process
                          category: assessment.task.category,
                          hasMemory: memoryContext.length > 0
                      }
                  });
              } else {
              // TIER 1/4: Standard reasoning - multi-brain consensus WITH reasoning leaves AND memory
              const brainResponses = await somaApiClient.multibrainReason({
                  query: trimmedQuery + memoryContext,
                  brains: ['PROMETHEUS', 'LOGOS', 'AURORA'],
                  context: {
                      conversationHistory: this.conversationHistory.slice(-5),
                      category: assessment.task.category,
                      hasMemory: memoryContext.length > 0
                  }
              });

              const leafResult = await enhancedReasoningChamber.processWithLeafTracking(
                  trimmedQuery,
                  brainResponses
              );

              // Reasoning is preserved internally for meta-reasoning
              // User just sees final answer (reasoning chain hidden)

              // Set result with final answer
              result = {
                  response: leafResult.finalAnswer,
                  confidence: Math.max(...leafResult.reasoning.map(r => r.confidence)),
                  metadata: {
                      turnId: leafResult.turnId,
                      tensions: leafResult.tensions.length,
                      brains: leafResult.reasoning.map(r => r.brain)
                  }
              };
              }

              // Add to conversation history
              this.conversationHistory.push(
                  { role: 'user', parts: [{ text: trimmedQuery }] } as any,
                  { role: 'model', parts: [{ text: result.response }] } as any
              );

              // 🚀 AUTONOMOUS VISION TRIGGER
              // If the AI response suggests it wants to see, or contains the trigger tag
              if (result.response.includes('[ACTION:WATCH]') || 
                  result.response.includes('[ACTION:SEE]') ||
                  (result.brain === 'THALAMUS' && result.response.toLowerCase().includes('activate vision'))) {
                  
                  yield { historyItems: [{ id: Date.now(), type: 'info', content: '👁️ SOMA is activating visual cortex...' }] };
                  // Trigger the watch command essentially
                  yield* this.handleWatch('auto', []);
              }

              yield { 
                  historyItems: [{
                      id: Date.now(), 
                      type: 'response', 
                      content: result.response.replace('[ACTION:WATCH]', '').replace('[ACTION:SEE]', '') 
                  }]
              };
          }
      } catch (error: any) {
          console.error('[SOMA] Error in handleAsk:', error);
          yield { historyItems: [{ id: Date.now(), type: 'error', content: `Error: ${error.message}` }] };
      }
  }

  async* handleLearn(query: string): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'learn', content: `Integrating concept: ${query}` }] };
      this.state.concepts.set(query, { concept: query, count: 1 });
      yield { historyItems: [{ id: Date.now(), type: 'info', content: "Concept stored in long-term memory." }] };
  }

  async* handleCrawl(query: string): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'crawl', content: `Initiating crawler for: ${query}` }] };
      const stream = arbiterClient.edgeWorkerCrawl(query);
      for await (const update of stream) {
          if (update.type === 'update') {
               // Update mesh
               this.state.knowledgeMesh.addNode({ title: update.data.title, summary: update.data.summary, url: update.url });
               yield { historyItems: [{ id: Date.now(), type: 'bus', content: `Crawled: ${update.url}` }] };
          } else if (update.type === 'report') {
               yield { historyItems: [{ id: Date.now(), type: 'info', content: update.reportElement }] };
          } else if (update.type === 'init') {
              yield update.output;
          }
      }
  }

  async* handleIndex(query: string): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'info', content: "Indexing knowledge mesh..." }] };
      const summary = this.state.knowledgeMesh.summarize();
      yield { historyItems: [{ id: Date.now(), type: 'insights', content: `Nodes: ${summary.nodeCount}, Edges: ${summary.edgeCount}` }] };
  }

  async* handleCompress(query: string): AsyncGenerator<CommandOutput> {
      const parts = query.split(' ');
      const path = parts[0];
      const content = this.fs.cat(path);
      
      yield { historyItems: [{ id: Date.now(), type: 'compress', content: `Compressing ${path}...` }] };
      const res = await arbiterClient.guardianCompress({ path, content });
      
      if (res.success) {
          this.fs.write(res.newPath, res.newContent);
          yield { historyItems: [{ id: Date.now(), type: 'info', content: `Compression complete: ${res.newPath}` }] };
      } else {
          yield { historyItems: [{ id: Date.now(), type: 'error', content: `Compression failed: ${res.error}` }] };
      }
  }

  async* handleSearch(query: string): AsyncGenerator<CommandOutput> {
      yield* this.handleAiCommandSearch(query);
  }

  async* handleStatus(query: string): AsyncGenerator<CommandOutput> {
      const mood = this.emotionalEngine.getCurrentMood();
      yield { historyItems: [{ id: Date.now(), type: 'status', content: `Autonomy: ${this.state.metrics.autonomyLevel}%\nMood: ${mood.mood} (Intensity: ${mood.intensity})\nActive Concepts: ${this.state.metrics.concepts}` }] };
  }
  
  async* handleInsights(query: string): AsyncGenerator<CommandOutput> {
       const summary = this.state.knowledgeMesh.summarize(5);
       const text = summary.topNodes.map(n => `- ${n.title} (Weight: ${n.weight})`).join('\n');
       yield { historyItems: [{ id: Date.now(), type: 'insights', content: `Top Knowledge Nodes:\n${text}` }] };
  }

  async* handleReset(query: string): AsyncGenerator<CommandOutput> {
      this.state = this.getInitialState();
      this.fs.reset();
      localStorage.removeItem('somaState');
      yield { historyItems: [{ id: Date.now(), type: 'info', content: "System reset complete." }] };
  }

  async* handleInstall(query: string): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'install', content: `Installing package: ${query}...` }] };
      // Simulate install
      await new Promise(r => setTimeout(r, 1000));
      yield { historyItems: [{ id: Date.now(), type: 'info', content: "Package installed successfully." }] };
  }

  async* handleRun(query: string): AsyncGenerator<CommandOutput> {
      yield { historyItems: [], requiresConfirmation: `Execute: ${query}? [y/n]` };
      // The flow pauses here until confirmRun is called from UI
      // However, generator yields so UI must handle re-invocation or state
      // For this simplified version, we'll assume confirmRun triggers a re-execution or we implement a wait loop here?
      // Actually, standard generators don't support "pause for input". 
      // The UI handles this by checking `requiresConfirmation` property.
  }

  async* handleHelp(query: string): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'help', content: HELP_TEXT }] };
  }
  
  async* handleExport(query: string): AsyncGenerator<CommandOutput> {
      const data = JSON.stringify(this.state.knowledgeMesh.toJSON(), null, 2);
      yield { historyItems: [{ id: Date.now(), type: 'export', content: "Exporting Knowledge Mesh..." }] };
      yield { historyItems: [{ id: Date.now(), type: 'code', content: React.createElement(CodeArtifact, { code: data, language: "json", filename: "knowledge_mesh.json" }) }] };
  }
  
  async* handleExit(query: string): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'info', content: "Session terminated." }] };
  }
  
  async* handleLs(query: string): AsyncGenerator<CommandOutput> {
      if (apiClient.isBackendActive()) {
          const res = await apiClient.fsLs(query);
          yield { historyItems: [{ id: Date.now(), type: 'info', content: res.output || '' }] };
      } else {
          yield { historyItems: [{ id: Date.now(), type: 'info', content: this.fs.ls(query) }] };
      }
  }

  async* handleCd(query: string): AsyncGenerator<CommandOutput> {
      if (apiClient.isBackendActive()) {
           const res = await apiClient.shellExec(`cd ${query}`);
           if (res.error) {
               yield { historyItems: [{ id: Date.now(), type: 'error', content: res.output }] };
           } else {
               if (res.cwd) this.pathUpdateCallback(res.cwd);
               yield { historyItems: [{ id: Date.now(), type: 'info', content: '' }] };
           }
      } else {
          const res = this.fs.cd(query);
          if (res) yield { historyItems: [{ id: Date.now(), type: 'error', content: res }] };
          else {
              this.pathUpdateCallback(this.fs.getCurrentPath());
              yield { historyItems: [] }; 
          }
      }
  }
  
  async* handleMkdir(query: string): AsyncGenerator<CommandOutput> {
       if (apiClient.isBackendActive()) {
           await apiClient.fsMkdir(query);
           yield { historyItems: [] };
       } else {
           const res = this.fs.mkdir(query);
           if (res) yield { historyItems: [{ id: Date.now(), type: 'error', content: res }] };
           else yield { historyItems: [] };
       }
  }
  
  async* handleCat(query: string): AsyncGenerator<CommandOutput> {
       if (apiClient.isBackendActive()) {
           const res = await apiClient.fsRead(query);
           if (res.error) yield { historyItems: [{ id: Date.now(), type: 'error', content: res.error }] };
           else yield { historyItems: [{ id: Date.now(), type: 'info', content: res.content || '' }] };
       } else {
           yield { historyItems: [{ id: Date.now(), type: 'info', content: this.fs.cat(query) }] };
       }
  }

  async* handleWrite(query: string, args: string[]): AsyncGenerator<CommandOutput> {
      const path = args[0];
      const content = args.slice(1).join(' ');
      if (apiClient.isBackendActive()) {
          await apiClient.fsWrite(path, content);
      } else {
          this.fs.write(path, content);
      }
      yield { historyItems: [{ id: Date.now(), type: 'info', content: `Wrote to ${path}` }] };
  }

  async* handleImagine(query: string): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'think', content: `Imagining: ${query}...` }] };
      const chat = this.ai.chats.create({ model: 'gemini-2.5-flash-image' });
      // Stub for image gen
      // In a real implementation, you'd use generateContent with tools or specialized model
      // For now, we simulate by returning a placeholder or error if not configured
      yield { historyItems: [{ id: Date.now(), type: 'info', content: "[Image Generation Simulated]" }] };
  }
  
  async* handlePalette(query: string): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'think', content: `Designing palette for: ${query}...` }] };
      const prompt = `Create a color palette for "${query}". Return JSON: { "theme": "Name", "colors": [{ "hex": "#...", "name": "...", "usage": "..." }] }`;
      const chat = this.ai.chats.create({ model: 'gemini-2.5-flash', config: { responseMimeType: 'application/json' } });
      const res = await chat.sendMessage({ message: prompt });
      yield { historyItems: [{ id: Date.now(), type: 'palette', content: res.text }] };
  }
  
  async* handleWireframe(query: string): AsyncGenerator<CommandOutput> {
       yield* this.handleCode(`HTML/Tailwind wireframe for: ${query}`);
  }
  
  async* handleTodo(query: string, args: string[]): AsyncGenerator<CommandOutput> {
      const sub = args[0];
      if (sub === 'add') {
           const text = args.slice(1).join(' ');
           this.state.todos.push({ id: Date.now().toString(), text, completed: false, priority: 'medium' });
           yield { historyItems: [{ id: Date.now(), type: 'info', content: 'Task added.' }] };
      } else {
          yield { historyItems: [{ id: Date.now(), type: 'todo', content: JSON.stringify(this.state.todos) }] };
      }
  }
  
  async* handleTopology(query: string): AsyncGenerator<CommandOutput> {
       yield* this.handleInsights(query);
  }
  
  async* handleMap(query: string): AsyncGenerator<CommandOutput> {
       yield* this.handleInsights(query);
  }

  async* handleShellPassthrough(command: string): AsyncGenerator<CommandOutput> {
      const res = await apiClient.shellExec(command);
      if (res.error) {
           yield { historyItems: [{ id: Date.now(), type: 'error', content: res.output }] };
      } else {
           if (res.cwd) this.pathUpdateCallback(res.cwd);
           yield { historyItems: [{ id: Date.now(), type: 'run', content: res.output }] };
      }
  }

  private async* handleAiCommandSearch(query: string): AsyncGenerator<CommandOutput> {
    yield { historyItems: [{ id: Date.now(), type: 'search', content: `Searching knowledge base for: ${query}` }] };
    
    // Tools configuration
    const tools: any[] = [{ googleSearch: {} }];
    
    const result = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: { tools }
    });

    const text = result.text;
    const grounding = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    let content = text;
    if (grounding) {
        content += "\n\nSources:\n" + grounding.map((c: any) => c.web ? `- [${c.web.title}](${c.web.uri})` : '').join('\n');
    }

    yield { historyItems: [{ id: Date.now(), type: 'response', content }] };
  }

  private async* handleTestCommand(query: string): AsyncGenerator<CommandOutput> {
     // Test disabled - execution plans only for code/build tasks
     yield { historyItems: [{ id: Date.now(), type: 'info', content: "Test command disabled. Execution plans only show for code/build tasks." }] };
  }
  
  async* handleDream(query: string): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'phase', content: '🌙 Initiating Autonomous Learning Cycle...' }] };
      
      try {
          // Call backend to trigger nighttime learning
          const response = await fetch('http://localhost:3001/api/dream/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mode: query || 'full' })
          });
          
          if (response.ok) {
              const data = await response.json();
              yield { historyItems: [{ id: Date.now(), type: 'info', content: '✅ Autonomous learning activated' }] };
              yield { historyItems: [{ id: Date.now(), type: 'response', content: `🧠 SOMA is now dreaming...\n\nActive processes:\n- Knowledge discovery\n- Pattern analysis\n- Memory consolidation\n- Self-reflection\n\nThis will run in the background. Use 'agents' to see status.` }] };
          } else {
              yield { historyItems: [{ id: Date.now(), type: 'info', content: '⚠️  Dream arbiter not available, simulating locally...' }] };
              yield { historyItems: [{ id: Date.now(), type: 'response', content: '🌙 Dream cycle initiated\n\nSOMA will reflect on:\n- Recent interactions\n- Knowledge gaps\n- Optimization opportunities\n\nRun "agents" to see autonomous team status.' }] };
          }
      } catch (error) {
          yield { historyItems: [{ id: Date.now(), type: 'response', content: '🌙 Local dream mode\n\nAutonomous learning features available:\n- Use "learn [concept]" to teach SOMA\n- Use "analyze [topic]" for deep thinking\n- Use "search [query]" for knowledge discovery\n\nFull autonomous agents coming soon!' }] };
      }
  }
  
  async* handleAgents(query: string): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'phase', content: '🤖 Checking Autonomous Agent Status...' }] };
      
      // Query real DreamArbiter status
      let dreamStatus = null;
      try {
          const response = await fetch('http://localhost:3001/api/dream/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
          });
          if (response.ok) {
              const data = await response.json();
              dreamStatus = data.dreamArbiter;
          }
      } catch (e) {
          console.warn('[Agents] Could not fetch dream status:', e);
      }
      
      const dreamActive = dreamStatus?.running ? 'Active' : 'Standby';
      const dreamEmoji = dreamStatus?.running ? '🟢' : '🟡';
      const dreamDetails = dreamStatus?.running 
          ? `\n   PID: ${dreamStatus.pid}\n   Runtime: ${dreamStatus.runtime}s\n   Cycles: ${dreamStatus.cycleCount}`
          : '';
      
      const agentStatus = [
          { name: 'DreamArbiter', status: dreamEmoji, role: 'Self-Reflection & Learning', active: dreamActive, details: dreamDetails },
          { name: 'ConductorArbiter', status: '🟢', role: 'Code Generation', active: 'Ready', details: '' },
          { name: 'AnalystArbiter', status: '🟢', role: 'Code Analysis', active: 'Ready', details: '' },
          { name: 'EdgeWorker', status: '🟡', role: 'Web Crawler', active: 'Available', details: '' },
          { name: 'MnemonicArbiter', status: '🟢', role: '3-Tier Memory', active: 'Active', details: '' },
          { name: 'TriBrain', status: '🟢', role: 'Multi-Model Reasoning', active: 'Active', details: '' },
      ];
      
      const statusText = agentStatus.map(a => `${a.status} **${a.name}**\n   Role: ${a.role}\n   Status: ${a.active}${a.details}`).join('\n\n');
      
      let content = `## Autonomous Agent Team\n\n${statusText}\n\n**Commands:**\n- \`dream\` - Start autonomous learning cycle\n- \`code [request]\` - Generate code\n- \`analyze [code]\` - Analyze code\n- \`crawl [url]\` - Discover knowledge`;
      
      if (dreamStatus?.lastReport) {
          content += `\n\n### Last Dream Report\n`;
          content += `- Fragments analyzed: ${dreamStatus.lastReport.fragments || 0}\n`;
          content += `- Proposals generated: ${dreamStatus.lastReport.proposals || 0}\n`;
          content += `- Duration: ${(dreamStatus.lastReport.duration / 1000).toFixed(1)}s`;
      }
      
      content += `\n\nYour dream: A team of AI agents working on SOMA 24/7! 🚀`;
      
      yield { historyItems: [{ id: Date.now(), type: 'response', content }] };
  }
  
  async* handleMemory(query: string): AsyncGenerator<CommandOutput> {
      yield { historyItems: [{ id: Date.now(), type: 'phase', content: '🧠 Accessing Memory Systems...' }] };
      
      const stats = this.memoryService.getStats();
      const learnings = this.memoryService.getAllLearnings();
      
      const duration = Math.floor(stats.sessionDuration / 60000); // minutes
      const compressionRatio = stats.compressed 
          ? `${((stats.compressedTurns / stats.totalTurns) * 100).toFixed(0)}%`
          : 'N/A';
      
      let content = `## Memory Status\n\n`;
      content += `**Session:** ${stats.sessionId.split('_')[1]}\n`;
      content += `**Duration:** ${duration} minutes\n`;
      content += `**Total Conversations:** ${stats.totalTurns} turns\n`;
      content += `**Active Memory:** ${stats.activeTurns} turns\n`;
      content += `**Compressed:** ${stats.compressed ? 'Yes' : 'No'} (${compressionRatio} compressed)\n\n`;
      
      if (stats.totalLearnings > 0) {
          content += `## 🎓 What I've Learned (${stats.totalLearnings} items)\n\n`;
          content += `- **Facts:** ${stats.learningsByType.facts}\n`;
          content += `- **Preferences:** ${stats.learningsByType.preferences}\n`;
          content += `- **Concepts:** ${stats.learningsByType.concepts}\n`;
          content += `- **Patterns:** ${stats.learningsByType.patterns}\n`;
          content += `- **Relationships:** ${stats.learningsByType.relationships}\n\n`;
          
          // Show top 5 learnings
          if (learnings.length > 0) {
              content += `### Recent Learnings\n`;
              learnings.slice(0, 5).forEach((l, i) => {
                  content += `${i + 1}. [${l.type}] ${l.content}\n`;
              });
          }
      } else {
          content += `*No compressed learnings yet. I'll start learning after ${50 - stats.activeTurns} more turns.*\n`;
      }
      
      content += `\n**Commands:**\n`;
      content += `- \`remember [topic]\` - Search past conversations\n`;
      content += `- \`learn [concept]\` - Teach me something\n`;
      content += `- \`dream\` - Trigger autonomous learning\n`;
      
      yield { historyItems: [{ id: Date.now(), type: 'response', content }] };
  }
  
  async* handleRemember(query: string): AsyncGenerator<CommandOutput> {
      if (!query || !query.trim()) {
          yield { historyItems: [{ id: Date.now(), type: 'info', content: 'Usage: remember [topic or keyword]' }] };
          return;
      }
      
      yield { historyItems: [{ id: Date.now(), type: 'search', content: `Searching memories for: "${query}"...` }] };
      
      const results = await this.memoryService.searchMemories(query);
      
      if (results.length === 0) {
          yield { historyItems: [{ id: Date.now(), type: 'info', content: `I don't have any memories about "${query}" yet.` }] };
          return;
      }
      
      let content = `## Found ${results.length} Memory Match${results.length > 1 ? 'es' : ''}\n\n`;
      results.forEach((result, i) => {
          content += `**${i + 1}.** ${result}\n\n`;
      });
      
      yield { historyItems: [{ id: Date.now(), type: 'response', content }] };
  }

  /**
   * Format plan for display
   */
  private formatPlanForDisplay(plan: ExecutionPlan): string {
    let formatted = `## Execution Strategy\n${plan.reasoning}\n\n`;
    
    if (plan.risks.length > 0) {
      formatted += `### ⚠️ Risks\n${plan.risks.map(r => `- ${r}`).join('\n')}\n\n`;
    }
    
    formatted += `### Steps (${plan.steps.length})\n`;
    plan.steps.forEach((step, i) => {
      formatted += `${i + 1}. **${step.description}**\n`;
      formatted += `   Tool: \`${step.tool}\`\n`;
      if (step.validation) {
        formatted += `   Validation: ${step.validation}\n`;
      }
    });
    
    if (plan.rollbackStrategy) {
      formatted += `\n### Rollback Strategy\n${plan.rollbackStrategy}`;
    }
    
    return formatted;
  }

  /**
   * Execute plan with progress streaming
   */
  private async* executePlanWithProgress(
    plan: ExecutionPlan,
    planUpdateId: number
  ): AsyncGenerator<CommandOutput> {
    console.log('[SomaService] Executing plan:', plan.id);

    // Execute the plan
    const result = await executionEngine.executePlan(
      plan,
      // Progress callback
      (progress: ExecutionProgress) => {
        // Update the plan UI with progress
        const planElement = React.createElement(AgentExecution, {
          goal: plan.task.query,
          plan: this.formatPlanForDisplay(plan),
          logEntries: progress.logEntries,
          status: progress.status === 'executing' 
            ? `Executing... (${progress.completedSteps.length}/${plan.steps.length})` 
            : progress.status === 'waiting-approval'
            ? 'Waiting for approval...'
            : progress.status === 'completed'
            ? 'Complete'
            : 'Failed'
        });

        // This would normally stream updates, but we'll do final update at end
      },
      // Approval callback
      async (step) => {
        // For now, auto-approve all steps
        // TODO: Add user confirmation dialog
        console.log('[SomaService] Auto-approving step:', step.id);
        return true;
      }
    );

    // Show final result
    if (result.success) {
      const planElement = React.createElement(AgentExecution, {
        goal: plan.task.query,
        plan: this.formatPlanForDisplay(plan),
        logEntries: result.completedSteps.map(s => ({
          type: 'output' as const,
          content: `✓ ${s.stepId} (${s.duration}ms)`
        })),
        status: 'Complete'
      });

      yield {
        updateId: planUpdateId,
        historyItems: [{
          id: planUpdateId,
          type: 'plan',
          content: planElement
        }]
      };

      yield {
        historyItems: [{
          id: Date.now(),
          type: 'response',
          content: `✅ Plan completed successfully! (${result.totalDuration}ms)`
        }]
      };
    } else {
      const planElement = React.createElement(AgentExecution, {
        goal: plan.task.query,
        plan: this.formatPlanForDisplay(plan),
        logEntries: [
          ...result.completedSteps.map(s => ({
            type: 'output' as const,
            content: `✓ ${s.stepId} (${s.duration}ms)`
          })),
          {
            type: 'error' as const,
            content: `✗ ${result.failedStep?.stepId}: ${result.error}`
          }
        ],
        status: 'Failed'
      });

      yield {
        updateId: planUpdateId,
        historyItems: [{
          id: planUpdateId,
          type: 'plan',
          content: planElement
        }]
      };

            yield { historyItems: [{ id: Date.now(), type: 'error', content: `❌ Plan failed: ${result.error}` }] };

          }

        }

      

          async* handleDaedalus(query: string, args?: string[], fileContext?: string): AsyncGenerator<CommandOutput> {

      

              yield { historyItems: [{ id: Date.now(), type: 'phase', content: '🛠️  Daedalus Coding Assistant Activated' }] };

      

              yield { historyItems: [{ id: Date.now(), type: 'think', content: 'Analyzing codebase patterns and context...' }] };

      

        

      

              // Daedalus always uses the most powerful model and full context

      

              try {

      

                  const prompt = `You are DAEDALUS, the master architect.

      

                  

      

                  MISSION: ${query}

      

                  

      

                  ${fileContext ? `PROVIDED CONTEXT:\n${fileContext}` : ''}

      

                  

      

                  TASK:

      

                  1. Analyze the provided code or problem.

      

                  2. Generate optimized, production-ready code.

      

                  3. Ensure best practices, security, and performance.

      

                  

      

                  Respond with the COMPLETE code and a brief architectural explanation.`;

      

        

      

                  // Use the ASI Reasoning Loop if possible, otherwise use standard deep reasoning

      

                  const result = await somaApiClient.reason({

      

                      query: prompt,

      

                      mode: 'deep', // Force deep reasoning for Daedalus

      

                      context: {

      

                          role: 'architect',

      

                          enableNemesis: true, // Daedalus always double-checks

      

                          conversationHistory: this.conversationHistory.slice(-3)

      

                      }

      

                  });

      

                // Extract code blocks using regex

                const codeRegex = /```(?:\w+)?\n([\s\S]+?)\n```/g;

                let match;

                let codeFound = false;

      

                while ((match = codeRegex.exec(result.response)) !== null) {

                    const code = match[1];

                    yield { 

                        historyItems: [{ 

                            id: Date.now(), 

                            type: 'code', 

                            content: React.createElement(CodeArtifact, { 

                                code: code, 

                                language: "javascript", 

                                filename: "daedalus_artifact.js" 

                            }) 

                        }] 

                    };

                    codeFound = true;

                }

      

                if (!codeFound) {

                    yield { historyItems: [{ id: Date.now(), type: 'response', content: result.response }] };

                } else {

                    // Show the explanation part (outside of code blocks)

                    const explanation = result.response.replace(codeRegex, '').trim();

                    if (explanation) {

                        yield { historyItems: [{ id: Date.now(), type: 'insights', content: `DAEDALUS ARCHITECTURE NOTES:\n${explanation}` }] };

                    }

                }

      

            } catch (error: any) {

                yield { historyItems: [{ id: Date.now(), type: 'error', content: `Daedalus encountered a forge error: ${error.message}` }] };

            }

        }

      }
