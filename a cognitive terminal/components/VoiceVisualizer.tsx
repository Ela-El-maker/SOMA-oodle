/**
 * SOMA Voice Visualizer
 * Combines the beautiful Gemini orb with Command CT's voice system
 *
 * Features:
 * - Real-time volume visualization
 * - Reactive to voice input/output
 * - Syncs with VoiceService state
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Orb } from './Orb';
import { VoiceService, VoiceMode } from '../services/voiceService';

interface VoiceVisualizerProps {
  voiceService: VoiceService;
  className?: string;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  voiceService,
  className = ''
}) => {
  const [volume, setVolume] = useState(0);
  const [inputVolume, setInputVolume] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [mode, setMode] = useState<VoiceMode>('inactive');

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentVolumeRef = useRef(0);

  // Smooth interpolation helper
  const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
  };

  // Calculate volume from frequency data
  const calculateVolume = useCallback((analyser: AnalyserNode): number => {
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    // Focus on speech frequency range (85Hz - 3kHz)
    // With typical sample rates, bins 1-32 cover this range
    const voiceBins = frequencyData.slice(1, 32);

    // Find peak frequency (loudest bin in voice range)
    let max = 0;
    for (let i = 0; i < voiceBins.length; i++) {
      if (voiceBins[i] > max) {
        max = voiceBins[i];
      }
    }

    // Normalize to 0-1 (divide by 200 instead of 255 for more sensitivity)
    const normalized = Math.min(1, max / 200);

    return normalized;
  }, []);

  // Initialize audio analyzer
  useEffect(() => {
    try {
      // Create AudioContext for volume detection
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create analyser node
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256; // 128 frequency bins
      analyser.smoothingTimeConstant = 0.1; // Fast reaction for pulse effect
      analyserRef.current = analyser;

      console.log('✅ VoiceVisualizer audio analyzer initialized');
    } catch (error) {
      console.error('❌ Failed to initialize audio analyzer:', error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Start volume monitoring loop
  useEffect(() => {
    if (!analyserRef.current) return;

    const updateVolume = () => {
      if (!analyserRef.current) return;

      // Calculate current volume
      const rawVolume = calculateVolume(analyserRef.current);

      // Smooth transition (fast lerp 0.5 for reactive pulse)
      currentVolumeRef.current = lerp(currentVolumeRef.current, rawVolume, 0.5);
      setVolume(currentVolumeRef.current);

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    // Start loop
    updateVolume();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [calculateVolume]);

  // Sync with VoiceService state
  useEffect(() => {
    const updateState = () => {
      const listening = voiceService.isListening();
      const speaking = voiceService.isSpeaking();
      const currentMode = voiceService.getMode();

      setIsActive(listening || speaking);
      setIsTalking(speaking);
      setMode(currentMode);
    };

    // Initial state
    updateState();

    // Poll for updates (VoiceService doesn't expose events yet)
    const interval = setInterval(updateState, 100);

    return () => clearInterval(interval);
  }, [voiceService]);

  return (
    <div className={`voice-visualizer ${className}`}>
      <Orb
        volume={volume}
        isActive={isActive}
        isTalking={isTalking}
      />

      {/* Mode indicator */}
      {mode !== 'inactive' && (
        <div className="voice-mode-indicator">
          {mode === 'listening_for_wake' && '🎤 Listening for wake word...'}
          {mode === 'active_conversation' && '🗣️ Conversation active'}
          {mode === 'speaking' && '🔊 SOMA speaking'}
        </div>
      )}
    </div>
  );
};
