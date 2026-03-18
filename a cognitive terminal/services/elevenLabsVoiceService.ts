/**
 * ElevenLabsVoiceService - Premium natural voice synthesis for SOMA
 * Uses ElevenLabs API for ultra-realistic voice output
 * Keeps existing speech recognition (Web Speech API or local Whisper)
 */

export type VoiceMode = 'inactive' | 'listening_for_wake' | 'active_conversation' | 'speaking';

export interface ElevenLabsConfig {
    apiKey: string;
    voiceId: string; // ElevenLabs voice ID
    wakeWord: string;
    autoListen: boolean;
    speakResponses: boolean;
    model?: 'eleven_monolingual_v1' | 'eleven_multilingual_v2' | 'eleven_turbo_v2';
    stability?: number; // 0-1, default 0.5
    similarityBoost?: number; // 0-1, default 0.75
    useLocalRecognition?: boolean; // Use Web Speech API (false) or local Whisper (true)
}

export interface VoiceCallbacks {
    onModeChange: (mode: VoiceMode) => void;
    onTranscript: (text: string, isFinal: boolean) => void;
    onCommand: (command: string) => void;
    onError: (error: string) => void;
    onVolumeChange?: (volume: number) => void;
}

export class ElevenLabsVoiceService {
    private recognition: any = null;
    private mode: VoiceMode = 'inactive';
    private config: ElevenLabsConfig;
    private callbacks: VoiceCallbacks | null = null;
    private isInitialized: boolean = false;
    private audioContext: AudioContext | null = null;
    private currentAudio: HTMLAudioElement | null = null;

    // ElevenLabs API endpoint
    private readonly ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

    constructor(config: Partial<ElevenLabsConfig> & { apiKey: string; voiceId: string }) {
        this.config = {
            wakeWord: 'hey soma',
            autoListen: true,
            speakResponses: true,
            model: 'eleven_turbo_v2', // Fastest, lowest latency
            stability: 0.5,
            similarityBoost: 0.75,
            useLocalRecognition: false,
            ...config
        };

        console.log('🎤 ElevenLabsVoiceService initialized');
        console.log(`🔊 Using ElevenLabs voice: ${this.config.voiceId}`);
        console.log(`🔊 Model: ${this.config.model}`);
    }

    /**
     * Initialize voice system with callbacks
     */
    async initialize(callbacks: VoiceCallbacks): Promise<boolean> {
        this.callbacks = callbacks;

        console.log('🎤 Initializing ElevenLabs voice system...');

        // Verify API key
        if (!this.config.apiKey || this.config.apiKey.trim() === '') {
            const errorMsg = 'ElevenLabs API key not configured';
            console.error('🎤', errorMsg);
            this.callbacks.onError(errorMsg);
            return false;
        }

        // Initialize speech recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            const errorMsg = 'Speech recognition not supported in this browser';
            console.error('🎤', errorMsg);
            this.callbacks.onError(errorMsg);
            return false;
        }

        // Create recognition instance
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        // Handle recognition results
        this.recognition.onresult = (event: any) => {
            const last = event.results.length - 1;
            const result = event.results[last];
            const transcript = result[0].transcript.trim().toLowerCase();
            const isFinal = result.isFinal;

            // Check for wake word
            if (this.mode === 'listening_for_wake' && isFinal) {
                if (transcript.includes(this.config.wakeWord)) {
                    console.log('🎤 Wake word detected!');
                    this.setMode('active_conversation');
                    this.callbacks?.onTranscript('', false);
                    this.speak('Yes?'); // Natural acknowledgment with ElevenLabs
                    return;
                }
            }

            // Active conversation
            if (this.mode === 'active_conversation') {
                this.callbacks?.onTranscript(transcript, isFinal);

                if (isFinal && transcript.length > 0) {
                    this.callbacks?.onCommand(transcript);
                }
            }
        };

        // Handle errors
        this.recognition.onerror = (event: any) => {
            console.error('🎤 Speech recognition error:', event.error);

            if (event.error === 'no-speech') return;

            if (event.error === 'not-allowed') {
                this.callbacks?.onError('Microphone permission denied');
                this.stop();
                return;
            }

            if (event.error === 'network') {
                this.callbacks?.onError('Speech recognition requires internet (uses Google servers)');
                this.stop();
                return;
            }

            if (event.error === 'aborted') return;

            this.callbacks?.onError(`Speech error: ${event.error}`);
        };

        // Auto-restart recognition
        this.recognition.onend = () => {
            if (this.mode !== 'inactive' && this.mode !== 'speaking') {
                try {
                    this.recognition.start();
                } catch (e) {
                    console.warn('Recognition restart failed:', e);
                }
            }
        };

        // Create audio context for playback
        this.audioContext = new AudioContext();

