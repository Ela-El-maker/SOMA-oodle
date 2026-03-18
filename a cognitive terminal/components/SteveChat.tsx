
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Terminal, Rocket, ChevronRight, Check, Code, Brain } from 'lucide-react';
import { BlueprintFile } from '../types';
import { QuadBrainClient, HEMISPHERES, Hemisphere, HemisphereResponse } from '../services/QuadBrainClient';

interface Message {
  role: 'user' | 'steve';
  content: string;
  actions?: string[];
  updatedFiles?: BlueprintFile[];
  perspectives?: HemisphereResponse[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onActionExecute: (cmd: string) => void;
  onApplyEdits: (files: BlueprintFile[]) => void;
  messages: Message[];
  onSendMessage: (msg: string) => void;
  isProcessing: boolean;
  buttonPosition: { x: number; y: number };
}

const quadBrainClient = new QuadBrainClient();

const SteveChat: React.FC<Props> = ({ isOpen, onClose, onActionExecute, onApplyEdits, messages, onSendMessage, isProcessing, buttonPosition }) => {
  const [input, setInput] = useState('');
  const [multiPerspective, setMultiPerspective] = useState(false);
  const [activeHemisphere, setActiveHemisphere] = useState<Hemisphere | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  // Dynamic Positioning Logic
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  // Calculate safe position (keeping 20px padding from edges)
  const chatWidth = 384; // w-96 = 24rem = 384px
  const chatHeight = 500;
  
  const isOnRight = buttonPosition.x > screenWidth / 2;
  const isAtBottom = buttonPosition.y > screenHeight / 2;

  const chatStyles: React.CSSProperties = {
    position: 'fixed',
    zIndex: 900,
    // Horizontal positioning with bounds checking
    left: isOnRight 
      ? 'auto' 
      : Math.min(buttonPosition.x + 40, screenWidth - chatWidth - 20),
    right: isOnRight 
      ? Math.min(screenWidth - buttonPosition.x + 40, screenWidth - chatWidth - 20)
      : 'auto',
    // Vertical positioning with bounds checking
    top: isAtBottom 
      ? 'auto' 
      : Math.min(buttonPosition.y - 20, screenHeight - chatHeight - 20),
    bottom: isAtBottom 
      ? Math.min((screenHeight - buttonPosition.y) - 20, screenHeight - chatHeight - 20)
      : 'auto',
    
    // Smooth emergence
    transformOrigin: `${isOnRight ? 'right' : 'left'} ${isAtBottom ? 'bottom' : 'top'}`,
  };

  return (
    <div 
      style={chatStyles}
      className="w-96 h-[500px] flex flex-col bg-zinc-950/90 backdrop-blur-3xl border border-emerald-500/20 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(16,185,129,0.1)] overflow-hidden animate-in zoom-in-95 fade-in duration-300"
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between bg-emerald-500/5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Agent Steve</h3>
            <div className="flex items-center space-x-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest">
                {multiPerspective ? 'Quad-Brain Mode' : 'Architect Core'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMultiPerspective(!multiPerspective)}
            className={`p-1.5 rounded-lg transition-all ${
              multiPerspective 
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'
            }`}
            title={multiPerspective ? 'Single perspective' : 'Multi-perspective (Quad-Brain)'}
          >
            <Brain className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`
              max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed
              ${m.role === 'user' 
                ? 'bg-blue-600/10 border border-blue-500/20 text-blue-100 rounded-tr-none' 
                : 'bg-zinc-900/50 border border-zinc-800 text-zinc-300 rounded-tl-none'}
            `}>
              {m.content}
              
              {/* Multi-Perspective Views */}
              {m.perspectives && m.perspectives.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center space-x-2 mb-3">
                    <Brain className="w-3 h-3 text-purple-400" />
                    <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">4 Hemispheres Analyzed</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {m.perspectives.map((perspective) => {
                      const config = HEMISPHERES[perspective.hemisphere];
                      const colorMap = {
                        blue: 'border-blue-500/30 bg-blue-500/5',
                        purple: 'border-purple-500/30 bg-purple-500/5',
                        orange: 'border-orange-500/30 bg-orange-500/5',
                        red: 'border-red-500/30 bg-red-500/5'
                      };
                      return (
                        <button
                          key={perspective.hemisphere}
                          onClick={() => setActiveHemisphere(activeHemisphere === perspective.hemisphere ? null : perspective.hemisphere)}
                          className={`p-2 rounded-lg border transition-all text-left ${
                            colorMap[config.color as keyof typeof colorMap]
                          } ${activeHemisphere === perspective.hemisphere ? 'ring-2 ring-offset-2 ring-offset-zinc-900' : 'hover:opacity-80'}`}
                        >
                          <div className="flex items-center space-x-1.5 mb-1">
                            <span className="text-sm">{config.icon}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: config.color === 'blue' ? '#60a5fa' : config.color === 'purple' ? '#c084fc' : config.color === 'orange' ? '#fb923c' : '#f87171' }}>
                              {config.name}
                            </span>
                          </div>
                          <p className="text-[8px] text-zinc-600">{config.specialty.split(',')[0]}</p>
                        </button>
                      );
                    })}
                  </div>
                  {activeHemisphere && (
                    <div className="mt-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ 
                          color: HEMISPHERES[activeHemisphere].color === 'blue' ? '#60a5fa' : 
                                 HEMISPHERES[activeHemisphere].color === 'purple' ? '#c084fc' : 
                                 HEMISPHERES[activeHemisphere].color === 'orange' ? '#fb923c' : '#f87171'
                        }}>
                          {HEMISPHERES[activeHemisphere].icon} {HEMISPHERES[activeHemisphere].description}
                        </span>
                        <button
                          onClick={() => setActiveHemisphere(null)}
                          className="text-zinc-600 hover:text-zinc-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-relaxed">
                        {m.perspectives.find(p => p.hemisphere === activeHemisphere)?.response}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {m.updatedFiles && m.updatedFiles.length > 0 && (
                <div className="mt-4 p-3 bg-zinc-950 rounded-xl border border-emerald-500/30 space-y-3">
                   <div className="flex items-center space-x-2 text-emerald-400 text-[9px] font-bold uppercase tracking-widest">
                      <Sparkles className="w-3 h-3" />
                      <span>Code Synthesis Ready</span>
                   </div>
                   <div className="space-y-1">
                      {m.updatedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-[9px] text-zinc-500 font-mono">
                           <Code className="w-2.5 h-2.5" />
                           <span className="truncate">{file.path}</span>
                        </div>
                      ))}
                   </div>
                   <button
                     onClick={() => onApplyEdits(m.updatedFiles!)}
                     className="w-full flex items-center justify-center space-x-2 bg-emerald-500 text-zinc-950 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors"
                   >
                     <Check className="w-3 h-3" />
                     <span>Apply Changes</span>
                   </button>
                </div>
              )}

              {m.actions && m.actions.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {m.actions.map((act, idx) => (
                    <button
                      key={idx}
                      onClick={() => onActionExecute(act)}
                      className="flex items-center space-x-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 p-2 rounded-lg text-emerald-400 transition-all text-left group"
                    >
                      <Terminal className="w-3 h-3 shrink-0" />
                      <span className="font-mono text-[10px] truncate">{act}</span>
                      <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[8px] font-bold text-zinc-600 uppercase mt-1 tracking-tighter">
              {m.role === 'user' ? 'You' : 'Steve'}
            </span>
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-center space-x-2 text-emerald-500/60 font-mono text-[10px] pl-1">
            <Sparkles className="w-3 h-3 animate-spin" />
            <span>Steve is thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-zinc-900/30 border-t border-zinc-800/50">
        <div className="relative group">
          <input 
            autoFocus
            className={`
              w-full bg-zinc-900 border rounded-xl py-3 pl-4 pr-12 text-xs text-zinc-200 outline-none transition-all
              ${isProcessing ? 'opacity-50 cursor-not-allowed border-zinc-800' : 'border-zinc-800 focus:border-emerald-500/50 group-hover:border-zinc-700'}
            `}
            placeholder="Ask Steve to edit anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
          />
          <button 
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="absolute right-2 top-2 p-1.5 bg-emerald-500 text-zinc-950 rounded-lg disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default SteveChat;
