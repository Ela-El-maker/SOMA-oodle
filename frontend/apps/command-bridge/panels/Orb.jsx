import React, { useState, useEffect, useRef } from 'react';
import { useVision } from '../hooks/useVision';
import somaBackend from '../somaBackend';

// Orb Component - Visual Interface for SOMA
const Orb = ({ volume, isActive, isTalking, isListening, isThinking, isConnected }) => {
  // 👁️ SOMA's Perception Layer (Visual Link)
  const { lastFrameUrl, lastPerception, channel, ghostCursor } = useVision(somaBackend, isConnected);
  
  // Animation frame time for smooth pulse effects
  const [animationTime, setAnimationTime] = useState(0);
  const animationFrameRef = useRef();
  
  // Smooth animation loop for listening/thinking pulse effects
  useEffect(() => {
    if (!isActive || isTalking) {
      // Don't run animation loop when inactive or talking (volume handles it)
      return;
    }
    
    const animate = (timestamp) => {
      setAnimationTime(timestamp);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, isTalking]);
  
  // Natural conversation states with visual feedback
  const baseScale = 0.8;
  const pulseFactor = 3; 
  
  // State-based colors
  let primaryColor = 'bg-white'; // Core
  let secondaryColor = 'bg-purple-500'; // Inner glow
  let tertiaryColor = 'bg-fuchsia-600'; // Outer glow
  
  if (isListening) {
    // Listening = calm blue tones (attentive)
    primaryColor = 'bg-blue-200';
    secondaryColor = 'bg-blue-400';
    tertiaryColor = 'bg-cyan-500';
  } else if (isThinking) {
    // Thinking = amber/yellow tones (processing)
    primaryColor = 'bg-yellow-200';
    secondaryColor = 'bg-amber-400';
    tertiaryColor = 'bg-orange-500';
  } else if (isTalking) {
    // Talking = vibrant purple/fuchsia (active)
    primaryColor = 'bg-white';
    secondaryColor = 'bg-purple-500';
    tertiaryColor = 'bg-fuchsia-600';
  }
  
  // Scale based on volume when talking, gentle pulse when listening
  const activeScale = isActive ? (
    isTalking ? baseScale + (volume * pulseFactor) : 
    isListening ? baseScale + (Math.sin(animationTime / 500) * 0.1) : // Subtle pulse
    baseScale
  ) : 0;
  
  const activeOpacity = isActive ? (
    isTalking ? 0.3 + (volume * 0.7) : 
    isListening ? 0.4 + (Math.sin(animationTime / 800) * 0.2) : // Gentle breathing
    0.5
  ) : 0;
  
  const wrapperOpacity = isActive ? 1 : 0;

  return (
    <div 
      className="relative flex items-center justify-center transition-all duration-1000 ease-in-out h-96 w-96 mx-auto my-8"
      style={{
        opacity: wrapperOpacity,
        // CSS Variable for performance
        '--orb-scale': activeScale,
        '--orb-opacity': activeOpacity
      }}
    >
      
      {/* Container scales with volume - Fast snappy transition */}
      <div 
        className="relative flex items-center justify-center"
        style={{
          transform: `scale(max(0, var(--orb-scale)))`, 
          opacity: `var(--orb-opacity)`,
          // Fast transition (0.05s) to catch every syllable
          transition: isActive ? 'transform 0.05s cubic-bezier(0, 0, 0.2, 1), opacity 0.05s linear' : 'transform 1s ease-in-out, opacity 1s', 
        }}
      >
        {/* Layer 1: The Core Nucleus (State-based color) */}
        <div 
          className={`relative w-32 h-32 ${primaryColor} rounded-full blur-md z-30 transition-colors duration-500`}
          style={{ 
            boxShadow: `0 0 100px ${isListening ? 'rgba(96, 165, 250, 1)' : isThinking ? 'rgba(251, 191, 36, 1)' : 'rgba(216, 180, 254, 1)'}`,
          }}
        />

        {/* Layer 2: Inner Glow (State-based color) */}
        <div 
          className={`absolute w-64 h-64 ${secondaryColor} rounded-full blur-2xl z-20 mix-blend-screen transition-colors duration-500`}
        />

        {/* Layer 3: Outer Aura (State-based color) */}
        <div 
          className={`absolute w-[500px] h-[500px] ${tertiaryColor} rounded-full blur-[100px] z-10 opacity-70 mix-blend-screen transition-colors duration-500`}
        />
        
        {/* Layer 4: Deep Violet Atmosphere (Far Glow) */}
         <div 
          className="absolute w-[800px] h-[800px] bg-violet-900 rounded-full blur-[150px] -z-10 opacity-40 mix-blend-screen"
        />

      </div>

      {/* 👁️ Mind's Eye Vision Overlay — Persistent Background Perception */}
      {lastFrameUrl && (
        <div className="absolute inset-0 -z-20 flex items-center justify-center pointer-events-none opacity-40">
          <div className="relative w-full h-full max-w-[500px] max-h-[300px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            {/* The Image */}
            <img 
              src={lastFrameUrl} 
              alt="SOMA Vision" 
              className="w-full h-full object-cover grayscale brightness-50 contrast-125" 
            />
            
            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none" />
            
            {/* Detected Objects Overlay */}
            {lastPerception?.objects?.slice(0, 5).map((obj, i) => (
              <div 
                key={i}
                className="absolute px-2 py-0.5 bg-fuchsia-500/20 border border-fuchsia-500/40 rounded text-[9px] font-mono text-fuchsia-300 uppercase tracking-tighter"
                style={{ 
                  left: `${10 + (i * 20)}%`, 
                  top: `${20 + (Math.sin(animationTime/1000 + i) * 10)}%`,
                  boxShadow: '0 0 10px rgba(217, 70, 239, 0.3)'
                }}
              >
                {obj.label} ({(obj.score * 100).toFixed(0)}%)
              </div>
            ))}

            {/* Ghost Cursor Overlay */}
            {ghostCursor && (
              <div 
                className="absolute pointer-events-none z-50 transition-all duration-300 ease-out"
                style={{ 
                  left: `${ghostCursor.x}%`, 
                  top: `${ghostCursor.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {/* Outer Glow */}
                <div className={`absolute inset-0 rounded-full blur-md bg-purple-500/50 ${ghostCursor.action === 'click' ? 'scale-150 opacity-100' : 'scale-100 opacity-50'}`} />

                {/* The Cursor Dot */}
                <div className="relative w-3 h-3 bg-white rounded-full border-2 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />

                {/* Action Label */}
                <div className="absolute top-4 left-4 whitespace-nowrap px-1.5 py-0.5 bg-purple-600/80 rounded text-[7px] font-bold text-white uppercase tracking-tighter">
                  {ghostCursor.action}
                </div>
              </div>
            )}

            {/* Corner Markers */}

            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white/20" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-white/20" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-white/20" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white/20" />
            
            {/* Channel Label */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[8px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
              {channel} Stream
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orb;
