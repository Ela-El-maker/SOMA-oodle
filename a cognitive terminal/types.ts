
// FIX: Import React to use React.ReactNode
import React from 'react';

// FIX: Add missing 'install', 'run', 'execution', and 'phase' to OutputType. This resolves errors in somaService.ts and Terminal.tsx.
export type OutputType = 'command' | 'info' | 'response' | 'error' | 'help' | 'status' | 'insights' | 'search' | 'learn' | 'think' | 'plan' | 'code' | 'debug' | 'refactor' | 'crawl' | 'compress' | 'generate' | 'dialogue' | 'install' | 'run' | 'execution' | 'phase' | 'export' | 'bus' | 'image' | 'palette' | 'design' | 'todo';

export type Priority = 'high' | 'medium' | 'low';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
}

export interface HistoryItem {
  id: number;
  type: OutputType;
  content: React.ReactNode;
}

export interface CommandOutput {
  historyItems: HistoryItem[];
  suggestion?: string;
  suggestions?: string[];
  resultText?: string;
  requiresConfirmation?: string;
  updateId?: number; // ID of the history item to update
}

export interface ExecutionLogEntry {
    type: 'thought' | 'command' | 'output' | 'error' | 'artifact';
    content: React.ReactNode;
}

export interface Metrics {
  autonomyLevel: number;
  concepts: number;
  patterns: number;
  knowledgeNodes: number;
  totalInteractions: number;
}

export interface KnowledgeNode {
  id: string;
  title: string;
  summary: string;
  url: string | null;
  ts?: number;
  weight?: number;
}

export interface KnowledgeEdge {
    id: string;
    from: string; // nodeId
    to: string; // nodeId
    relation: string;
    weight?: number;
}

export interface Pattern {
  signature: string;
  count: number;
  successRate: number;
  hemisphere: 'LOGOS' | 'MYTHOS';
}

export interface Concept {
  concept: string;
  count: number;
}

// --- State Management Types ---

export interface SomaAppState {
  history: HistoryItem[];
  isLoading: boolean;
  currentPath: string;
  isAgentConnected: boolean;
  awaitingConfirmation: string | null;
  suggestions: string[];
}

export type SomaAction =
  | { type: 'ADD_HISTORY'; payload: HistoryItem[] }
  | { type: 'UPDATE_HISTORY'; payload: { id: number; content: React.ReactNode } }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PATH'; payload: string }
  | { type: 'SET_AGENT_CONNECTED'; payload: boolean }
  | { type: 'SET_AWAITING_CONFIRMATION'; payload: string | null }
  | { type: 'SET_SUGGESTIONS'; payload: string[] }
  | { type: 'INIT_STATE', payload: Partial<SomaAppState> };
