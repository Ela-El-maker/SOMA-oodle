import React from 'react';
import { Activity, Wifi, WifiOff, Mic, Volume2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export interface SystemStatus {
  somaBackend: 'connected' | 'initializing' | 'disconnected' | 'error';
  whisperServer: 'ready' | 'disconnected' | 'error';
  elevenLabs: 'enabled' | 'fallback' | 'disabled';
  latency?: number; // milliseconds
}

interface StatusBarProps {
  status: SystemStatus;
  isConnected: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status, isConnected }) => {
  return (
    <div className="absolute top-4 left-4 right-4 flex items-center justify-between px-6 py-3 bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl">
      {/* Left: Connection Status */}
      <div className="flex items-center gap-6">
        {/* SOMA Backend */}
        <StatusItem
          icon={getBackendIcon(status.somaBackend)}
          label="SOMA"
          status={status.somaBackend}
          color={getStatusColor(status.somaBackend)}
        />

        {/* Whisper Server */}
        <StatusItem
          icon={getMicIcon(status.whisperServer)}
          label="Whisper"
          status={status.whisperServer}
          color={getStatusColor(status.whisperServer)}
        />

        {/* ElevenLabs */}
        <StatusItem
          icon={<Volume2 className="w-4 h-4" />}
          label="Voice"
          status={status.elevenLabs}
          color={getVoiceStatusColor(status.elevenLabs)}
        />
      </div>

      {/* Right: Latency & Connection Quality */}
      <div className="flex items-center gap-4">
        {status.latency !== undefined && isConnected && (
          <div className="flex items-center gap-2 text-xs">
            <Activity className="w-3 h-3 text-purple-400" />
            <span className="text-gray-400">{status.latency}ms</span>
          </div>
        )}

        {/* Overall Connection Indicator */}
        <div className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
          ${isConnected 
            ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
            : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }
        `}>
          {isConnected ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatusItemProps {
  icon: React.ReactNode;
  label: string;
  status: string;
  color: string;
}

const StatusItem: React.FC<StatusItemProps> = ({ icon, label, status }) => {
  const getColorClasses = () => {
    switch (status) {
      case 'connected':
      case 'ready':
      case 'enabled':
        return 'text-green-400';
      case 'initializing':
        return 'text-yellow-400 animate-pulse';
      case 'fallback':
        return 'text-orange-400';
      case 'disconnected':
      case 'disabled':
        return 'text-gray-500';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'ready': return 'Ready';
      case 'enabled': return 'Active';
      case 'initializing': return 'Starting...';
      case 'fallback': return 'Fallback';
      case 'disconnected': return 'Offline';
      case 'disabled': return 'Off';
      case 'error': return 'Error';
      default: return status;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={getColorClasses()}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-gray-400">{label}</span>
        <span className={`text-xs font-medium ${getColorClasses()}`}>
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};

// Helper functions
function getBackendIcon(status: string) {
  switch (status) {
    case 'connected':
      return <Wifi className="w-4 h-4" />;
    case 'initializing':
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case 'error':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <WifiOff className="w-4 h-4" />;
  }
}

function getMicIcon(status: string) {
  switch (status) {
    case 'ready':
      return <Mic className="w-4 h-4" />;
    case 'error':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Mic className="w-4 h-4 opacity-50" />;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'connected':
    case 'ready':
      return 'green';
    case 'initializing':
      return 'yellow';
    case 'error':
      return 'red';
    default:
      return 'gray';
  }
}

function getVoiceStatusColor(status: string): string {
  switch (status) {
    case 'enabled':
      return 'green';
    case 'fallback':
      return 'orange';
    default:
      return 'gray';
  }
}
