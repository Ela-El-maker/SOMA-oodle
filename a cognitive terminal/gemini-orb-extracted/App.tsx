import React from 'react';
import { Orb } from './components/Orb';
import { ControlBar } from './components/ControlBar';
import { useLiveAudio } from './hooks/useLiveAudio';

export default function App() {
  const { isConnected, connect, disconnect, volume, inputVolume, isTalking } = useLiveAudio();

  const handleToggle = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-black overflow-hidden">
      {/* Subtle Starfield / Void Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900/40 via-black to-black" />
      
      <main className="relative z-10 flex flex-col items-center justify-center w-full h-full min-h-[600px]">
        
        {/* The Orb Container */}
        <div className="h-[400px] flex items-center justify-center mb-10 w-full">
           <Orb volume={volume} isActive={isConnected} isTalking={isTalking} />
        </div>
        
        {/* Control Bar */}
        <div className="absolute bottom-20 left-0 right-0 flex justify-center">
          <ControlBar 
            isConnected={isConnected} 
            onToggle={handleToggle} 
            inputVolume={inputVolume}
          />
        </div>
      </main>
    </div>
  );
}