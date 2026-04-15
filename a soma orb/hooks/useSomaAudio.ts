import { useState, useRef, useEffect, useCallback } from 'react';
import { initElevenLabs, textToSpeech, isElevenLabsEnabled } from '../utils/elevenLabsTTS';
import { reasonWithSoma, checkSomaHealth, formatResponseForSpeech, SomaCognitiveStream } from '../utils/somaClient';
import { SystemStatus } from '../components/StatusBar';

// Convert AudioBuffer to WAV format
function audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
  const numberOfChannels = buffer.numberOfChannels;
  const length = buffer.length * numberOfChannels * 2 + 44;
  const result = new ArrayBuffer(length);
  const view = new DataView(result);
  const channels = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numberOfChannels);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numberOfChannels); // avg. bytes/sec
  setUint16(numberOfChannels * 2); // block-align
  setUint16(16); // 16-bit
  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // Write interleaved data
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numberOfChannels; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return Promise.resolve(new Blob([result], { type: 'audio/wav' }));
}

// Audio configuration constants
const OUTPUT_SAMPLE_RATE = 24000;

// Helper for smooth value transitions
const lerp = (start: number, end: number, factor: number) => {
  return start + (end - start) * factor;
};

// Helper to calculate volume from an analyser node
const calculateVolume = (analyser: AnalyserNode, frequencyData: Uint8Array): number => {
  analyser.getByteFrequencyData(frequencyData);
  
  const voiceBins = frequencyData.slice(1, 32); 
  let max = 0;
  for (let i = 0; i < voiceBins.length; i++) {
    if (voiceBins[i] > max) {
        max = voiceBins[i];
    }
  }
  
  const normalized = Math.min(1, max / 200); 
  return normalized;
};

// Validate transcription quality to filter noise/gibberish
const isValidTranscription = (text: string): boolean => {
  // Minimum length check - require at least 8 characters for real speech
  if (text.length < 8) return false;

  const lowerText = text.toLowerCase().trim();

  // Require at least 3 words (single/two-word transcripts are almost always noise)
  const wordCount = lowerText.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 3) {
    console.log(`⚠️ Too few words (${wordCount}) - likely noise: "${text}"`);
    return false;
  }

  // Check for common Whisper hallucination artifacts
  const commonArtifacts = [
    'thank you',
    'thank you.',
    'thank you so much',
    'thanks for watching',
    'thanks for listening',
    'subscribe',
    'like and subscribe',
    'please subscribe',
    'see you next time',
    'see you in the next video',
    'bye bye',
    'goodbye',
    'good night',
    'good morning',
    'you',
    'bye',
    'thank',
    'oh',
    'hello',
    'okay',
    'ok',
    'yeah',
    'yes',
    'no',
    'um',
    'uh',
    'hmm',
    'huh',
    'ah',
    'so',
    'and',
    'the',
    'i\'m sorry',
    'sorry',
    '[BLANK_AUDIO]',
    '[silence]',
    '(upbeat music)',
    '(gentle music)',
    '(music)',
    '(music playing)',
    '(soft music)',
    '(laughing)',
    '(applause)',
    '(silence)',
    '(no audio)',
    '...',
    'you know',
    'i mean',
    'all right',
    'alright',
  ];

  // Filter exact matches of common artifacts
  if (commonArtifacts.includes(lowerText)) {
    return false;
  }

  // Filter if text starts with common hallucination prefixes
  const hallucPrefixes = ['thank you', 'thanks for', 'please subscribe', 'like and', 'see you'];
  if (hallucPrefixes.some(p => lowerText.startsWith(p))) {
    console.log(`⚠️ Hallucination prefix detected: "${text}"`);
    return false;
  }

  // Filter text in parentheses/brackets (Whisper annotations)
  if (/^\s*[\(\[].*[\)\]]\s*$/.test(text)) {
    return false;
  }
  
  // Filter very short gibberish (single letters repeated)
  if (text.length < 5 && /^(.)\1+$/.test(text)) {
    return false;
  }
  
  // Check for reasonable word structure (has at least one vowel)
  const hasVowels = /[aeiouAEIOU]/.test(text);
  if (!hasVowels && text.length > 1) {
    return false;
  }
  
  // Filter excessive punctuation (more than 50% of text)
  const punctuationCount = (text.match(/[.,!?;:]/g) || []).length;
  if (punctuationCount > text.length * 0.5) {
    return false;
  }

  // Filter if text is mostly repeated words (e.g. "the the the the")
  const words = lowerText.split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > 3 && uniqueWords.size <= 2) {
    console.log(`⚠️ Repetitive text filtered: "${text}"`);
    return false;
  }
  
  return true;
};

