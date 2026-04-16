/**
 * SOMA Multi-Modal Integration
 * Connects orb's voice + vision systems to SOMA's AudioProcessingArbiter + VisionProcessingArbiter + TheoryOfMindArbiter
 */

export interface SOMATranscriptionResult {
    success: boolean;
    text?: string;
    intent?: {
        primary: string;
        confidence: number;
        alternatives: string[];
    };
    knowledge?: {
        level: string;
        confidence: number;
    };
    metadata?: any;
    error?: string;
}

export interface SOMAVisionResult {
    success: boolean;
    description?: string;
    metadata?: any;
    error?: string;
}

export interface SOMAConfig {
    somaUrl?: string;
    enableIntentAnalysis?: boolean;
    enableAudioStorage?: boolean;
}

export class SOMAudioIntegration {
    private config: Required<SOMAConfig>;
    private ws: WebSocket | null = null;
    private intentCallbacks: ((intent: any) => void)[] = [];

    constructor(config: Partial<SOMAConfig> = {}) {
        this.config = {
            somaUrl: config.somaUrl || 'http://localhost:3001',
            enableIntentAnalysis: config.enableIntentAnalysis !== false,
            enableAudioStorage: config.enableAudioStorage || false
        };

        console.log('🔮 SOMA Audio Integration initialized:', {
            url: this.config.somaUrl,
            intentAnalysis: this.config.enableIntentAnalysis
        });

        // Connect to SOMA WebSocket for real-time updates
        if (this.config.enableIntentAnalysis) {
            this.connectWebSocket();
        }
    }

    /**
     * Send transcript to SOMA for intent analysis
     * (Browser already did STT, we just need SOMA's intelligence)
     */
    async analyzeTranscript(text: string, userId: string = 'orb-user'): Promise<SOMATranscriptionResult> {
        if (!text || text.length === 0) {
            return { success: false, error: 'Empty transcript' };
        }

        try {
            console.log(`🔮 Sending to SOMA: "${text.substring(0, 50)}..."`);

            // Send user message to SOMA
            // This triggers TheoryOfMindArbiter for intent analysis
            const response = await fetch(`${this.config.somaUrl}/api/user/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    message: text,
                    context: {
                        source: 'orb-voice',
                        timestamp: Date.now()
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`SOMA API error: ${response.status}`);
            }

            const result = await response.json();

            console.log('🔮 SOMA analysis complete:', result);

            return {
                success: true,
                text,
                intent: result.intent,
                knowledge: result.knowledge,
                metadata: result.metadata
            };

        } catch (error: any) {
            console.error('🔮 SOMA integration error:', error);
            return {
                success: false,
                text,
                error: error.message
            };
        }
    }

    /**
     * Check SOMA connection status
     */
    async checkConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.somaUrl}/api/agi/status`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) return false;

            const status = await response.json();
            const hasAudio = status.connectedArbiters?.includes('AudioProcessingArbiter');
            const hasToM = status.connectedArbiters?.includes('TheoryOfMindArbiter');

            console.log('🔮 SOMA status:', {
                initialized: status.initialized,
                audioArbiter: hasAudio ? '✅' : '❌',
                theoryOfMind: hasToM ? '✅' : '❌',
                totalArbiters: status.arbiterCount
            });

            return status.initialized && hasToM;

        } catch (error) {
            console.error('🔮 SOMA connection check failed:', error);
            return false;
        }
    }

    /**
     * Connect to SOMA WebSocket for real-time intent updates
     */
    private connectWebSocket() {
        try {
            const wsUrl = this.config.somaUrl.replace('http://', 'ws://').replace('https://', 'wss://');
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('🔮 Connected to SOMA WebSocket');
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    // Check for intent_inferred events
                    if (message.type === 'update' && message.data) {
                        // Broadcast to all listeners
                        this.intentCallbacks.forEach(cb => cb(message.data));
                    }
                } catch (error) {
                    console.error('🔮 WebSocket message parse error:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('🔮 WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('🔮 WebSocket closed, reconnecting in 5s...');
                setTimeout(() => this.connectWebSocket(), 5000);
            };

        } catch (error) {
            console.error('🔮 WebSocket connection failed:', error);
        }
    }

    /**
     * Subscribe to real-time intent updates
     */
    onIntentDetected(callback: (intent: any) => void) {
        this.intentCallbacks.push(callback);
    }

    /**
     * Get SOMA audio processing stats
     */
    async getStats() {
        try {
            const response = await fetch(`${this.config.somaUrl}/api/audio/stats`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const stats = await response.json();
            return stats;

        } catch (error) {
            console.error('🔮 Failed to fetch SOMA stats:', error);
            return null;
        }
    }

    /**
     * Analyze image with SOMA VisionProcessingArbiter
     * @param imageData Base64 encoded image data
     * @param mimeType Image MIME type (image/jpeg, image/png, etc.)
     * @param prompt Optional prompt to guide analysis
     */
    async analyzeImage(imageData: string, mimeType: string, prompt?: string): Promise<SOMAVisionResult> {
        if (!imageData || imageData.length === 0) {
            return { success: false, error: 'Empty image data' };
        }

        try {
            console.log('👁️ Sending image to SOMA for analysis...');

            const response = await fetch(`${this.config.somaUrl}/api/vision/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageData,
                    mimeType,
                    prompt: prompt || 'Describe what you see in this image.',
                    options: {}
                })
            });

            if (!response.ok) {
                throw new Error(`SOMA Vision API error: ${response.status}`);
            }

            const result = await response.json();

            console.log('👁️ SOMA vision analysis complete');

            return {
                success: true,
                description: result.description,
                metadata: result.metadata
            };

        } catch (error: any) {
            console.error('👁️ SOMA vision integration error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get SOMA vision processing stats
     */
    async getVisionStats() {
        try {
            const response = await fetch(`${this.config.somaUrl}/api/vision/stats`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const stats = await response.json();
            return stats;

        } catch (error) {
            console.error('👁️ Failed to fetch SOMA vision stats:', error);
            return null;
        }
    }

    /**
     * Disconnect from SOMA
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Export singleton instance
let somaIntegration: SOMAudioIntegration | null = null;

export function getSOMAIntegration(config?: Partial<SOMAConfig>): SOMAudioIntegration {
    if (!somaIntegration) {
        somaIntegration = new SOMAudioIntegration(config);
    }
    return somaIntegration;
}
