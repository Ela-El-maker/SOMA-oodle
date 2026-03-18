
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Terminal from './components/Terminal';
import { SomaService } from './services/somaService';
import type { HistoryItem } from './types';
import { WELCOME_MESSAGES } from './constants';
import { SomaProvider, useSoma } from './contexts/SomaContext';
import { messageBus } from './services/messageBus';
import { BusMessage } from './components/BusMessage';
import { AnimatedBrain } from './components/AnimatedBrain';
import { ApprovalQueue } from './src/components/ApprovalQueue';
import { io, Socket } from 'socket.io-client';

const Header: React.FC<{ isAgentConnected: boolean; isProcessing: boolean }> = ({ isAgentConnected, isProcessing }) => (
  <header className="w-full p-6 flex items-center justify-between relative z-10 select-none">
    <div className="flex items-center space-x-3">
        <AnimatedBrain isActive={isProcessing} />
        <h1 className="text-lg font-semibold tracking-tight text-purple-400">
        SOMA
        </h1>
    </div>

    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border transition-all duration-500 bg-emerald-500/10 border-emerald-500/20`}>
      <div className="h-1.5 w-1.5 rounded-full transition-colors duration-500 bg-emerald-400"></div>
      <span className="text-[10px] font-medium tracking-wide uppercase text-emerald-400">
        Neural Link
      </span>
    </div>
  </header>
);

const TerminalApp: React.FC = () => {
  const somaService = useRef<SomaService | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { state, dispatch } = useSoma();
  const { history, isLoading, currentPath, isAgentConnected, awaitingConfirmation } = state;

  const [inputValue, setInputValue] = useState('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [somaResponseText, setSomaResponseText] = useState(''); // NEW: SOMA's last response text
  const [approvalQueue, setApprovalQueue] = useState<any[]>([]);

  useEffect(() => {
    try {
        const service = new SomaService((path: string) => dispatch({ type: 'SET_PATH', payload: path }));
        somaService.current = service;
        service.initialize();
        
        // Initialize Socket.IO connection for approval system
        const socket = io('http://localhost:3001');
        socketRef.current = socket;
        
        socket.on('connect', () => {
            console.log('[WebSocket] Connected to server');
        });
        
        socket.on('disconnect', () => {
            console.log('[WebSocket] Disconnected from server');
        });
        
        // Handle approval requests from server
        socket.on('approval_required', (request: any) => {
            console.log('[WebSocket] Approval required:', request);
            setApprovalQueue(prev => [...prev, request]);
        });
        
        const initialHistory: HistoryItem[] = [];

        dispatch({ type: 'INIT_STATE', payload: {
            history: initialHistory,
            suggestions: [], // Removed default suggestions
            currentPath: service.getCurrentPath(),
            isAgentConnected: service.isAgentConnected()
        }});

        const unsubscribe = messageBus.subscribe('*', (topic: string, payload: any) => {
            if (topic === 'soma:observation') {
                dispatch({ type: 'ADD_HISTORY', payload: [{ 
                    id: Date.now(), 
                    type: 'response', 
                    content: typeof payload === 'string' ? payload : payload.text 
                }] });
            } else {
                const content = <BusMessage topic={topic} payload={payload} />;
                dispatch({ type: 'ADD_HISTORY', payload: [{ id: Date.now(), type: 'bus', content }] });
            }
        });
        
        setIsInitialized(true);

        return () => {
            unsubscribe();
            socket.disconnect();
        };
    } catch (error: any) {
        console.error("Initialization Error:", error);
        dispatch({ type: 'ADD_HISTORY', payload: [{ id: Date.now(), type: 'error', content: `Initialization Failed: ${error.message || 'Unknown error'}` }] });
        setIsInitialized(true);
    }
  }, [dispatch]);

  const executeCommand = useCallback(async (command: string) => {
    if (!command.trim() || !somaService.current) return;

    if (command.trim().toLowerCase() === 'clear') {
      dispatch({ type: 'CLEAR_HISTORY' });
      setInputValue('');
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_SUGGESTIONS', payload: [] });
    
    if (awaitingConfirmation) {
        const confirmationCommand = command.toLowerCase() === 'y' || command.toLowerCase() === 'yes' ? 'y' : 'n';
        dispatch({ type: 'ADD_HISTORY', payload: [{ id: Date.now(), type: 'command', content: confirmationCommand }] });
        somaService.current?.confirmRun(confirmationCommand === 'y');
        dispatch({ type: 'SET_AWAITING_CONFIRMATION', payload: null });
    } else {
        dispatch({ type: 'ADD_HISTORY', payload: [{ id: Date.now(), type: 'command', content: command }] });
    }
    
    setInputValue('');

    try {
      const commandStream = somaService.current.processCommand(command);
      let finalSuggestion = '';
      for await (const output of commandStream) {
        if (output.updateId && output.historyItems.length > 0) {
            dispatch({ type: 'UPDATE_HISTORY', payload: { id: output.updateId, content: output.historyItems[0].content }});
            if (output.historyItems[0].type === 'response') {
                setSomaResponseText(output.historyItems[0].content);
            }
        } else if (output.historyItems && output.historyItems.length > 0) {
          dispatch({ type: 'ADD_HISTORY', payload: output.historyItems });
          // Check if the last added item is a response and set it
          const lastItem = output.historyItems[output.historyItems.length - 1];
          if (lastItem && lastItem.type === 'response') {
              setSomaResponseText(lastItem.content);
          }
        }
        if (output.suggestion) { finalSuggestion = output.suggestion; }
        if (output.suggestions) { dispatch({ type: 'SET_SUGGESTIONS', payload: output.suggestions }); }
        if (output.requiresConfirmation) { dispatch({ type: 'SET_AWAITING_CONFIRMATION', payload: output.requiresConfirmation }); }
      }
      setInputValue(finalSuggestion);
      dispatch({ type: 'SET_AGENT_CONNECTED', payload: somaService.current.isAgentConnected() });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      dispatch({ type: 'ADD_HISTORY', payload: [{ id: Date.now() + 1, type: 'error', content: `Error: ${errorMessage}` }] });
    }

    dispatch({ type: 'SET_LOADING', payload: false });
  }, [awaitingConfirmation, dispatch]);

  const onSuggestionClick = useCallback((suggestion: string) => {
    setInputValue(suggestion);
    setTimeout(() => executeCommand(suggestion), 0);
  }, [executeCommand]);

  const handleAutocompleteResult = useCallback((completions: string[]) => {
      if (completions.length > 10) {
          const content = `> Too many possibilities (${completions.length}). Please be more specific.`;
          dispatch({ type: 'ADD_HISTORY', payload: [{ id: Date.now(), type: 'info', content }] });
          return;
      }
      const content = `${completions.join('\t')}`;
      dispatch({ type: 'ADD_HISTORY', payload: [{ id: Date.now(), type: 'info', content }] });
  }, [dispatch]);

  // Handler for approval responses
  const handleApprovalResponse = useCallback((response: any) => {
    console.log('[App] Sending approval response:', response);
    socketRef.current?.emit('approval_response', response);
    
    // Remove from queue
    setApprovalQueue(prev => prev.filter(req => req.requestId !== response.requestId));
  }, []);
  
  // Handler for batch approval responses
  const handleBatchApprovalResponse = useCallback((responses: any[]) => {
    console.log('[App] Sending batch approval responses:', responses);
    socketRef.current?.emit('batch_approval_response', responses);
    
    // Remove from queue
    const responseIds = new Set(responses.map(r => r.requestId));
    setApprovalQueue(prev => prev.filter(req => !responseIds.has(req.requestId)));
  }, []);

  return (
    <div className="min-h-screen text-zinc-200 flex flex-col items-center relative overflow-hidden font-sans selection:bg-white/20">
      {/* Approval Queue (floats on top) */}
      <ApprovalQueue 
        queue={approvalQueue}
        onResponse={handleApprovalResponse}
        onBatchResponse={handleBatchApprovalResponse}
      />
      
      <div className="w-full max-w-4xl mx-auto flex flex-col h-screen relative z-10">
        <Header isAgentConnected={isAgentConnected} isProcessing={isLoading} />
        {isInitialized && (
          <Terminal
            history={history}
            isLoading={isLoading}
            onCommand={executeCommand}
            inputValue={inputValue}
            onInputChange={setInputValue}
            currentPath={currentPath}
            isAgentConnected={isAgentConnected}
            awaitingConfirmation={awaitingConfirmation}
            suggestions={[]}
            onSuggestionClick={onSuggestionClick}
            somaService={somaService.current}
            onAutocompleteResult={handleAutocompleteResult}
            somaResponseText={somaResponseText} // NEW: Pass somaResponseText to Terminal
          />
        )}
      </div>
    </div>
  );
};

// Error boundary to catch voice component crashes
class VoiceErrorBoundary extends React.Component<
  { children: React.ReactNode }, 
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    console.error('🔴 Voice Component Error:', error);
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, info: any) {
    console.error('🔴 Error details:', error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-900 text-zinc-200 flex items-center justify-center p-8">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-rose-400 mb-4">🎤 Voice Feature Error</h1>
            <p className="text-zinc-400 mb-4">
              The voice component encountered an error. This is likely due to:
            </p>
            <ul className="list-disc list-inside text-zinc-400 space-y-2 mb-6">
              <li>Microphone permission denied</li>
              <li>Browser doesn't support audio features</li>
              <li>AudioContext initialization failed</li>
            </ul>
            <pre className="bg-zinc-800 p-4 rounded text-sm overflow-auto mb-4">
              {this.state.error?.message}
            </pre>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => (
  <SomaProvider>
    <VoiceErrorBoundary>
      <TerminalApp />
    </VoiceErrorBoundary>
  </SomaProvider>
);

export default App;
