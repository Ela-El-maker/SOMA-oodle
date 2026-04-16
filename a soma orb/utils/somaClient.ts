/**
 * SOMA Backend API Client
 * Connects to SOMA's reasoning engine at http://localhost:3001
 */

interface SomaReasonRequest {
  query: string;
  conversationId?: string;
  context?: any;
}

interface SomaReasonResponse {
  success: boolean;
  response?: string;
  error?: string;
  thoughtProcess?: any;
  conversationId?: string;
  confidence?: number;
}

interface CognitiveEvent {
  type: string;
  data: any;
  timestamp: string;
}

const SOMA_API_BASE = 'http://localhost:3001';
const SOMA_WS_BASE = 'ws://localhost:5000';

/**
 * Send a query to SOMA's reasoning engine
 */
export async function reasonWithSoma(
  query: string,
  conversationId?: string
): Promise<SomaReasonResponse> {
  try {
    console.log('🧠 Sending to SOMA:', query.substring(0, 50) + '...');
    
    const response = await fetch(`${SOMA_API_BASE}/api/reason`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        conversationId: conversationId || generateConversationId(),
      }),
      signal: AbortSignal.timeout(45000), // 45 second timeout — AI reasoning can be slow
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`SOMA API error: ${response.status} ${response.statusText} - ${body}`);
    }

    const data = await response.json();
    console.log('✅ SOMA response received');
    
    return {
      success: true,
      response: data.response || data.answer || data.text,
      thoughtProcess: data.thoughtProcess,
      conversationId: data.conversationId,
      confidence: data.confidence,
    };
  } catch (error: any) {
    console.error('❌ SOMA API error:', error);
    
    let userMessage = error.message || 'Failed to communicate with SOMA';
    if (error.name === 'TimeoutError') {
      userMessage = 'Request timed out - backend may be busy or unresponsive';
    } else if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
      userMessage = 'Cannot reach SOMA backend - is it running on port 3001?';
    }
    
    return {
      success: false,
      error: userMessage,
    };
  }
}

/**
 * Check if SOMA backend is running
 */
export async function checkSomaHealth(): Promise<boolean> {
  try {
    // Use the lightweight /health endpoint, NOT /api/health which runs a full orchestrator report
    const response = await fetch(`${SOMA_API_BASE}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout for health check
    });
    return response.ok;
  } catch (error) {
    console.warn('SOMA backend not reachable:', error);
    return false;
  }
}

/**
 * Store memory in SOMA
 */
export async function storeMemory(memory: {
  content: string;
  type?: string;
  importance?: number;
}): Promise<boolean> {
  try {
    const response = await fetch(`${SOMA_API_BASE}/api/memory/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memory),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to store memory:', error);
    return false;
  }
}

/**
 * Recall memories from SOMA
 */
export async function recallMemory(query: string): Promise<any[]> {
  try {
    const response = await fetch(`${SOMA_API_BASE}/api/memory/recall`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.memories || [];
  } catch (error) {
    console.error('Failed to recall memory:', error);
    return [];
  }
}

/**
 * Create WebSocket connection to SOMA's cognitive stream
 * This allows observing SOMA's internal thought process in real-time
 */
export class SomaCognitiveStream {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(event: CognitiveEvent) => void>> = new Map();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${SOMA_WS_BASE}/ws/cognitive`);

        this.ws.onopen = () => {
          console.log('🔌 Connected to SOMA cognitive stream');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const cognitiveEvent: CognitiveEvent = JSON.parse(event.data);
            this.emit(cognitiveEvent.type, cognitiveEvent);
            this.emit('*', cognitiveEvent); // Wildcard for all events
          } catch (error) {
            console.error('Failed to parse cognitive event:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('❌ Disconnected from SOMA cognitive stream');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  on(eventType: string, callback: (event: CognitiveEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  off(eventType: string, callback: (event: CognitiveEvent) => void) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(eventType: string, event: CognitiveEvent) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * Generate a unique conversation ID
 */
function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper to format SOMA's response for speech
 */
export function formatResponseForSpeech(response: string): string {
  // Remove markdown formatting
  let text = response
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1')     // Italic
    .replace(/`(.*?)`/g, '$1')       // Code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
    .replace(/#{1,6}\s/g, '');       // Headers

  // Remove excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
}
