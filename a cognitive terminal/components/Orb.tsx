import React from 'react';

interface OrbProps {
  volume: number; // 0 to 1
  isActive: boolean;
  isTalking: boolean;
}

export const Orb: React.FC<OrbProps> = ({ volume, isActive }) => {
  // Logic for Dramatic Pulse:
  // 1. Base Scale: 0.5 when silent (small), explodes to 2.0+ when loud.
  // 2. Volume Multiplier: x3 for massive expansion.
  // 3. Opacity: Fades out slightly when silent to make the flash brighter.
  
  const baseScale = 0.8;
  const pulseFactor = 3; 
  
  const activeScale = isActive ? baseScale + (volume * pulseFactor) : 0;
  const activeOpacity = isActive ? 0.3 + (volume * 0.7) : 0; // Starts dim (0.3), goes to full (1.0) on beat
  const wrapperOpacity = isActive ? 1 : 0;

  return (
    <div 
      className="relative flex items-center justify-center transition-all duration-1000 ease-in-out"
      style={{
        opacity: wrapperOpacity,
        // CSS Variable for performance
        '--orb-scale': activeScale,
        '--orb-opacity': activeOpacity
      } as React.CSSProperties}
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
        {/* Layer 1: The White Hot Nucleus (Solid Center) */}
        <div 
          className="relative w-20 h-20 bg-white rounded-full blur-md z-30"
          style={{ 
            boxShadow: '0 0 80px rgba(216, 180, 254, 1)',
          }}
        />

        {/* Layer 2: High Intensity Purple Glow (Inner Aura) */}
        <div 
          className="absolute w-40 h-40 bg-purple-500 rounded-full blur-xl z-20 mix-blend-screen"
        />

        {/* Layer 3: Soft Fuchsia/Pink Haze (Outer Aura) */}
        <div 
          className="absolute w-80 h-80 bg-fuchsia-600 rounded-full blur-3xl z-10 opacity-70 mix-blend-screen"
        />
        
        {/* Layer 4: Deep Violet Atmosphere (Far Glow) */}
         <div 
          className="absolute w-[500px] h-[500px] bg-violet-900 rounded-full blur-[100px] -z-10 opacity-50 mix-blend-screen"
        />

      </div>
    </div>
  );
};