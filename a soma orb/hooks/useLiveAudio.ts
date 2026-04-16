import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';
import { initElevenLabs, textToSpeech, isElevenLabsEnabled } from '../utils/elevenLabsTTS';

// Audio configuration constants
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;

// Helper for smooth value transitions
const lerp = (start: number, end: number, factor: number) => {
  return start + (end - start) * factor;
};

// Helper to calculate volume from an analyser node
const calculateVolume = (analyser: AnalyserNode, frequencyData: Uint8Array): number => {
  analyser.getByteFrequencyData(frequencyData);
  
  // Focus on the speech frequency range (roughly 85Hz - 3kHz)
  // With 24kHz sample rate & 256 FFT size (128 bins), each bin is ~93Hz.
  // Bins 1-32 cover approx 93Hz to 3000Hz.
  const voiceBins = frequencyData.slice(1, 32); 
  
  // PEAK DETECTION: Find the loudest frequency in the voice range
  let max = 0;
  for (let i = 0; i < voiceBins.length; i++) {
    if (voiceBins[i] > max) {
        max = voiceBins[i];
    }
  }
  
  // Normalize based on 200 (avoiding full 255 to allow hitting max easier)
  // This makes the visuals "hotter" and more reactive.
  const normalized = Math.min(1, max / 200); 
  
  return normalized;
};

