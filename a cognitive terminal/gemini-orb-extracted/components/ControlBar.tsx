import React from 'react';
import { Mic, Power } from 'lucide-react';

interface ControlBarProps {
  isConnected: boolean;
  onToggle: () => void;
  inputVolume: number; // 0 to 1, based on user mic input
}

export const ControlBar: React.FC<ControlBarProps> = ({ isConnected, onToggle, inputVolume }) => {
  // Input visualization
  const glowIntensity = isConnected ? Math.max(0.1, inputVolume) : 0;
  const ringScale = 1 + (glowIntensity * 0.5); 

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Reverb Ring - Purple Light */}
        <div 
            className="absolute inset-0 rounded-full border border-fuchsia-500/50 bg-purple-500/20 blur-sm transition-all duration-75 ease-out"
            style={{
                transform: `scale(${ringScale})`,
                opacity: glowIntensity
            }}
        />
        
        <button
          onClick={onToggle}
          className={`
            relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 z-20 border
            ${isConnected 
              ? 'bg-black border-purple-400 text-purple-200 shadow-[0_0_20px_rgba(192,132,252,0.5)]' 
              : 'bg-black border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
            }
          `}
        >
          {isConnected ? (
            <Power className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  );
};