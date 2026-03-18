
import React, { useState, useRef, useEffect, useLayoutEffect, KeyboardEvent } from 'react';
import type { HistoryItem, OutputType } from '../types';
import '../styles/orb.css';
import { StreamingText } from './StreamingText';
import { SomaService } from '../services/somaService';
import { PaletteArtifact } from './PaletteArtifact';
import { ImageArtifact } from './ImageArtifact';
import { TodoArtifact } from './TodoArtifact';
import { OutputLine } from './OutputLine'; // NEW: Import OutputLine component

interface TerminalProps {
  history: HistoryItem[];
  isLoading: boolean;
  onCommand: (command: string) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  currentPath: string;
  isAgentConnected: boolean;
  awaitingConfirmation: string | null;
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  somaService: SomaService | null;
  onAutocompleteResult: (completions: string[]) => void;
  somaResponseText: string; // NEW: SOMA's last response text
}


const BlinkingDots = () => (
  <div className="flex space-x-1.5 py-1 items-center h-6">
    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse"></div>
    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
  </div>
);


const Terminal: React.FC<TerminalProps> = ({ history, isLoading, onCommand, inputValue, onInputChange, currentPath, isAgentConnected, awaitingConfirmation, suggestions, onSuggestionClick, somaService, onAutocompleteResult, somaResponseText }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // Anchor for scrolling
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (history.length > 0) {
        setHasInteracted(true);
    }
  }, [history.length]);

  useEffect(() => {
    const checkBackend = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/health');
            setIsBackendConnected(response.ok);
        } catch (err) {
            setIsBackendConnected(false);
        }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 3000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, awaitingConfirmation, suggestions, isLoading]);

  useEffect(() => {
      if (!terminalRef.current) return;
      const resizeObserver = new ResizeObserver(() => {
           if (terminalRef.current) {
               const { scrollHeight, scrollTop, clientHeight } = terminalRef.current;
               const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
               if (isNearBottom || isLoading) {
                   scrollToBottom();
               }
          }
      });
      Array.from(terminalRef.current.children).forEach(child => {
          resizeObserver.observe(child as Element);
      });
      return () => resizeObserver.disconnect();
  }, [history, isLoading]);


  const focusInput = () => {
    setTimeout(() => {
       inputRef.current?.focus();
    }, 10);
  };
  
  useEffect(focusInput, []);

  useEffect(() => {
    if (!isLoading) {
        focusInput();
    }
  }, [isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onInputChange(e.target.value);
  };

  const handleInteractionStart = () => {
      setHasInteracted(true);
  };

  const handleSend = () => {
    if (isLoading) return;
    if (!inputValue.trim() && !awaitingConfirmation) return;

    handleInteractionStart();
    const command = inputValue.trim();
    
    if (awaitingConfirmation) {
        onCommand(command || 'y');
        onInputChange('');
        return;
    }
    
    onCommand(command);
    if (command) {
        setCommandHistory(prev => {
           if (prev.length > 0 && prev[0] === command) return prev;
           return [command, ...prev];
        });
        setHistoryIndex(-1);
    }
    focusInput();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (isLoading || !somaService || !inputValue.trim()) return;

      const { completions, textToReplace } = somaService.autocomplete(inputValue);

      if (completions.length === 1) {
          const completedValue = inputValue.substring(0, inputValue.length - textToReplace.length) + completions[0];
          onInputChange(completedValue);
      } else if (completions.length > 1) {
          onAutocompleteResult(completions);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'ArrowUp' && !awaitingConfirmation) {
        e.preventDefault();
        if (commandHistory.length > 0) {
            const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            setHistoryIndex(newIndex);
            onInputChange(commandHistory[newIndex]);
        }
    } else if (e.key === 'ArrowDown' && !awaitingConfirmation) {
        e.preventDefault();
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            onInputChange(commandHistory[newIndex]);
        } else if (historyIndex === 0) {
            setHistoryIndex(-1);
            onInputChange('');
        }
    }
  };

  // State Logic for Placeholders
  let placeholderText = hasInteracted ? "Ready..." : "Initialize SOMA...";

  if (awaitingConfirmation) placeholderText = '';
  else if (inputValue.length > 0) placeholderText = '';
  
  return (
    <main className="flex-1 flex flex-col h-full max-h-[calc(100vh-120px)] mb-4">
      {/* Glass Pane */}
      <div className="flex-grow bg-[#151518]/80 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl flex flex-col overflow-hidden relative mx-4 ring-1 ring-white/5 group">
        

        {/* Big SOMA Logo Overlay */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] ${hasInteracted ? 'opacity-0 pointer-events-none scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
            <div className="relative">
                {/* Subtle Glow behind logo */}
                <div className="absolute -inset-10 bg-white/5 rounded-full blur-3xl opacity-50"></div>
                <h1 className="relative text-7xl md:text-9xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 select-none drop-shadow-2xl">
                    SOMA
                </h1>
            </div>
            <div className="mt-6 flex items-center space-x-3 opacity-60">
                <div className="h-[1px] w-8 bg-zinc-500"></div>
                <p className="text-zinc-400 tracking-[0.3em] text-xs font-medium uppercase">Cognitive Terminal</p>
                <div className="h-[1px] w-8 bg-zinc-500"></div>
            </div>
        </div>

        {/* Content Area */}
        <div 
            ref={terminalRef}
            className={`flex-1 p-8 overflow-y-auto custom-scrollbar transition-all duration-1000 delay-200 ${hasInteracted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} 
            onClick={focusInput}
        >
          {history.map(item => <OutputLine key={item.id} item={item} currentPath={currentPath} isAgentConnected={isAgentConnected} />)}
          
          {awaitingConfirmation && (
              <div className="text-amber-300 mt-4 font-medium animate-pulse">{awaitingConfirmation}</div>
          )}
          
          {isLoading && !awaitingConfirmation && (
            <div className="mt-4 ml-1 opacity-80">
              <BlinkingDots />
            </div>
          )}
          {/* Scroll Anchor */}
          <div ref={messagesEndRef} />
          
          <div className="h-4" />
        </div>
      </div>

      {/* Spotlight Input Bar */}
      <div className="mt-5 mx-4 flex items-center bg-[#202022] border border-white/5 rounded-2xl px-4 py-2 shadow-xl transition-all duration-300 ring-1 ring-black/20 z-30">
        <span className="text-zinc-500 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          className="w-full bg-transparent border-none focus:outline-none text-zinc-100 placeholder-zinc-500 font-medium text-sm"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          autoFocus
          spellCheck="false"
          autoComplete="off"
          placeholder={placeholderText}
        />

        {/* Voice features disabled - Web Speech API requires Google servers */}

        {/* Send Button */}
        <button
            onClick={handleSend}
            disabled={isLoading || (!inputValue.trim() && !awaitingConfirmation)}
            className="p-2 ml-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200"
            aria-label="Send"
        >
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
        </button>
      </div>
    </main>
  );
};

export default Terminal;