export function useLiveAudio() {
  const [isConnected, setIsConnected] = useState(false);
  const [volume, setVolume] = useState(0); // AI Volume (Output)
  const [inputVolume, setInputVolume] = useState(0); // User Volume (Input)
  const [isTalking, setIsTalking] = useState(false);
  
  // Refs for audio context and processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  
  const analyserRef = useRef<AnalyserNode | null>(null); // For AI Output
  const inputAnalyserRef = useRef<AnalyserNode | null>(null); // For User Input

  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const currentVolumeRef = useRef<number>(0);
  const currentInputVolumeRef = useRef<number>(0);

  // Initialize the Gemini Client
  const connect = useCallback(async () => {
    try {
      // Get API key from Electron or environment
      let apiKey: string | null = null;
      
      if (window.electronAPI) {
        // Running in Electron
        apiKey = await window.electronAPI.getApiKey();
        
        // If no stored key, prompt user
        if (!apiKey) {
          apiKey = prompt('Please enter your Gemini API key:\n\nYou can get one from https://ai.google.dev/');
          if (apiKey) {
            const remember = confirm('Would you like to save this API key for future use?');
            await window.electronAPI.setApiKey(apiKey, remember);
          } else {
            throw new Error('API key is required');
          }
        }
      } else {
        // Running in browser (development)
        apiKey = (process.env as any).API_KEY || (process.env as any).GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('API key not found in environment variables');
        }
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      // Initialize ElevenLabs if available
      let elevenLabsKey: string | null = null;
      if (window.electronAPI) {
        elevenLabsKey = await window.electronAPI.getElevenLabsApiKey();
      } else {
        elevenLabsKey = (process.env as any).ELEVENLABS_API_KEY;
      }
      initElevenLabs(elevenLabsKey);
      
      // Setup Audio Contexts
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: OUTPUT_SAMPLE_RATE,
      });
      
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: INPUT_SAMPLE_RATE,
      });

      // Setup Output Analyser (for Orb)
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.1; // Very low smoothing for instant reaction (Pulse)
      analyserRef.current = analyser;
      analyser.connect(audioContextRef.current.destination);

      // Get Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Input Analyser (for Button)
      if (inputContextRef.current) {
        const inputAnalyser = inputContextRef.current.createAnalyser();
        inputAnalyser.fftSize = 256;
        inputAnalyser.smoothingTimeConstant = 0.1;
        inputAnalyserRef.current = inputAnalyser;

        const source = inputContextRef.current.createMediaStreamSource(stream);
        source.connect(inputAnalyser); 
        
        // Setup Script Processor for sending data to Gemini
        const scriptProcessor = inputContextRef.current.createScriptProcessor(BUFFER_SIZE, 1, 1);
        scriptProcessor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBlob = createPcmBlob(inputData);
          
          if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          }
        };
        
        source.connect(scriptProcessor);
        scriptProcessor.connect(inputContextRef.current.destination);
      }

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            setIsConnected(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle text response (for ElevenLabs TTS)
            const textResponse = message.serverContent?.modelTurn?.parts?.[0]?.text;
            
            if (textResponse && audioContextRef.current && analyserRef.current) {
              const ctx = audioContextRef.current;
              let audioBuffer: AudioBuffer | null = null;
              
              // Try ElevenLabs first if enabled
              if (isElevenLabsEnabled()) {
                const result = await textToSpeech(textResponse, ctx);
                if (result.success && result.audioBuffer) {
                  audioBuffer = result.audioBuffer;
                  console.log('Using ElevenLabs voice');
                } else {
                  console.log('ElevenLabs failed, response will use Gemini voice on next message');
                  // Don't process this message's text, let Gemini resend with audio
                  return;
                }
              }
              
              if (audioBuffer) {
                setIsTalking(true);
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(analyserRef.current);
                
                source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) {
                    setIsTalking(false);
                  }
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              }
            }
            
            // Handle Audio Output (Gemini fallback or when ElevenLabs is disabled)
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio && audioContextRef.current && analyserRef.current) {
              setIsTalking(true);
              console.log('Using Gemini voice');
              
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioData = base64ToUint8Array(base64Audio);
              const audioBuffer = await decodeAudioData(audioData, ctx, OUTPUT_SAMPLE_RATE, 1);
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(analyserRef.current);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                  setIsTalking(false);
                }
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
            
            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(src => {
                try { src.stop(); } catch (e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsTalking(false);
            }
          },
          onclose: () => {
            console.log('Gemini Live Closed');
            setIsConnected(false);
            setIsTalking(false);
          },
          onerror: (err) => {
            console.error('Gemini Live Error', err);
            setIsConnected(false);
          }
        },
        config: {
          // Request both text and audio - text for ElevenLabs, audio as fallback
          responseModalities: isElevenLabsEnabled() ? [Modality.TEXT, Modality.AUDIO] : [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: "You are SOMA, a witty and helpful AI agent. Keep your responses concise and conversational."
        }
      });

      sessionPromiseRef.current = sessionPromise;

      // Start Visualizer Loop
      const updateVolume = () => {
        if (!isConnected) {
            currentVolumeRef.current = lerp(currentVolumeRef.current, 0, 0.05);
            currentInputVolumeRef.current = lerp(currentInputVolumeRef.current, 0, 0.1);
            setVolume(currentVolumeRef.current);
            setInputVolume(currentInputVolumeRef.current);
            animationFrameRef.current = requestAnimationFrame(updateVolume);
            return;
        }

        // 1. Process Output Volume (AI Speaking)
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          const rawVol = calculateVolume(analyserRef.current, dataArray);
          // Very fast lerp (0.5) to capture the sharp "pulse" of speech
          currentVolumeRef.current = lerp(currentVolumeRef.current, rawVol, 0.5);
          setVolume(currentVolumeRef.current);
        }

        // 2. Process Input Volume (User Speaking)
        if (inputAnalyserRef.current) {
          const dataArray = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
          const rawInputVol = calculateVolume(inputAnalyserRef.current, dataArray);
          // Medium response for button
          currentInputVolumeRef.current = lerp(currentInputVolumeRef.current, rawInputVol, 0.2);
          setInputVolume(currentInputVolumeRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

    } catch (error) {
      console.error("Connection failed", error);
      setIsConnected(false);
    }
  }, [isConnected]);

  const disconnect = useCallback(() => {
    if (audioContextRef.current) audioContextRef.current.close();
    if (inputContextRef.current) inputContextRef.current.close();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    audioContextRef.current = null;
    inputContextRef.current = null;
    streamRef.current = null;
    analyserRef.current = null;
    inputAnalyserRef.current = null;
    sessionPromiseRef.current = null;
    
    setIsConnected(false);
    setIsTalking(false);
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

  return {
    isConnected,
    isTalking,
    volume,
    inputVolume,
    connect,
    disconnect
  };
}