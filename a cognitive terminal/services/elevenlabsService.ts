/**
 * ElevenLabs TTS Service - Premium voice synthesis for SOMA
 * Uses ElevenLabs API for natural, high-quality text-to-speech
 */

export interface ElevenLabsConfig {
    apiKey: string;
    voiceId: string;
    modelId?: string;
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
}

export class ElevenLabsService {
    private config: ElevenLabsConfig;
    private audioContext: AudioContext | null = null;
    private currentAudioSource: AudioBufferSourceNode | null = null;

    constructor(config: ElevenLabsConfig) {
        this.config = {
            modelId: 'eleven_turbo_v2_5', // Fast, high-quality model
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0.0,
            useSpeakerBoost: true,
            ...config
        };

        // Initialize audio context
        if (typeof window !== 'undefined') {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        console.log('🎙️ ElevenLabs TTS Service initialized');
    }

    /**
     * Generate speech from text using ElevenLabs API
     */
    async speak(text: string, onEnd?: () => void): Promise<void> {
        if (!text || text.trim().length === 0) {
            onEnd?.();
            return;
        }

        try {
            console.log('🎙️ Generating ElevenLabs speech:', text.substring(0, 50) + '...');

            // Stop any currently playing audio
            this.stop();

            // Call ElevenLabs API
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}/stream`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': this.config.apiKey
                    },
                    body: JSON.stringify({
                        text: text,
                        model_id: this.config.modelId,
                        voice_settings: {
                            stability: this.config.stability,
                            similarity_boost: this.config.similarityBoost,
                            style: this.config.style,
                            use_speaker_boost: this.config.useSpeakerBoost
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
            }

            // Get audio data as array buffer
            const arrayBuffer = await response.arrayBuffer();

            // Decode and play audio
            await this.playAudioBuffer(arrayBuffer, onEnd);

            console.log('✅ ElevenLabs speech playing');

        } catch (error) {
            console.error('❌ ElevenLabs TTS error:', error);
            throw error;
        }
    }

    /**
     * Play audio buffer through Web Audio API
     */
    private async playAudioBuffer(arrayBuffer: ArrayBuffer, onEnd?: () => void): Promise<void> {
        if (!this.audioContext) {
            throw new Error('AudioContext not initialized');
        }

        try {
            // Decode audio data
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // Create audio source
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);

            // Handle playback end
            source.onended = () => {
                console.log('🔊 ElevenLabs speech finished');
                this.currentAudioSource = null;
                onEnd?.();
            };

            // Play
            source.start(0);
            this.currentAudioSource = source;

        } catch (error) {
            console.error('❌ Audio playback error:', error);
            throw error;
        }
    }

    /**
     * Stop current speech
     */
    stop(): void {
        if (this.currentAudioSource) {
            try {
                this.currentAudioSource.stop();
                this.currentAudioSource.disconnect();
                this.currentAudioSource = null;
            } catch (e) {
                // Already stopped
            }
        }
    }

    /**
     * Check if currently speaking
     */
    isSpeaking(): boolean {
        return this.currentAudioSource !== null;
    }

    /**
     * Get available voices from ElevenLabs
     */
    async getVoices(): Promise<any[]> {
        try {
            const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                headers: {
                    'xi-api-key': this.config.apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch voices: ${response.status}`);
            }

            const data = await response.json();
            return data.voices || [];

        } catch (error) {
            console.error('❌ Failed to fetch ElevenLabs voices:', error);
            return [];
        }
    }

    /**
     * Update voice settings
     */
    updateSettings(settings: Partial<ElevenLabsConfig>): void {
        this.config = { ...this.config, ...settings };
        console.log('🎙️ ElevenLabs settings updated');
    }
}
