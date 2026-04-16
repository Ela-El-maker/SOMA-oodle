/**
 * SOMA API Client (Production Hardened)
 * 
 * Features:
 * - Automatic retries for 503 (System Initializing)
 * - Connection keep-alive
 * - Robust error handling
 */

const SOMA_BACKEND_URL = 'http://localhost:3001';

export interface SomaReasonRequest {
  query: string;
  mode?: 'balanced' | 'creative' | 'analytical' | 'strategic' | 'safe';
  context?: any;
}

export interface SomaReasonResponse {
  response: string;
  brain: string;
  confidence: number;
  timestamp: string;
}

export class SomaApiClient {
  private baseUrl: string;
  private maxRetries = 15; // 30 seconds total (15 * 2s)

  constructor(baseUrl: string = SOMA_BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Send a query with "Wake Up" logic
   */
  async reason(request: SomaReasonRequest): Promise<SomaReasonResponse> {
    const payload = {
        query: request.query,
        context: {
            ...(request.context || {}),
            mode: request.mode // Pass mode in context so Arbiter can use it
        }
    };
    return this._fetchWithRetry('/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Internal fetch with robust retry logic
   */
  private async _fetchWithRetry(endpoint: string, options: RequestInit, attempts = 0): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);

      // CASE: System Initializing (503)
      if (response.status === 503) {
        if (attempts < this.maxRetries) {
          console.log(`[SomaAPI] System initializing... retry ${attempts + 1}/${this.maxRetries}`);
          // Wait 2 seconds
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this._fetchWithRetry(endpoint, options, attempts + 1);
        } else {
          throw new Error('SOMA took too long to wake up. Please check the backend console.');
        }
      }

      if (!response.ok) {
        throw new Error(`SOMA API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error: any) {
      // Network errors (Connection Refused) also trigger retries if early
      if (error.message.includes('Failed to fetch') && attempts < this.maxRetries) {
         console.log(`[SomaAPI] Connection failed... retrying ${attempts + 1}`);
         await new Promise(resolve => setTimeout(resolve, 2000));
         return this._fetchWithRetry(endpoint, options, attempts + 1);
      }
      throw error;
    }
  }

  /**
   * Check if SOMA backend is ready
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      if (response.status === 200) return true;
      return false; // 503 or other
    } catch {
      return false;
    }
  }

  detectMode(query: string): string {
    const lower = query.toLowerCase();
    if (lower.includes('creative') || lower.includes('imagine')) return 'creative';
    if (lower.includes('analyze') || lower.includes('logic')) return 'analytical';
    if (lower.includes('plan') || lower.includes('strategy')) return 'strategic';
    return 'balanced';
  }

  /**
   * Query multiple brains in parallel (for Reasoning Leaf integration)
   */
  async multibrainReason(request: {
    query: string;
    brains?: string[];
    context?: any;
  }): Promise<Array<{ brain: string; response: string; confidence: number }>> {
    return this._fetchWithRetry('/api/reason-multibrain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }).then(data => data.brains || []);
  }
}

export const somaApiClient = new SomaApiClient();