// Voice Activity Detection - distinguish speech from background noise
// Returns true if the audio pattern looks like human speech
const detectVoiceActivity = (analyser: AnalyserNode, frequencyData: Uint8Array): boolean => {
  analyser.getByteFrequencyData(frequencyData);
  
  // Human speech is concentrated in specific frequency ranges:
  // - Fundamental frequencies (vowels): ~85-255 Hz (bins 3-10 at 16kHz sample rate)
  // - Formants (consonants): ~300-3400 Hz (bins 10-110)
  // Background noise tends to be:
  // - More uniform across frequencies, or
  // - Concentrated in very low frequencies (<80 Hz)
  
  const fftSize = analyser.fftSize;
  const sampleRate = analyser.context.sampleRate;
  const binWidth = sampleRate / fftSize;
  
  // Calculate frequency bin indices
  const voiceFundamentalStart = Math.floor(85 / binWidth);
  const voiceFundamentalEnd = Math.floor(255 / binWidth);
  const voiceFormantStart = Math.floor(300 / binWidth);
  const voiceFormantEnd = Math.floor(3400 / binWidth);
  const noiseBandEnd = Math.floor(80 / binWidth);
  
  // Calculate energy in different bands
  let fundamentalEnergy = 0;
  let formantEnergy = 0;
  let noiseEnergy = 0;
  let totalEnergy = 0;
  
  for (let i = 0; i < frequencyData.length; i++) {
    const energy = frequencyData[i];
    totalEnergy += energy;
    
    if (i >= voiceFundamentalStart && i <= voiceFundamentalEnd) {
      fundamentalEnergy += energy;
    }
    if (i >= voiceFormantStart && i <= voiceFormantEnd) {
      formantEnergy += energy;
    }
    if (i <= noiseBandEnd) {
      noiseEnergy += energy;
    }
  }
  
  // Normalize energies
  const avgTotal = totalEnergy / frequencyData.length;
  const avgFundamental = fundamentalEnergy / (voiceFundamentalEnd - voiceFundamentalStart + 1);
  const avgFormant = formantEnergy / (voiceFormantEnd - voiceFormantStart + 1);
  const avgNoise = noiseEnergy / (noiseBandEnd + 1);
  
  // Speech detection criteria:
  // 1. Total energy above threshold (not silence)
  // 2. Voice frequencies are stronger than noise band
  // 3. Has both fundamental and formant energy (vowels + consonants)
  
  const hasEnoughEnergy = avgTotal > 20; // Raised from 10 — filter ambient noise
  const voiceStrongerThanNoise = (avgFundamental + avgFormant) / 2 > avgNoise * 2.0; // Raised from 1.5
  const hasVoiceCharacteristics = avgFundamental > 25 && avgFormant > 18; // Raised from 15/10
  
  return hasEnoughEnergy && voiceStrongerThanNoise && hasVoiceCharacteristics;
};

