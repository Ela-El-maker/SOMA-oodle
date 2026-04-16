import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ChibiFace v4.0 — The "Digital Soul"
 * High-fidelity CRT aesthetics with morphing elastic expressions.
 * Features: Pixel-grid eyes, sub-millisecond path morphing, and CRT flicker.
 */

const EXPRESSIONS = {
  idle: { 
    eyes: "M -20 -15 L 20 -15 L 20 15 L -20 15 Z", // Rounded Square
    mouth: "M -18 0 Q -9 10 0 0 Q 9 10 18 0",    // Cat :3
    blush: 0.2, 
    color: '#22d3ee' 
  },
  listening: { 
    eyes: "M -22 -22 L 22 -22 L 22 22 L -22 22 Z", // Large Square
    mouth: "M -10 5 Q 0 20 10 5 Q 0 -10 -10 5",   // Small O
    blush: 0.4, 
    color: '#60a5fa' 
  },
  thinking: { 
    eyes: "M -15 -2 L 15 -2 L 15 2 L -15 2 Z",    // Thin Slits
    mouth: "M -18 5 Q -9 -5 0 5 Q 9 15 18 5",     // Wavy ~
    blush: 0.1, 
    color: '#f59e0b' 
  },
  success: { 
    eyes: "heart", // Handled by path logic
    mouth: "M -22 0 Q 0 25 22 0 Z",               // Big Happy D
    blush: 0.7, 
    color: '#ff4d94' 
  },
  talking: { 
    eyes: "M -20 -15 L 20 -15 L 20 15 L -20 15 Z", 
    mouth: "M -22 0 Q 0 25 22 0 Z", 
    blush: 0.3, 
    color: '#22d3ee' 
  },
  offline: { 
    eyes: "M -20 -2 L 20 -2 L 20 2 L -20 2 Z", 
    mouth: "M -12 0 L 12 0", 
    blush: 0, 
    color: '#3f3f46' 
  }
};

const HEART_PATH = "M 0 15 C -20 -10 -15 -25 0 -15 C 15 -25 20 -10 0 15";

