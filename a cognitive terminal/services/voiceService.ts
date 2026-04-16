/**
 * VoiceService - Natural conversation with SOMA
 * Full duplex voice communication with learning capability
 * Enhanced with ElevenLabs premium TTS + SOMA intent analysis
 */

import { ElevenLabsService } from './elevenlabsService';
import { getSOMAIntegration, type SOMATranscriptionResult } from './somaAudioIntegration';

export type VoiceMode = 'inactive' | 'listening_for_wake' | 'active_conversation' | 'speaking';

export interface VoiceConfig {
    wakeWord: string;
    voiceName?: string; // Preferred voice
    autoListen: boolean; // Continue listening after response
    speakResponses: boolean; // Speak SOMA's responses
}

export interface VoiceCallbacks {
    onModeChange: (mode: VoiceMode) => void;
    onTranscript: (text: string, isFinal: boolean) => void;
    onCommand: (command: string) => void;
    onError: (error: string) => void;
    onVolumeChange?: (volume: number) => void;
    onIntent?: (analysis: SOMATranscriptionResult) => void;
}

export class VoiceService {
    private recognition: any = null;
    private synthesis: SpeechSynthesis;
    private mode: VoiceMode = 'inactive';
    private config: VoiceConfig;
    private callbacks: VoiceCallbacks | null = null;
    private voices: SpeechSynthesisVoice[] = [];
    private selectedVoice: SpeechSynthesisVoice | null = null;
    private isInitialized: boolean = false;
    private volumeAnalyzer: any = null;
    private audioContext: AudioContext | null = null;
    private elevenLabs: ElevenLabsService | null = null;
    private useElevenLabs: boolean = false;

    constructor(config: Partial<VoiceConfig> = {}) {
        this.config = {
            wakeWord: 'hey soma',
            autoListen: true,
            speakResponses: false,  // Only speak when voice mode is active
            ...config
        };

        this.synthesis = window.speechSynthesis;
        this.loadVoices();

        // Reload voices when available (some browsers load async)
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => this.loadVoices();
        }

        // Initialize ElevenLabs if credentials are available
        this.initializeElevenLabs();

