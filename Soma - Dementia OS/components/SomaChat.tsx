import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message, SynapseChat } from '../types';
import { useSynapse } from '../context/SynapseContext';
import { sendMessageToSoma } from '../services/gemini';
import { IoSparkles, IoTerminal } from "react-icons/io5";

// -- PARTICLE SWARM COMPONENT --
const ParticleSwarm = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        const particleCount = 4000;
        const colors = ['#5eead4', '#22d3ee', '#34d399', '#99f6e4', '#2dd4bf', '#0ea5e9'];

        class Particle {
            x: number; y: number; radius: number; color: string; angle: number; speed: number; distance: number; wobble: number; wobbleSpeed: number; opacity: number; z: number;
            constructor(w: number, h: number) {
                this.x = w / 2; this.y = h / 2; this.angle = Math.random() * Math.PI * 2;
                const r = Math.min(w, h) / 4.2; 
                this.distance = Math.random() * r; 
                this.speed = 0.001 + Math.random() * 0.004;
                this.radius = 0.3 + Math.random() * 1.2;
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.wobble = Math.random() * 10;
                this.wobbleSpeed = 0.01 + Math.random() * 0.02;
                this.opacity = 0.3 + Math.random() * 0.7;
                this.z = Math.random();
            }
            update(w: number, h: number) {
                this.angle += this.speed; this.wobble += this.wobbleSpeed;
                const currentDistance = this.distance + Math.sin(this.wobble) * 15 * this.z;
                this.x = w / 2 + Math.cos(this.angle) * currentDistance;
                this.y = h / 2 + Math.sin(this.angle) * currentDistance;
            }
            draw(ctx: CanvasRenderingContext2D) {
                ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * (0.8 + this.z * 0.5), 0, Math.PI * 2);
                ctx.fillStyle = this.color; ctx.globalAlpha = this.opacity * (0.5 + this.z * 0.5); ctx.fill();
            }
        }

        const init = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = 400 * dpr; canvas.height = 400 * dpr;
            ctx.scale(dpr, dpr); canvas.style.width = "400px"; canvas.style.height = "400px";
            particles = []; for (let i = 0; i < particleCount; i++) { particles.push(new Particle(400, 400)); }
        };

        const animate = () => {
            ctx.clearRect(0, 0, 400, 400); ctx.globalCompositeOperation = 'lighter';
            particles.forEach(p => { p.update(400, 400); p.draw(ctx); });
            animationFrameId = requestAnimationFrame(animate);
        };

        init(); animate();
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return <canvas ref={canvasRef} className="w-52 h-52 md:w-80 md:h-80" style={{ filter: 'blur(0.3px)' }} />;
};

export const SomaChat: React.FC = () => {
  const { synapseChats, setSynapseChats, activeSynapseChatId, setActiveSynapseChatId } = useSynapse();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Derive messages from current chat
  const currentChat = useMemo(() => synapseChats.find(c => c.id === activeSynapseChatId), [synapseChats, activeSynapseChatId]);
  const messages = currentChat?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    let updatedChatId = activeSynapseChatId;
    let newChats = [...synapseChats];

    if (!updatedChatId) {
        // Create new chat
        const newId = `syn-${Date.now()}`;
        const newChat: SynapseChat = {
            id: newId,
            title: input.substring(0, 30) + (input.length > 30 ? '...' : ''),
            messages: [userMsg],
            timestamp: Date.now()
        };
        newChats = [newChat, ...newChats];
        setSynapseChats(newChats);
        setActiveSynapseChatId(newId);
        updatedChatId = newId;
    } else {
        // Update existing chat
        newChats = synapseChats.map(c => c.id === updatedChatId ? { ...c, messages: [...c.messages, userMsg], timestamp: Date.now() } : c);
        setSynapseChats(newChats);
    }

    if (inputRef.current) inputRef.current.style.height = 'auto';
    setInput('');
    setIsLoading(true);

    try {
        const responseText = await sendMessageToSoma(messages, input);
        const somaMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: responseText,
            timestamp: Date.now()
        };

        setSynapseChats(newChats.map(c => c.id === updatedChatId ? { ...c, messages: [...c.messages, somaMsg] } : c));
    } catch (e) {
        console.error("Synapse Error", e);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full w-full relative bg-zinc-950">
      
      {/* Welcome Swarm */}
      {!hasMessages && (
        <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-1000">
            <div className="mb-2 relative flex items-center justify-center">
                <ParticleSwarm />
                <div className="absolute w-20 h-20 bg-indigo-500/20 blur-3xl rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-3xl font-black text-white tracking-[0.4em] mb-2 -mt-8 uppercase glitch-text">Synapse</h1>
            <p className="text-[10px] text-zinc-600 tracking-[0.5em] font-black uppercase">Neural Interface Link</p>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto w-full relative z-10 scrollbar-hide pb-40">
        <div className="h-24"></div> 
        
        <div className="flex flex-col px-4 md:px-8 max-w-4xl mx-auto w-full">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex w-full mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-6 py-4 text-[15px] leading-relaxed rounded-3xl ${msg.role === 'user' ? 'bg-[#5eead4] text-black rounded-br-none shadow-[0_0_20px_rgba(94,234,212,0.2)]' : 'bg-white/[0.03] text-zinc-100 rounded-bl-none border border-white/5 backdrop-blur-md'}`}>
                  {msg.role === 'model' && (
                      <div className="flex items-center gap-2 mb-2 opacity-50">
                          <IoSparkles className="text-[#5eead4] w-3 h-3" />
                          <span className="text-[9px] font-black tracking-widest uppercase">Synapse_Output</span>
                      </div>
                  )}
                  <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex w-full justify-start mb-8">
                <div className="px-6 py-4 bg-white/[0.02] rounded-3xl rounded-bl-none border border-white/5">
                    <div className="flex items-center gap-2 h-4">
                        <span className="w-1.5 h-1.5 bg-[#5eead4] rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-[#5eead4] rounded-full animate-bounce delay-150"></span>
                        <span className="w-1.5 h-1.5 bg-[#5eead4] rounded-full animate-bounce delay-300"></span>
                    </div>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-8 left-0 w-full z-30 px-4 md:px-8 flex justify-center">
        <div className="w-full max-w-4xl">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#5eead4]/20 to-indigo-500/20 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition duration-500 blur-lg"></div>
            <div className="relative flex items-center bg-[#0d0d0f]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl p-2 pl-6 focus-within:border-[#5eead4]/50 transition-all">
                <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Broadcast to Synapse..."
                    className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-white placeholder-zinc-600 text-[16px] py-3 max-h-[120px]"
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all ml-2 ${input.trim() ? 'bg-[#5eead4] text-black shadow-lg shadow-[#5eead4]/20 hover:scale-105' : 'bg-zinc-800 text-zinc-600'}`}
                >
                    <IoTerminal className="w-5 h-5" />
                </button>
            </div>
          </div>
          <div className="mt-3 px-4 text-center">
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Neural Core Active • Encryption Protocol V2.4</p>
          </div>
        </div>
      </div>
    </div>
  );
};



