import React, { useState } from 'react';
import { Orb } from './components/Orb';
import { RobotFace } from './components/RobotFace';
import { SynthWave } from './components/SynthWave';
import { ControlBar } from './components/ControlBar';
import { StatusBar, SystemStatus } from './components/StatusBar';
import { useSomaAudio } from './hooks/useSomaAudio';

export default function App() {
  const [showFace, setShowFace] = useState(false);

  let hookData;
  try {
    hookData = useSomaAudio();
  } catch (error) {
    console.error('Hook crashed:', error);
    return <div style={{color: 'white', padding: '20px'}}>Error loading audio hook: {String(error)}</div>;
  }

  const { isConnected, connect, disconnect, volume, inputVolume, isTalking, isListening, isThinking, somaHealthy, systemStatus } = hookData;

  const handleToggle = () => {
    if (isConnected) disconnect();
    else connect();
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-black overflow-hidden">
      {/* Void Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900/40 via-black to-black" />

      {/* Status Bar */}
      {systemStatus && (
        <StatusBar status={systemStatus} isConnected={isConnected} />
      )}

      <main className="relative z-10 flex flex-col items-center justify-center w-full h-full min-h-[600px]">

        {/* Orb or Face */}
        <div className="h-[400px] flex items-center justify-center w-full">
          {showFace ? (
            <RobotFace
              volume={volume}
              isConnected={isConnected}
              isTalking={isTalking}
              isListening={isListening}
              isThinking={isThinking}
            />
          ) : (
            <Orb
              volume={volume}
              isActive={isConnected}
              isTalking={isTalking}
              isListening={isListening}
              isThinking={isThinking}
            />
          )}
        </div>

        {/* Orb / Face toggle */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-zinc-600 text-[11px] font-mono uppercase tracking-widest select-none">Orb</span>
          <button
            onClick={() => setShowFace(v => !v)}
            className="relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none"
            style={{
              backgroundColor: showFace ? '#d946ef' : '#27272a',
              boxShadow: showFace ? '0 0 10px #d946ef60' : 'none',
            }}
            aria-label="Toggle orb / face"
          >
            <span
              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
              style={{ left: showFace ? '1.5rem' : '0.25rem' }}
            />
          </button>
          <span className="text-zinc-600 text-[11px] font-mono uppercase tracking-widest select-none">Face</span>
        </div>

        {/* Synth Wave */}
        <div className="flex items-center justify-center mb-8">
          <SynthWave volume={volume} isTalking={isTalking} isActive={isConnected} />
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