        console.log('🎤 VoiceService initialized');
    }

    private initializeElevenLabs() {
        // Check for ElevenLabs credentials in environment
        const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
        const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID;

        if (apiKey && voiceId) {
            try {
                this.elevenLabs = new ElevenLabsService({
                    apiKey,
                    voiceId
                });
                this.useElevenLabs = true;
                console.log('🎙️ ElevenLabs TTS enabled - SOMA will use premium voice');
            } catch (error) {
                console.warn('⚠️ ElevenLabs initialization failed, falling back to browser TTS:', error);
                this.elevenLabs = null;
                this.useElevenLabs = false;
            }
        } else {
            console.log('ℹ️ ElevenLabs credentials not found, using browser TTS');
            this.useElevenLabs = false;
        }
    }

    private loadVoices() {
        this.voices = this.synthesis.getVoices();

        // Try to find the best female voice for SOMA
        this.selectedVoice =
            // Windows voices
            this.voices.find(v => v.name.includes('Zira')) ||
            this.voices.find(v => v.name.includes('Microsoft Zira')) ||
            // Mac voices
            this.voices.find(v => v.name.includes('Samantha')) ||
            this.voices.find(v => v.name.includes('Victoria')) ||
            // Google voices
            this.voices.find(v => v.name.includes('Google US English Female')) ||
            this.voices.find(v => v.name.includes('Google UK English Female')) ||
            // Fallback to any English female voice
            this.voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
            this.voices.find(v => v.lang.startsWith('en')) ||
            this.voices[0] || null;

        if (this.selectedVoice) {
            console.log(`🔊 SOMA voice: ${this.selectedVoice.name}`);
        }
    }

    /**
     * Initialize voice system with callbacks
     */
    initialize(callbacks: VoiceCallbacks): boolean {
        this.callbacks = callbacks;

        console.log('🎤 Initializing voice system...');
        console.log('🎤 Window object available:', typeof window !== 'undefined');
        console.log('🎤 SpeechRecognition:', typeof (window as any).SpeechRecognition);
        console.log('🎤 webkitSpeechRecognition:', typeof (window as any).webkitSpeechRecognition);
        console.log('🎤 SpeechSynthesis:', typeof window.speechSynthesis);

        // Check for speech recognition support
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            const errorMsg = 'Speech recognition not supported. This browser does not have Web Speech API support.';
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

            // Check for wake word when listening for wake
            if (this.mode === 'listening_for_wake' && isFinal) {
                if (transcript.includes(this.config.wakeWord)) {
                    console.log('🎤 Wake word detected!');
                    this.setMode('active_conversation');
                    this.callbacks?.onTranscript('', false); // Clear any partial transcript
                    this.speak('Yes?'); // Acknowledge
                    return;
                }
            }

            // In active conversation mode, transcribe everything
            if (this.mode === 'active_conversation') {
                this.callbacks?.onTranscript(transcript, isFinal);

                // If final, send as command and analyze with SOMA
                if (isFinal && transcript.length > 0) {
                    this.callbacks?.onCommand(transcript);

                    // Analyze transcript with SOMA for intent detection
                    this.analyzeWithSOMA(transcript);
                }
            }
        };

        // Handle errors
        this.recognition.onerror = (event: any) => {
            console.error('🎤 Speech recognition error:', event.error);

            // Ignore no-speech errors (normal)
            if (event.error === 'no-speech') {
                return;
            }

            // Permission denied - stop everything
            if (event.error === 'not-allowed') {
                this.callbacks?.onError('Microphone permission denied. Please allow microphone access.');
                this.stop();
                return;
            }

            // Network error - very common, needs internet for Google's speech servers
            if (event.error === 'network') {
                this.callbacks?.onError('Speech recognition requires internet connection (uses Google servers). Network unavailable.');
                this.stop();
                return;
            }

            // Service not available
            if (event.error === 'service-not-allowed' || event.error === 'not-available') {
                this.callbacks?.onError('Speech recognition service unavailable. Check internet connection.');
                this.stop();
                return;
            }

            // Aborted is normal during stops
            if (event.error === 'aborted') {
                return;
            }

            this.callbacks?.onError(`Speech error: ${event.error}`);
        };

        // Handle recognition end (auto-restart)
        this.recognition.onend = () => {
            if (this.mode !== 'inactive' && this.mode !== 'speaking') {
                // Auto-restart if still in a listening mode
                try {
                    this.recognition.start();
                } catch (e) {
                    console.warn('Recognition restart failed:', e);
                }
            }
        };

        this.isInitialized = true;
        console.log('✅ VoiceService ready for conversation');
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
            console.log('🎤 Listening for "' + this.config.wakeWord + '"...');
        } catch (e: any) {
            const errorMsg = `Failed to start wake word detection: ${e.message || e}`;
            console.error('🎤', errorMsg, e);
            this.callbacks?.onError(errorMsg);
        }
    }

    /**
     * Start active conversation mode (no wake word needed)
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
            console.error('🎤', errorMsg, e);
            this.callbacks?.onError(errorMsg);
        }
    }

    /**
     * Speak text with SOMA's voice (using ElevenLabs or browser TTS)
     */
    async speak(text: string, onEnd?: () => void) {
        if (!this.config.speakResponses) {
            onEnd?.();
            return;
        }

        // Don't speak if text is empty
        if (!text || text.trim().length === 0) {
            onEnd?.();
            return;
        }

        // Cancel any ongoing speech
        this.stopSpeaking();

        this.setMode('speaking');

        // Try ElevenLabs first, fallback to browser TTS
        if (this.useElevenLabs && this.elevenLabs) {
            try {
                await this.speakWithElevenLabs(text, onEnd);
            } catch (error) {
                console.warn('⚠️ ElevenLabs TTS failed, falling back to browser TTS:', error);
                this.speakWithBrowserTTS(text, onEnd);
            }
        } else {
            this.speakWithBrowserTTS(text, onEnd);
        }
    }

    /**
     * Speak using ElevenLabs premium TTS
     */
    private async speakWithElevenLabs(text: string, onEnd?: () => void) {
        if (!this.elevenLabs) {
            throw new Error('ElevenLabs not initialized');
        }

        const handleEnd = () => {
            console.log('🔊 SOMA finished speaking (ElevenLabs)');
            this.handleSpeechEnd();
            onEnd?.();
        };

        await this.elevenLabs.speak(text, handleEnd);
    }

    /**
     * Speak using browser's built-in TTS (fallback)
     */
    private speakWithBrowserTTS(text: string, onEnd?: () => void) {
        const utterance = new SpeechSynthesisUtterance(text);

        // Use SOMA's selected voice
        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }

        // Natural speech settings
        utterance.rate = 0.95;  // Slightly slower for clarity
        utterance.pitch = 1.0;   // Normal pitch
        utterance.volume = 1.0;  // Full volume

        // Handle speech end
        utterance.onend = () => {
            console.log('🔊 SOMA finished speaking (Browser TTS)');
            this.handleSpeechEnd();
            onEnd?.();
        };

        utterance.onerror = (event) => {
            console.error('🔊 Speech synthesis error:', event);
            this.setMode('active_conversation');
        };

        // Speak
        this.synthesis.speak(utterance);
        console.log('🔊 SOMA speaking (Browser TTS):', text.substring(0, 50) + '...');
    }

    /**
     * Handle speech completion (common logic)
     */
    private handleSpeechEnd() {
        // Return to appropriate listening mode
        if (this.mode === 'speaking') {
            if (this.config.autoListen) {
                this.setMode('active_conversation');
                // Restart listening automatically
                try {
                    this.recognition?.start();
                } catch (e) {
                    // Already running, ignore
                }
            } else {
                this.setMode('inactive');
            }
        }
    }

    /**
     * Stop any ongoing speech
     */
    private stopSpeaking() {
        // Stop ElevenLabs
        if (this.elevenLabs) {
            this.elevenLabs.stop();
        }

        // Stop browser TTS
        this.synthesis.cancel();
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

        // Stop all speech (ElevenLabs and browser TTS)
        this.stopSpeaking();
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
     * Analyze transcript with SOMA for intent detection
     */
    private async analyzeWithSOMA(transcript: string) {
        try {
            console.log('🔮 Sending to SOMA for intent analysis:', transcript);

            const soma = getSOMAIntegration();
            const analysis = await soma.analyzeTranscript(transcript);

            if (analysis.success && analysis.intent) {
                console.log('🔮 SOMA Intent:', analysis.intent.primary, `(${(analysis.intent.confidence * 100).toFixed(0)}%)`);
                console.log('🔮 User Knowledge:', analysis.knowledge?.level);

                // Notify via callback if available
                this.callbacks?.onIntent?.(analysis);
            } else if (analysis.error) {
                console.warn('🔮 SOMA analysis failed:', analysis.error);
            }
        } catch (error) {
            console.error('🔮 SOMA integration error:', error);
            // Don't throw - intent analysis is supplementary
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
        const elevenLabsSpeaking = this.elevenLabs?.isSpeaking() || false;
        return this.mode === 'speaking' || this.synthesis.speaking || elevenLabsSpeaking;
    }

    /**
     * Get available voices
     */
    getVoices(): SpeechSynthesisVoice[] {
        return this.voices;
    }

    /**
     * Set voice by name
     */
    setVoice(voiceName: string) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) {
            this.selectedVoice = voice;
            console.log(`🔊 Voice changed to: ${voice.name}`);
        }
    }

    /**
     * Enable/disable auto-listening after responses
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
}
