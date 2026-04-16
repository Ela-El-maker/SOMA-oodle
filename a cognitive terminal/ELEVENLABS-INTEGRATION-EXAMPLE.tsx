/**
 * ELEVENLABS INTEGRATION EXAMPLE
 *
 * This shows how to integrate ElevenLabs voice into your App.tsx
 * Replace the existing voice service initialization with this code
 */

import { useState, useEffect } from 'react';
import { VoiceService } from './services/voiceService';
import { ElevenLabsVoiceService, VoiceMode } from './services/elevenLabsVoiceService';

function App() {
  // === VOICE SERVICE INITIALIZATION ===
  const [voiceService] = useState(() => {
    // Try to use ElevenLabs if configured
    const elevenLabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    const elevenLabsVoiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID;

    // If ElevenLabs is configured, use premium voice
    if (elevenLabsApiKey && elevenLabsVoiceId &&
        elevenLabsApiKey.trim() !== '' && elevenLabsVoiceId.trim() !== '') {
      console.log('🎤 Initializing ElevenLabs premium voice');
      console.log(`🔊 Voice ID: ${elevenLabsVoiceId.substring(0, 8)}...`);

      return new ElevenLabsVoiceService({
        apiKey: elevenLabsApiKey,
        voiceId: elevenLabsVoiceId,
        wakeWord: 'hey soma',
        autoListen: true,
        speakResponses: true,
        model: 'eleven_turbo_v2',  // Fastest model for real-time conversation
        stability: 0.5,             // Balanced expressiveness and consistency
        similarityBoost: 0.75       // Natural sounding
      });
    } else {
      // Fallback to browser's built-in voices
      console.log('🔊 ElevenLabs not configured, using browser voice');
      console.log('💡 To use premium voice: Add ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID to .env');

      return new VoiceService({
        wakeWord: 'hey soma',
        autoListen: true,
        speakResponses: true
      });
    }
  });

  const [voiceMode, setVoiceMode] = useState<VoiceMode>('inactive');
  const [voiceError, setVoiceError] = useState<string>('');

  // Initialize voice service
  useEffect(() => {
    const initVoice = async () => {
      const success = await voiceService.initialize({
        onModeChange: (mode) => {
          setVoiceMode(mode);
          console.log('🎤 Voice mode changed:', mode);
        },
        onTranscript: (text, isFinal) => {
          // Handle interim and final transcripts
          console.log(`🎤 Transcript (${isFinal ? 'final' : 'interim'}):`, text);
          // You can update UI with interim results here
        },
        onCommand: async (command) => {
          console.log('🎤 Voice command:', command);

          // Send command to SOMA for processing
          // This is where you'd integrate with your existing command handler
          // Example:
          // await handleVoiceCommand(command);
        },
        onError: (error) => {
          console.error('🎤 Voice error:', error);
          setVoiceError(error);
        },
        onVolumeChange: (volume) => {
          // Optional: Show microphone volume indicator
          // console.log('🎤 Volume:', volume);
        }
      });

      if (!success) {
        console.error('❌ Voice service initialization failed');
      } else {
        console.log('✅ Voice service initialized successfully');

        // Test the voice (optional)
        if (voiceService instanceof ElevenLabsVoiceService) {
          console.log('🧪 Testing ElevenLabs voice...');
          // Uncomment to test on startup:
          // await voiceService.testVoice("Hello! I'm SOMA, powered by ElevenLabs.");
        }
      }
    };

    initVoice();

    // Cleanup on unmount
    return () => {
      voiceService.stop();
    };
  }, [voiceService]);

  // === VOICE CONTROLS ===
  const handleStartVoice = () => {
    if (voiceMode === 'inactive') {
      voiceService.startConversation();
    } else {
      voiceService.stop();
    }
  };

  const handleStartWakeWord = () => {
    voiceService.startWakeWordDetection();
  };

  // === SPEAK A RESPONSE ===
  const speakResponse = async (text: string) => {
    await voiceService.speak(text);
  };

  // === UI ===
  return (
    <div>
      {/* Voice Control Buttons */}
      <div className="voice-controls">
        <button onClick={handleStartVoice}>
          {voiceMode === 'inactive' ? 'Start Conversation' : 'Stop Voice'}
        </button>

        <button onClick={handleStartWakeWord}>
          Start Wake Word Detection
        </button>

        {/* Status indicator */}
        <div className="voice-status">
          Mode: {voiceMode}
          {voiceService.isListening() && ' 🎤'}
          {voiceService.isSpeaking() && ' 🔊'}
        </div>

        {/* Error display */}
        {voiceError && (
          <div className="voice-error">
            ⚠️ {voiceError}
          </div>
        )}
      </div>

      {/* Your existing app content */}
      {/* ... */}
    </div>
  );
}

export default App;

/* ============================================
   EXAMPLE: Handling Commands from SOMA
   ============================================ */

async function handleVoiceCommand(command: string) {
  console.log('Processing command:', command);

  // Check for stop command
  if (command.includes('stop') || command.includes('cancel') || command.includes('nevermind')) {
    return { response: "Okay, stopping." };
  }

  // Check for help command
  if (command.includes('help') || command.includes('what can you do')) {
    return {
      response: "I'm SOMA, your AI assistant. I can help with coding, analysis, learning, and conversation. What would you like to know?"
    };
  }

  // Send to SOMA backend for processing
  try {
    const response = await fetch('http://localhost:3001/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: command,
        context: {
          type: 'voice_command',
          timestamp: Date.now()
        }
      })
    });

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Command processing error:', error);
    return {
      response: "Sorry, I encountered an error processing your request."
    };
  }
}

/* ============================================
   ENVIRONMENT VARIABLES NEEDED IN .env
   ============================================ */

/*
# ElevenLabs Voice Configuration
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here

# Optional: Customize voice settings
# ELEVENLABS_MODEL=eleven_turbo_v2
# ELEVENLABS_STABILITY=0.5
# ELEVENLABS_SIMILARITY_BOOST=0.75
*/