const DigitalEye = ({ side, type, phase, color }) => {
  const isClosed = phase === 'closing' || phase === 'closed';
  const currentPath = type === 'heart' ? HEART_PATH : type;

  return (
    <motion.g transform={`translate(${side === 'left' ? -65 : 65}, -20)`}>
      {/* 📺 CRT Panel Glow */}
      <motion.ellipse 
        rx="35" ry="32" 
        animate={{ fill: color, opacity: [0.05, 0.08, 0.05] }}
        transition={{ duration: 0.1, repeat: Infinity }}
        style={{ filter: 'blur(10px)' }}
      />
      
      {/* 👁️ Morphing Digital Path */}
      <motion.path
        d={isClosed ? "M -25 0 L 25 0 L 25 2 L -25 2 Z" : currentPath}
        fill={color}
        initial={false}
        animate={{ 
            fill: color,
            filter: `drop-shadow(0 0 8px ${color})`,
            scale: type === 'heart' ? 1.4 : 1
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      />

      {/* 🏁 CRT Pixel Grid Overlay */}
      {!isClosed && (
        <mask id={`pixelMask-${side}`}>
          <rect x="-30" y="-30" width="60" height="60" fill="white" />
          {Array.from({ length: 15 }).map((_, i) => (
            <rect key={i} x="-30" y={-30 + (i * 4)} width="60" height="1.5" fill="black" />
          ))}
        </mask>
      )}
      
      <motion.path
        d={isClosed ? "M -25 0 L 25 0 L 25 2 L -25 2 Z" : currentPath}
        fill="black"
        opacity="0.3"
        mask={`url(#pixelMask-${side})`}
        pointerEvents="none"
      />
    </motion.g>
  );
};

export function RobotFace({ volume, isTalking, isListening, isThinking, isConnected }) {
  const [phase, setPhase] = useState('open');
  const stateKey = !isConnected ? 'offline' : isThinking ? 'thinking' : isTalking ? 'talking' : isListening ? 'listening' : 'idle';
  const config = EXPRESSIONS[stateKey];
  
  // Random Blinking (Human Baseline)
  useEffect(() => {
    let timeout;
    const blink = () => {
      if (stateKey === 'offline') return;
      setPhase('closing');
      setTimeout(() => setPhase('closed'), 60);
      setTimeout(() => setPhase('open'), 180);
      
      const doubleBlink = Math.random() < 0.08;
      const nextDelay = doubleBlink ? 150 : (3500 + Math.random() * 4000);
      timeout = setTimeout(blink, nextDelay);
    };
    timeout = setTimeout(blink, 4000);
    return () => clearTimeout(timeout);
  }, [stateKey]);

  return (
    <motion.div 
      className="relative w-full h-full flex items-center justify-center pointer-events-none select-none"
      animate={{ 
        y: [0, -12, 0],
        rotate: [0, 1, 0, -1, 0]
      }}
      transition={{ 
        y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 8, repeat: Infinity, ease: "easeInOut" }
      }}
    >
      <svg width="500" height="450" viewBox="-250 -225 500 450" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="helmetSide" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e4e4e7" />
            <stop offset="100%" stopColor="#a1a1aa" />
          </linearGradient>
        </defs>

        {/* 📡 The Antenna (Animated) */}
        <g transform="translate(0, -180)">
          <rect x="-4" y="0" width="8" height="45" fill="#52525b" />
          <motion.circle 
            r="14" cy="0" 
            animate={{ 
                scale: isTalking ? [1, 1.2, 1] : 1,
                fill: isConnected ? ['#ef4444', '#b91c1c', '#ef4444'] : '#27272a'
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ filter: `drop-shadow(0 0 12px ${isConnected ? '#ef4444' : 'transparent'})` }}
          />
        </g>

        {/* 🦾 The Main Helmet Chassis */}
        <path 
          d="M -190 -130 Q 0 -175 190 -130 Q 235 0 190 130 Q 0 175 -190 130 Q -235 0 -190 -130" 
          fill="url(#helmetSide)" 
          stroke="#18181b" 
          strokeWidth="5" 
        />

        {/* 📺 The Primary Display Panel */}
        <motion.rect 
          x="-160" y="-100" width="320" height="220" rx="50" 
          animate={{ fill: isConnected ? '#050508' : '#000' }}
          stroke="#09090b" strokeWidth="10"
          style={{ filter: 'drop-shadow(0 0 30px rgba(34, 211, 238, 0.15))' }}
        />

        {/* 💖 Emotional Dampeners (Blush) */}
        <motion.g animate={{ opacity: config.blush }}>
          <circle cx="-100" cy="45" r="28" fill="#ff7eb9" filter="blur(14px)" />
          <circle cx="100" cy="45" r="28" fill="#ff7eb9" filter="blur(14px)" />
        </motion.g>

        {/* 👀 Digital CRT Eyes */}
        <DigitalEye side="left" type={config.eyes} phase={phase} color={config.color} />
        <DigitalEye side="right" type={config.eyes} phase={phase} color={config.color} />

        {/* 👄 Elastic Morphing Mouth */}
        <motion.path 
          d={config.mouth}
          fill={stateKey === 'talking' || stateKey === 'success' ? config.color : 'none'}
          fillOpacity="0.2"
          stroke={config.color} 
          strokeWidth="6" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          animate={{ 
              d: stateKey === 'talking' ? `M -22 0 Q 0 ${15 + (volume * 40)} 22 0 Z` : config.mouth,
              stroke: config.color 
          }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          style={{ filter: `drop-shadow(0 0 10px ${config.color})` }}
        />

        {/* Side Details */}
        <rect x="-225" y="-35" width="35" height="70" rx="12" fill="#3f3f46" stroke="#18181b" strokeWidth="2" />
        <rect x="190" y="-35" width="35" height="70" rx="12" fill="#3f3f46" stroke="#18181b" strokeWidth="2" />
      </svg>
    </motion.div>
  );
}