        this.isInitialized = true;
        console.log('✅ ElevenLabsVoiceService ready');
        return true;
    }

    /**
     * Start listening for wake word
     */
    startWakeWordDetection() {
        if (!this.isInitialized) {
            const errorMsg = 'Voice service not initialized';
            console.error('🎤', errorMsg);
            this.callbacks?.onError(errorMsg);
            return;
        }

        console.log('🎤 Starting wake word detection...');
        this.setMode('listening_for_wake');

        try {
            this.recognition.start();
            console.log(`🎤 Listening for "${this.config.wakeWord}"...`);
        } catch (e: any) {
            const errorMsg = `Failed to start wake word detection: ${e.message || e}`;
            console.error('🎤', errorMsg);
            this.callbacks?.onError(errorMsg);
        }
    }

    /**
     * Start active conversation mode
     */
    startConversation() {
        if (!this.isInitialized) {
            const errorMsg = 'Voice service not initialized';
            console.error('🎤', errorMsg);
            this.callbacks?.onError(errorMsg);
            return;
        }

        console.log('🎤 Starting conversation mode...');
        this.setMode('active_conversation');

        try {
            this.recognition.start();
            console.log('🎤 Conversation mode active');
        } catch (e: any) {
            const errorMsg = `Failed to start conversation: ${e.message || e}`;
            console.error('🎤', errorMsg);
            this.callbacks?.onError(errorMsg);
        }
    }

    /**
     * Speak text using ElevenLabs premium voice
     */
    async speak(text: string, onEnd?: () => void) {
        if (!this.config.speakResponses) {
            onEnd?.();
            return;
        }

        // Stop any current playback
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        if (!text || text.trim().length === 0) {
            onEnd?.();
            return;
        }

        this.setMode('speaking');

        try {
            console.log(`🔊 Generating speech with ElevenLabs...`);
            const startTime = Date.now();

            // Call ElevenLabs text-to-speech API
            const response = await fetch(
                `${this.ELEVENLABS_API}/text-to-speech/${this.config.voiceId}/stream`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': this.config.apiKey
                    },
                    body: JSON.stringify({
                        text: text,
                        model_id: this.config.model,
                        voice_settings: {
                            stability: this.config.stability,
                            similarity_boost: this.config.similarityBoost
                        }
                    })
                }
            );

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
            }

            // Convert response to audio blob
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            const latency = Date.now() - startTime;
            console.log(`🔊 Speech generated in ${latency}ms`);

            // Play audio
            this.currentAudio = new Audio(audioUrl);

            this.currentAudio.onended = () => {
                console.log('🔊 SOMA finished speaking');
                URL.revokeObjectURL(audioUrl);

                // Return to appropriate listening mode
                if (this.mode === 'speaking') {
                    if (this.config.autoListen) {
                        this.setMode('active_conversation');
                        try {
                            this.recognition.start();
                        } catch (e) {
                            // Already running
                        }
                    } else {
                        this.setMode('inactive');
                    }
                }

                onEnd?.();
            };

            this.currentAudio.onerror = (event) => {
                console.error('🔊 Audio playback error:', event);
                this.setMode('active_conversation');
                onEnd?.();
            };

            await this.currentAudio.play();
            console.log(`🔊 SOMA speaking: "${text.substring(0, 50)}..."`);

        } catch (error: any) {
            console.error('🔊 ElevenLabs speech error:', error);
            this.callbacks?.onError(`Voice synthesis error: ${error.message}`);
            this.setMode('active_conversation');
            onEnd?.();
        }
    }

    /**
     * Stop all voice activity
     */
    stop() {
        console.log('🛑 Stopping voice service');

        this.setMode('inactive');

        // Stop recognition
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {
                // Ignore
            }
        }

        // Stop audio playback
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
    }

    /**
     * Change voice mode
     */
    private setMode(mode: VoiceMode) {
        if (this.mode !== mode) {
            this.mode = mode;
            this.callbacks?.onModeChange(mode);
            console.log(`🎤 Voice mode: ${mode}`);
        }
    }

    /**
     * Get current mode
     */
    getMode(): VoiceMode {
        return this.mode;
    }

    /**
     * Check if currently listening
     */
    isListening(): boolean {
        return this.mode === 'listening_for_wake' || this.mode === 'active_conversation';
    }

    /**
     * Check if currently speaking
     */
    isSpeaking(): boolean {
        return this.mode === 'speaking' || (this.currentAudio !== null && !this.currentAudio.paused);
    }

    /**
     * Enable/disable auto-listening
     */
    setAutoListen(enabled: boolean) {
        this.config.autoListen = enabled;
    }

    /**
     * Enable/disable speaking responses
     */
    setSpeakResponses(enabled: boolean) {
        this.config.speakResponses = enabled;
    }

    /**
     * Change ElevenLabs voice
     */
    setVoiceId(voiceId: string) {
        this.config.voiceId = voiceId;
        console.log(`🔊 Voice changed to: ${voiceId}`);
    }

    /**
     * Test voice with a sample phrase
     */
    async testVoice(text: string = "Hello, I'm SOMA, your artificial superintelligence assistant.") {
        console.log('🧪 Testing ElevenLabs voice...');
        await this.speak(text);
    }
}