export function useSomaAudio() {
  const [isConnected, setIsConnected] = useState(false);
  const [volume, setVolume] = useState(0); // AI Volume (Output)
  const [inputVolume, setInputVolume] = useState(0); // User Volume (Input)
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [somaHealthy, setSomaHealthy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    somaBackend: 'disconnected',
    whisperServer: 'disconnected',
    elevenLabs: 'disabled',
  });
  
  // Refs for audio context and processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const currentVolumeRef = useRef<number>(0);
  const currentInputVolumeRef = useRef<number>(0);
  const conversationIdRef = useRef<string>(`conv_${Date.now()}`);
  const cognitiveStreamRef = useRef<SomaCognitiveStream | null>(null);
  const elevenLabsVoiceIdRef = useRef<string | null>(null);
  
  // Pre-cached acknowledgment audio buffers for instant playback
  const acknowledgmentCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  
  // MediaRecorder for local transcription
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Transcribe audio using local Whisper
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      console.log('🎤 Sending audio to local Whisper API (port 5002)...');
      console.log('🎤 Audio blob size:', audioBlob.size, 'type:', audioBlob.type);

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // Hit the Python Flask server directly
      const response = await fetch('http://localhost:5002/transcribe', {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Whisper error response:', errorText);

          // Provide user-friendly error message based on status
          if (response.status === 0 || response.status === 500) {
            console.error('💡 Is the Whisper server running? Check if Python Flask server is active on port 5002');
          }

          throw new Error(`Whisper API Error: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success || !result.text) {
        console.error('❌ Whisper returned invalid response:', result);
        throw new Error('Invalid transcription response');
      }

      const transcript = result.text.trim();

      console.log('✅ Whisper Transcript:', transcript);

      // Validate transcription quality before processing
      if (!transcript || transcript.length === 0) {
          console.log('⚠️ Empty transcript - likely silence');
          return;
      }
      
      // Filter out low-quality transcriptions
      if (!isValidTranscription(transcript)) {
          console.log('⚠️ Invalid transcription filtered:', transcript);
          return;
      }
      
      console.log('📝 Heard:', transcript);
      await processWithSoma(transcript);
      // Loop will continue automatically via useEffect

    } catch (e: any) {
      if (e.name === 'TimeoutError') {
        console.error('🎤 Transcription timeout - Whisper is taking too long');
      } else if (e.message?.includes('fetch')) {
        console.error('🎤 Cannot connect to Whisper server - is it running on port 5002?');
      } else {
        console.error('🎤 Transcription error:', e.message || e);
      }
      // Loop will retry automatically via useEffect
    }
  };

  // Poll SOMA backend until ready (handles 3-min initialization)
  const waitForSomaBackend = async (): Promise<boolean> => {
    const maxAttempts = 40; // 40 attempts * 5 seconds = 3.3 minutes
    const delayMs = 5000; // Check every 5 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[${attempt}/${maxAttempts}] Checking SOMA backend...`);
      
      setSystemStatus(prev => ({
        ...prev,
        somaBackend: 'initializing',
      }));
      
      const healthy = await checkSomaHealth();
      
      if (healthy) {
        console.log('✅ SOMA backend is ready!');
        setSystemStatus(prev => ({
          ...prev,
          somaBackend: 'connected',
        }));
        setSomaHealthy(true);
        return true;
      }
      
      if (attempt < maxAttempts) {
        console.log(`⏳ SOMA backend not ready. Retrying in ${delayMs/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.error('❌ SOMA backend failed to start after 3+ minutes');
    setSystemStatus(prev => ({
      ...prev,
      somaBackend: 'error',
    }));
    return false;
  };
  
  // Check Whisper server health
  const checkWhisperHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:5002/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };
  
  // Initialize and connect
  const connect = useCallback(async () => {
    try {
      console.log('🔌 Connecting to SOMA...');
      
      // Check SOMA health with polling
      const backendReady = await waitForSomaBackend();
      
      if (!backendReady) {
        throw new Error('SOMA backend failed to initialize. Please check that the server is running at http://localhost:3001');
      }
      
      // Initialize ElevenLabs
      let elevenLabsKey: string | null = null;
      let elevenLabsVoiceId: string | null = null;
      
      if (window.electronAPI) {
        elevenLabsKey = await window.electronAPI.getElevenLabsApiKey();
        elevenLabsVoiceId = await window.electronAPI.getElevenLabsVoiceId();
        console.log('🔑 ElevenLabs API key from Electron:', elevenLabsKey ? '***' + elevenLabsKey.slice(-4) : 'None');
        console.log('🎭 ElevenLabs Voice ID:', elevenLabsVoiceId || 'Default');
      } else {
        elevenLabsKey = (process.env as any).ELEVENLABS_API_KEY;
        elevenLabsVoiceId = (process.env as any).ELEVENLABS_VOICE_ID;
        console.log('🔑 ElevenLabs API key from env:', elevenLabsKey ? '***' + elevenLabsKey.slice(-4) : 'None');
        console.log('🎭 ElevenLabs Voice ID:', elevenLabsVoiceId || 'Default');
      }
      
      const elevenLabsInitialized = initElevenLabs(elevenLabsKey);
      elevenLabsVoiceIdRef.current = elevenLabsVoiceId;
      
      if (!elevenLabsInitialized) {
        console.warn('⚠️ ElevenLabs not available - will use browser speech synthesis');
        console.warn('💡 Tip: Set your ElevenLabs API key in Electron settings for better voice quality');
        setSystemStatus(prev => ({ ...prev, elevenLabs: 'fallback' }));
      } else {
        setSystemStatus(prev => ({ ...prev, elevenLabs: 'enabled' }));
      }
      
      // Load speech synthesis voices (for fallback)
      if ('speechSynthesis' in window) {
        // Load voices
        const loadVoices = () => {
          const voices = speechSynthesis.getVoices();
          console.log(`🎙️ Available speech synthesis voices: ${voices.length}`);
          if (voices.length > 0) {
            voices.slice(0, 5).forEach(v => console.log(`  - ${v.name} (${v.lang})`));
          }
        };
        
        // Voices may not be loaded immediately
        if (speechSynthesis.getVoices().length === 0) {
          speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
        } else {
          loadVoices();
        }
      }
      
      // Setup Audio Contexts
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: OUTPUT_SAMPLE_RATE,
      });
      
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      // Setup Output Analyser (for Orb visualization)
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.1;
      analyserRef.current = analyser;
      analyser.connect(audioContextRef.current.destination);

      // Pre-cache common acknowledgments AFTER audio context is ready
      if (elevenLabsInitialized) {
        console.log('🎤 Pre-caching common acknowledgments...');
        const commonAcks = [
          'Mm-hmm.',
          'Yeah?',
          'Okay.',
          'Right.',
          'Got it.',
          'I see.',
          'Sure thing.',
          'Good question.'
        ];
        
        // Cache in background (don't await to avoid blocking connection)
        (async () => {
          for (const ack of commonAcks) {
            try {
              const result = await textToSpeech(ack, audioContextRef.current!, elevenLabsVoiceId || undefined, { energy: 0.5, stability: 0.6 });
              if (result.success && result.audioBuffer) {
                acknowledgmentCacheRef.current.set(ack, result.audioBuffer);
                console.log(`✅ Cached: "${ack}"`);
              }
            } catch (e) {
              console.warn(`⚠️ Failed to cache "${ack}":`, e);
            }
          }
          console.log(`🎤 Cached ${acknowledgmentCacheRef.current.size}/${commonAcks.length} acknowledgments`);
        })();
      }

      // Check Whisper server
      const whisperHealthy = await checkWhisperHealth();
      if (whisperHealthy) {
        console.log('✅ Whisper server is ready');
        setSystemStatus(prev => ({ ...prev, whisperServer: 'ready' }));
      } else {
        console.warn('⚠️ Whisper server not responding - transcription may fail');
        setSystemStatus(prev => ({ ...prev, whisperServer: 'error' }));
      }
      
      // Get Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Input Analyser (for Button visualization)
      if (inputContextRef.current) {
        const inputAnalyser = inputContextRef.current.createAnalyser();
        inputAnalyser.fftSize = 256;
        inputAnalyser.smoothingTimeConstant = 0.1;
        inputAnalyserRef.current = inputAnalyser;

        const source = inputContextRef.current.createMediaStreamSource(stream);
        source.connect(inputAnalyser);
      }
      
      // Connect to SOMA cognitive stream (optional - for visualization)
      try {
        const cogStream = new SomaCognitiveStream();
        await cogStream.connect();
        cognitiveStreamRef.current = cogStream;
        
        // Log cognitive events
        cogStream.on('*', (event) => {
          console.log('🧠 SOMA:', event.type, event.data);
        });
      } catch (error) {
        console.warn('Could not connect to cognitive stream:', error);
      }
      
      setIsConnected(true);
      console.log('✅ Connected to SOMA');

      // Start local recording loop
      // We need to trigger this *after* state updates, but calling it here is safe as ref is updated
      // Use a small timeout to let state settle
      setTimeout(() => {
          if (streamRef.current) {
             // Call the internal startRecording logic we defined above
             // Since startRecording is defined in scope but depends on state, we need to ensure it sees isConnected=true
             // The connect function sets isConnected, but the closure might capture old state.
             // However, refs are stable.
             // Actually, I'll need to define startRecording inside or use a ref for it.
             // Let's refactor to put startRecording in a useEffect or use a ref-based approach for the loop.
          }
      }, 100);
      
      // Start Visualizer Loop
      const updateVolume = () => {
        // Process Output Volume (AI Speaking)
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          const rawVol = calculateVolume(analyserRef.current, dataArray);
          currentVolumeRef.current = lerp(currentVolumeRef.current, rawVol, 0.5);
          setVolume(currentVolumeRef.current);
        }

        // Process Input Volume (User Speaking) with VAD
        if (inputAnalyserRef.current) {
          const dataArray = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
          const rawInputVol = calculateVolume(inputAnalyserRef.current, dataArray);
          
          // Only show volume if voice activity is detected (filters out background noise)
          const isVoice = detectVoiceActivity(inputAnalyserRef.current, dataArray);
          const filteredVol = isVoice ? rawInputVol : 0;
          
          currentInputVolumeRef.current = lerp(currentInputVolumeRef.current, filteredVol, 0.2);
          setInputVolume(currentInputVolumeRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
      
    } catch (error) {
      console.error('Connection failed:', error);
      alert(error instanceof Error ? error.message : 'Connection failed');
      setIsConnected(false);
      // Only mark the overall connection as failed — don't nuke individual
      // service statuses that were already confirmed healthy
      setSystemStatus(prev => ({
        ...prev,
        somaBackend: prev.somaBackend === 'connected' ? 'connected' : 'error',
      }));
    }
  }, []); // Remove isConnected dependency to avoid re-creation loops

  // Periodic health re-check: keep status indicators accurate while connected
  useEffect(() => {
    if (!isConnected) return;

    const recheckHealth = async () => {
      // Backend
      const backendOk = await checkSomaHealth();
      setSystemStatus(prev => ({
        ...prev,
        somaBackend: backendOk ? 'connected' : 'error',
      }));
      if (backendOk) setSomaHealthy(true);

      // Whisper
      const whisperOk = await checkWhisperHealth();
      setSystemStatus(prev => ({
        ...prev,
        whisperServer: whisperOk ? 'ready' : 'error',
      }));

      // ElevenLabs (check if still enabled)
      setSystemStatus(prev => ({
        ...prev,
        elevenLabs: isElevenLabsEnabled() ? 'enabled' : prev.elevenLabs === 'fallback' ? 'fallback' : 'disabled',
      }));
    };

    // Run immediately on connect, then every 15 seconds
    recheckHealth();
    const interval = setInterval(recheckHealth, 15000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // Resume AudioContext when the tab becomes visible again
  // Browsers auto-suspend AudioContext when a tab is hidden, which kills the visualizer
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        audioContextRef.current?.resume().catch(() => {});
        inputContextRef.current?.resume().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Effect to manage recording loop based on connection state
  useEffect(() => {
      let recordingTimeout: any;
      let isActive = true;
      let voiceDetectedTimeout: any;

      // Cooldown after SOMA finishes speaking to avoid picking up residual speaker audio
      const POST_SPEECH_COOLDOWN_MS = 1500;
      // Require sustained VAD hits before starting to record (prevents single-frame noise triggers)
      const VAD_CONFIRM_COUNT = 3;

      const runRecordingLoop = async () => {
          if (!isActive || !isConnected || !streamRef.current) return;
          
          // If SOMA is talking and user starts speaking, interrupt her
          if (isTalking && inputAnalyserRef.current) {
            const dataArray = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
            const rawInputVol = calculateVolume(inputAnalyserRef.current, dataArray);
            
            // If user volume is significant while SOMA is talking = interruption
            if (rawInputVol > 0.3) {
              console.log('🔊 User interrupting SOMA');
              stopSpeaking();
              // Give user time to finish their thought
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              // SOMA is talking and user is quiet, skip recording
              setTimeout(() => runRecordingLoop(), 500);
              return;
            }
          }
          
          // VAD-TRIGGERED RECORDING: Require multiple consecutive voice detections
          if (inputAnalyserRef.current) {
            let vadHits = 0;
            for (let check = 0; check < VAD_CONFIRM_COUNT; check++) {
              const dataArray = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
              const isVoice = detectVoiceActivity(inputAnalyserRef.current, dataArray);
              if (isVoice) {
                vadHits++;
              }
              if (check < VAD_CONFIRM_COUNT - 1) {
                await new Promise(resolve => setTimeout(resolve, 80));
              }
            }
            
            if (vadHits < VAD_CONFIRM_COUNT) {
              // Not enough sustained voice activity — check again soon
              if (isActive && isConnected && !isTalking) {
                setTimeout(() => runRecordingLoop(), 150);
              }
              return;
            }
            
            console.log('🎭 Sustained voice activity confirmed — starting recording');
          }

          try {
              audioChunksRef.current = [];
              const mediaRecorder = new MediaRecorder(streamRef.current, { 
                  mimeType: 'audio/webm;codecs=opus' 
              });
              mediaRecorderRef.current = mediaRecorder;

              mediaRecorder.ondataavailable = (event) => {
                  if (event.data.size > 0) audioChunksRef.current.push(event.data);
              };

              mediaRecorder.onstop = async () => {
                  setIsListening(false);
                  
                  // Small delay for encoding
                  await new Promise(resolve => setTimeout(resolve, 100));
                  
                  if (audioChunksRef.current.length > 0) {
                      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });

                      // Skip if too small — need at least ~3KB for 4s of real speech
                      const minSize = 3000;
                      if (audioBlob.size < minSize) {
                          console.log(`⚠️ Skipping small audio (${audioBlob.size} bytes < ${minSize} bytes) - likely silence`);
                          if (isActive && isConnected && !isTalking) {
                              setTimeout(() => runRecordingLoop(), 500);
                          }
                          return;
                      }

                      console.log(`✅ Audio chunk ready (${audioBlob.size} bytes) - sending for transcription`);

                      // Only transcribe if we were connected and not talking
                      if (isActive && isConnected && !isTalking) {
                          await transcribeAudio(audioBlob);
                      }
                  }
                  
                  // Continue loop
                  if (isActive && isConnected && !isTalking) {
                      setTimeout(() => runRecordingLoop(), 500);
                  }
              };

              mediaRecorder.start(500); // Collect data every 500ms
              setIsListening(true);

              // Record for 4 seconds — gives Whisper enough context for accurate transcription
              recordingTimeout = setTimeout(() => {
                  if (isActive && mediaRecorder.state === 'recording') {
                      mediaRecorder.stop();
                  }
              }, 4000);

          } catch (e) {
              console.error('Recording error:', e);
              // Retry after delay only if still active
              if (isActive && isConnected && !isTalking) {
                  setTimeout(() => runRecordingLoop(), 2000);
              }
          }
      };

      if (isConnected && !isTalking) {
          // Post-speech cooldown: wait before listening again to avoid picking up
          // residual speaker audio (SOMA's own voice through speakers)
          const cooldown = isTalking === false ? POST_SPEECH_COOLDOWN_MS : 0;
          setTimeout(() => {
            if (isActive && isConnected) {
              runRecordingLoop();
            }
          }, cooldown);
      }

      return () => {
          isActive = false;
          clearTimeout(recordingTimeout);
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              try {
                  mediaRecorderRef.current.stop();
              } catch (e) {
                  console.warn('Error stopping recorder:', e);
              }
          }
      };
  }, [isConnected, isTalking]);
  
  // Generate natural acknowledgment based on user input
  const generateAcknowledgment = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    // Question patterns
    if (lowerQuery.includes('?') || lowerQuery.startsWith('can you') || lowerQuery.startsWith('could you') || lowerQuery.startsWith('how') || lowerQuery.startsWith('what') || lowerQuery.startsWith('why')) {
      const questionAcks = ['Good question.', 'Let me think about that.', 'Hmm, interesting.', 'Right, let me see.', 'Oh, that\'s a good one.'];
      return questionAcks[Math.floor(Math.random() * questionAcks.length)];
    }
    
    // Commands
    if (lowerQuery.startsWith('please') || lowerQuery.includes('can you')) {
      const commandAcks = ['Sure thing.', 'Absolutely.', 'Of course.', 'On it.', 'Let me check.'];
      return commandAcks[Math.floor(Math.random() * commandAcks.length)];
    }
    
    // Statements
    if (lowerQuery.length > 50) {
      const longAcks = ['I see.', 'Mm-hmm, got it.', 'Right, okay.', 'Interesting.', 'Okay, understood.'];
      return longAcks[Math.floor(Math.random() * longAcks.length)];
    }
    
    // Short/casual
    const casualAcks = ['Mm-hmm.', 'Yeah?', 'Okay.', 'Right.', 'Got it.'];
    return casualAcks[Math.floor(Math.random() * casualAcks.length)];
  };
  
  // Check if user is interrupting (detecting speech while SOMA is talking)
  const isUserInterrupting = useRef(false);
  const isSpeaking = useRef(false); // Prevent multiple simultaneous speeches
  
  // Process query with SOMA and speak response
  const processWithSoma = async (query: string) => {
    console.log('🔄 processWithSoma called with query:', query);
    try {
      // 1. Natural acknowledgment based on input type
      const acknowledgment = generateAcknowledgment(query);
      
      // Minimal delay for more responsive feel (50-100ms)
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
      
      // Play quick acknowledgment while fetching
      speakText(acknowledgment);

      // 2. Show thinking state while querying SOMA
      setIsThinking(true);
      console.log('📡 Calling reasonWithSoma...');
      const result = await reasonWithSoma(query, conversationIdRef.current);
      setIsThinking(false);
      console.log('📥 SOMA result:', result);

      if (!result.success || !result.response) {
        const errorMsg = result.error || 'No response from SOMA';
        console.error('❌ SOMA returned error:', errorMsg);

      setIsThinking(false);
        
        // User-friendly error speech
        if (errorMsg.includes('500') || errorMsg.includes('Internal Server Error')) {
          await speakText('Sorry, I had a processing error. Please try again.');
        } else if (errorMsg.includes('timeout') || errorMsg.includes('ECONNREFUSED')) {
          await speakText('I cannot reach my brain right now. Is the backend running?');
        } else {
          await speakText('I encountered an error. Please check the console.');
        }
        return;
      }

      // Format for speech
      const textToSpeak = formatResponseForSpeech(result.response);
      console.log('💬 SOMA says:', textToSpeak.substring(0, 100) + '...');
      console.log(`🎯 Confidence: ${result.confidence || 'unknown'}`);
      console.log('🔊 Calling speakText...');

      // 3. Split into sentences and speak with natural pauses
      await speakWithNaturalPacing(textToSpeak);
      console.log('✅ Speech completed');

    } catch (error: any) {
      console.error('❌ Error processing with SOMA:', error);
      setIsThinking(false);

      // More specific error messages based on error type
      if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
        await speakText('Cannot connect to my backend. Please start the SOMA server.');
      } else if (error.message?.includes('timeout')) {
        await speakText('Request timed out. Please try again.');
      } else {
        await speakText('I encountered an unexpected error. Check the console for details.');
      }
    }
  };
  
  // Speak text with natural sentence-level pauses (like breathing)
  const speakWithNaturalPacing = async (text: string) => {
    // Wait if already speaking
    while (isSpeaking.current) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    isSpeaking.current = true;
    
    try {
      // Split on sentence boundaries
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      
      // Check if user interrupted
      if (isUserInterrupting.current) {
        console.log('🚫 Speech interrupted by user');
        isUserInterrupting.current = false;
        return;
      }
      
      // Speak sentence
      await speakText(sentence);
      
        // Natural pause between sentences (like taking a breath)
        // Longer pause after questions or at end of thought
        if (i < sentences.length - 1) {
          const isQuestion = sentence.includes('?');
          const pauseDuration = isQuestion ? 400 : 250; // ms
          await new Promise(resolve => setTimeout(resolve, pauseDuration));
        }
      }
    } finally {
      isSpeaking.current = false;
    }
  };
  
  // Stop speaking if interrupted
  const stopSpeaking = useCallback(() => {
    console.log('🔇 Stopping speech (interrupted)');
    
    // Stop and disconnect all audio sources to prevent memory leaks
    const sourcesToStop = Array.from(sourcesRef.current);
    sourcesToStop.forEach(source => {
      try {
        // Stop playback
        source.stop();
        // Disconnect from audio graph
        source.disconnect();
      } catch (e) {
        // Source may have already stopped/disconnected - this is fine
      }
    });
    
    // Clear the set after stopping all sources
    sourcesRef.current.clear();
    
    // Cancel browser speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
    setIsTalking(false);
    isUserInterrupting.current = true;
  }, []);
  
  // Convert text to speech and play (returns promise that resolves when audio finishes)
  const speakText = async (text: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      console.log('🔊 speakText called with text:', text.substring(0, 50));
    
    // Enhanced emotion inference from text
    let energy = 0.5;
    let stability = 0.5;
    
    // Excitement / Emphasis
    if (text.includes('!')) energy += 0.25;
    if (text.includes('!!') || text.includes('!!!')) energy += 0.3;
    if (/[A-Z]{2,}/.test(text)) energy += 0.2; // ALL CAPS words
    
    // Enthusiasm keywords
    if (/\b(amazing|awesome|brilliant|fantastic|excellent|perfect|wonderful)\b/i.test(text)) {
      energy += 0.2;
      stability -= 0.1;
    }
    
    // Uncertainty / Thinking
    if (/\b(hmm|uh|um|maybe|perhaps|possibly|might|could)\b/i.test(text)) {
      energy -= 0.1;
      stability -= 0.2; // More variation for thinking
    }
    
    // Technical / Serious
    if (/\b(however|therefore|consequently|specifically|technically|essentially)\b/i.test(text)) {
      stability += 0.2;
      energy -= 0.1;
    }
    
    // Questions = natural rising inflection
    if (text.includes('?')) {
      stability -= 0.15;
      energy += 0.1; // Questions tend to be more engaged
    }
    
    // Short responses = more casual/punchy
    if (text.length < 30) {
      energy += 0.15;
    }
    
    // Long responses = more measured
    if (text.length > 150) {
      stability += 0.15;
    }
    
    const emotion = { energy, stability };
    console.log('🎭 Inferred Emotion:', emotion);

      if (!audioContextRef.current || !analyserRef.current) {
        console.error('❌ Audio context not available');
        resolve(); // Resolve even on error to continue flow
        return;
      }
    
    console.log('📢 Setting isTalking to true');
    setIsTalking(true);
    
    const ctx = audioContextRef.current;
    let audioBuffer: AudioBuffer | null = null;
    
    // Check if this is a cached acknowledgment for instant playback
    const cachedAudio = acknowledgmentCacheRef.current.get(text);
    if (cachedAudio) {
      console.log('⚡ Using CACHED acknowledgment for instant playback:', text);
      audioBuffer = cachedAudio;
    } else if (isElevenLabsEnabled()) {
      // Try ElevenLabs for non-cached phrases
      console.log('🧠 Checking ElevenLabs enabled:', isElevenLabsEnabled());
      console.log('🎭 Voice ID ref:', elevenLabsVoiceIdRef.current);
      console.log('📡 Calling ElevenLabs TTS with voice:', elevenLabsVoiceIdRef.current || 'default');
      
      // Pass emotion settings
      const result = await textToSpeech(text, ctx, elevenLabsVoiceIdRef.current || undefined, emotion);
      console.log('📥 ElevenLabs result:', result);
      
      if (result.success && result.audioBuffer) {
        audioBuffer = result.audioBuffer;
        console.log('✅ SUCCESS! Using ElevenLabs voice - should sound natural');
      } else {
        console.log('❌ ElevenLabs FAILED:', result.error);
        console.log('🔄 Falling back to browser speech synthesis');
      }
    } else {
      console.log('❌ ElevenLabs NOT enabled - using browser speech (robotic)');
    }
    
    // Fallback to browser speech synthesis
    if (!audioBuffer) {
      console.log('🗣️ Using browser SpeechSynthesis API');
      
      // Select best available voice (prefer female voices)
      const voices = speechSynthesis.getVoices();
      const preferredVoices = [
        'Microsoft Zira - English (United States)',
        'Google US English Female',
        'Microsoft David - English (United States)',
        'Google US English'
      ];
      
      let selectedVoice = null;
      for (const voiceName of preferredVoices) {
        selectedVoice = voices.find(v => v.name.includes(voiceName.split(' - ')[0]));
        if (selectedVoice) break;
      }
      
      // If no preferred voice, try to find any female voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.name.toLowerCase().includes('female') || 
          v.name.toLowerCase().includes('zira') ||
          v.name.toLowerCase().includes('samantha')
        );
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('🎭 Selected voice:', selectedVoice.name);
      }
      
      utterance.rate = 1.1; // Slightly faster for more natural flow
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => {
        console.log('🎬 Speech started');
      };
      
        utterance.onend = () => {
          console.log('✅ Speech ended');
          setIsTalking(false);
          resolve(); // Resolve when speech ends
        };
        
        utterance.onerror = (error) => {
          console.error('❌ Speech synthesis error:', error);
          setIsTalking(false);
          resolve(); // Resolve even on error
        };
        
        console.log('📤 Calling speechSynthesis.speak()');
        speechSynthesis.speak(utterance);
        return;
    }
    
      // Play ElevenLabs audio
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserRef.current);
      
      source.addEventListener('ended', () => {
        // Clean up: disconnect and remove from tracking
        try {
          source.disconnect();
        } catch (e) {
          // Already disconnected - this is fine
        }
        sourcesRef.current.delete(source);
        
        // Only set talking to false if all sources finished
        if (sourcesRef.current.size === 0) {
          setIsTalking(false);
        }
        resolve(); // Resolve when audio finishes playing
      });
      
      // Handle errors to prevent orphaned sources
      source.addEventListener('error', (error) => {
        console.error('AudioBufferSource error:', error);
        try {
          source.disconnect();
        } catch (e) {}
        sourcesRef.current.delete(source);
        if (sourcesRef.current.size === 0) {
          setIsTalking(false);
        }
        resolve(); // Resolve even on error to prevent hanging
      });

      source.start(0);
      sourcesRef.current.add(source);
    }); // Close the Promise constructor
  };

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from SOMA...');
    
    // Stop media recorder if recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    if (cognitiveStreamRef.current) {
      cognitiveStreamRef.current.disconnect();
      cognitiveStreamRef.current = null;
    }
    
    if (audioContextRef.current) audioContextRef.current.close();
    if (inputContextRef.current) inputContextRef.current.close();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    // Stop any playing audio
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    speechSynthesis.cancel();

    audioContextRef.current = null;
    inputContextRef.current = null;
    streamRef.current = null;
    analyserRef.current = null;
    inputAnalyserRef.current = null;
    
    setIsConnected(false);
    setIsTalking(false);
    setIsListening(false);
    setVolume(0);
    setInputVolume(0);
    currentVolumeRef.current = 0;
    currentInputVolumeRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Test function to manually send a query
  const testSoma = useCallback(async () => {
    console.log('🧪 Testing SOMA with manual query...');
    await processWithSoma('Hello SOMA, can you hear me?');
  }, []);

  // Expose processWithSoma for manual text input
  const sendTextQuery = useCallback(async (text: string) => {
    if (!isConnected) {
      console.warn('Not connected to SOMA');
      return;
    }
    await processWithSoma(text);
  }, [isConnected]);

  return {
    isConnected,
    isTalking,
    isListening,
    isThinking,
    volume,
    inputVolume,
    connect,
    disconnect,
    somaHealthy,
    testSoma,
    sendTextQuery,
    systemStatus,
  };
}
