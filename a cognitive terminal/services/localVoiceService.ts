/**
 * LocalVoiceService - Fully local speech recognition using Whisper
 * No internet required, completely private
 */

export type VoiceMode = 'inactive' | 'listening_for_wake' | 'active_conversation' | 'speaking';

export interface VoiceConfig {
    wakeWord: string;
    voiceName?: string;
    autoListen: boolean;
    speakResponses: boolean;
}

export interface VoiceCallbacks {
    onModeChange: (mode: VoiceMode) => void;
    onTranscript: (text: string, isFinal: boolean) => void;
    onCommand: (command: string) => void;
    onError: (error: string) => void;
    onVolumeChange?: (volume: number) => void;
}

export class LocalVoiceService {
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private mode: VoiceMode = 'inactive';
    private config: VoiceConfig;
    private callbacks: VoiceCallbacks | null = null;
    private isInitialized: boolean = false;
    private synthesis: SpeechSynthesis;
    private selectedVoice: SpeechSynthesisVoice | null = null;
    private voices: SpeechSynthesisVoice[] = [];
    private audioChunks: Blob[] = [];
    private mediaRecorder: MediaRecorder | null = null;
    private isRecording: boolean = false;

    constructor(config: Partial<VoiceConfig> = {}) {
        this.config = {
            wakeWord: 'hey soma',
            autoListen: true,
            speakResponses: true,
            ...config
        };

        this.synthesis = window.speechSynthesis;
        this.loadVoices();

        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => this.loadVoices();
        }

        console.log('🎤 LocalVoiceService initialized (local Whisper-based)');
    }

    private loadVoices() {
        this.voices = this.synthesis.getVoices();

        // Select best voice for SOMA
        this.selectedVoice =
            this.voices.find(v => v.name.includes('Zira')) ||
            this.voices.find(v => v.name.includes('Samantha')) ||
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
    async initialize(callbacks: VoiceCallbacks): Promise<boolean> {
        this.callbacks = callbacks;

        console.log('🎤 Initializing local voice system (no internet required)...');

        try {
            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            console.log('✅ Microphone access granted');

            // Create audio context for processing
            this.audioContext = new AudioContext();

            this.isInitialized = true;
            console.log('✅ LocalVoiceService ready for conversation');
            return true;

        } catch (e: any) {
            const errorMsg = `Microphone access denied: ${e.message}`;
            console.error('🎤', errorMsg);
            this.callbacks.onError(errorMsg);
            return false;
        }
    }

    /**
     * Start listening for wake word
     */
    async startWakeWordDetection() {
        if (!this.isInitialized || !this.mediaStream) {
            const errorMsg = 'Voice service not initialized';
            console.error('🎤', errorMsg);
            this.callbacks?.onError(errorMsg);
            return;
        }

        console.log('🎤 Starting wake word detection (local mode)...');
        this.setMode('listening_for_wake');

        await this.startRecording();
    }

    /**
     * Start active conversation mode
     */
    async startConversation() {
        if (!this.isInitialized || !this.mediaStream) {
            const errorMsg = 'Voice service not initialized';
            console.error('🎤', errorMsg);
            this.callbacks?.onError(errorMsg);
            return;
        }

        console.log('🎤 Starting conversation mode (local mode)...');
        this.setMode('active_conversation');

        await this.startRecording();
    }

    /**
     * Start recording audio
     */
    private async startRecording() {
        if (!this.mediaStream || this.isRecording) return;

        try {
            this.audioChunks = [];

            // Create media recorder
            this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                mimeType: 'audio/webm'
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                await this.transcribeAudio(audioBlob);

                // Don't auto-restart - let user control with button
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            // Record for 5 seconds, then process
            setTimeout(() => {
                if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                    this.mediaRecorder.stop();
                    this.isRecording = false;
                }
            }, 5000);

            console.log('🎤 Recording started...');

        } catch (e: any) {
            const errorMsg = `Failed to start recording: ${e.message}`;
            console.error('🎤', errorMsg);
            this.callbacks?.onError(errorMsg);
        }
    }

    /**
     * Transcribe audio using local Whisper (via backend)
     */
    private async transcribeAudio(audioBlob: Blob) {
        try {
            console.log('🎤 Sending audio to local Whisper API (port 5002)...');
            this.callbacks?.onTranscript('Processing...', false);

            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            // Hit the Python Flask server directly
            const response = await fetch('http://localhost:5002/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Whisper API Error: ${response.statusText}`);
            }

            const result = await response.json();
            const transcript = result.text;

            console.log('✅ Whisper Transcript:', transcript);

            if (transcript && transcript.length > 0) {
                // If we found a transcript, handle it based on mode
                if (this.mode === 'listening_for_wake') {
                    if (transcript.toLowerCase().includes(this.config.wakeWord)) {
                        console.log('🎤 Wake word detected!');
                        this.setMode('active_conversation');
                        this.speak('Yes?');
                    }
                } else if (this.mode === 'active_conversation') {
                    this.callbacks?.onTranscript(transcript, true);
                    this.callbacks?.onCommand(transcript);
                }
            } else {
                this.callbacks?.onTranscript('', true); // Clear processing message
            }

        } catch (e: any) {
            console.error('🎤 Transcription error:', e);
            this.callbacks?.onError(`Local Whisper Error: ${e.message}`);
        }
    }

    /**
     * Speak text with SOMA's voice
     */
    speak(text: string, onEnd?: () => void) {
        if (!this.config.speakResponses) {
            onEnd?.();
            return;
        }

        this.synthesis.cancel();

        if (!text || text.trim().length === 0) {
            onEnd?.();
            return;
        }

        this.setMode('speaking');

        const utterance = new SpeechSynthesisUtterance(text);

        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }

        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
            console.log('🔊 SOMA finished speaking');

            if (this.mode === 'speaking') {
                if (this.config.autoListen) {
                    this.setMode('active_conversation');
                    this.startRecording();
                } else {
                    this.setMode('inactive');
                }
            }

            onEnd?.();
        };

        utterance.onerror = (event) => {
            console.error('🔊 Speech synthesis error:', event);
            this.setMode('active_conversation');
        };

        this.synthesis.speak(utterance);
        console.log('🔊 SOMA speaking:', text.substring(0, 50) + '...');
    }

    /**
     * Stop all voice activity
     */
    stop() {
        console.log('🛑 Stopping voice service');

        this.setMode('inactive');
        this.isRecording = false;

        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }

        this.synthesis.cancel();
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
        return this.mode === 'speaking' || this.synthesis.speaking;
    }
}
