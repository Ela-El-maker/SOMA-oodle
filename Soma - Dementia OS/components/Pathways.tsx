import React, { useState, useEffect } from 'react';
import { useSynapse } from '../context/SynapseContext';
import { Message, FuseChat } from '../types';
import { IoAdd, IoHeart, IoTerminal, IoLockClosed, IoPlanet } from "react-icons/io5";

export const Fuse: React.FC = () => {
  const { fuseChats, setFuseChats, addFuseChat, userConfig } = useSynapse();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [ttl, setTtl] = useState(0); 

  const activeChat = fuseChats.find(c => c.id === activeChatId);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let hasChanges = false;
      const updatedChats = fuseChats.map(chat => {
          const filtered = chat.messages.filter(m => !m.expiresAt || m.expiresAt > now);
          if (filtered.length !== chat.messages.length) {
              hasChanges = true;
              return { ...chat, messages: filtered };
          }
          return chat;
      });
      if (hasChanges) setFuseChats(updatedChats);
    }, 500);
    return () => clearInterval(interval);
  }, [fuseChats, setFuseChats]);

  const handleSend = () => {
    if (!input.trim() || !activeChat) return;
    const now = Date.now();
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      senderName: userConfig.displayName,
      content: input,
      timestamp: now,
      ttl: ttl,
      readAt: now,
      expiresAt: ttl > 0 ? now + (ttl * 1000) : undefined,
      reactions: {}
    };
    setFuseChats(fuseChats.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, newMessage], lastActive: now } : c));
    setInput('');
  };

  const createNewSignal = () => {
      const newId = `s-${Date.now()}`;
      addFuseChat({
          id: newId,
          peerName: `NODE_${Math.floor(Math.random() * 9999)}`,
          messages: [],
          lastActive: Date.now(),
          defaultTtl: 0,
          isConnected: true
      });
      setActiveChatId(newId);
  };

  return (
    <div className="flex h-full w-full bg-[#060607] font-sans overflow-hidden">
      
      {/* Sidebar Integrated into OS Style */}
      <div className="w-80 border-r border-white/5 bg-black/40 backdrop-blur-2xl flex flex-col z-20">
          <div className="h-24 border-b border-white/5 flex items-center justify-between px-8 shrink-0">
              <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#5eead4] animate-pulse shadow-[0_0_8px_#5eead4]"></div>
                    <h2 className="font-black tracking-[0.4em] text-[10px] uppercase text-white">Fuse_Mesh</h2>
                  </div>
                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">P2P_Protocol_Active</span>
              </div>
              <button onClick={createNewSignal} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 text-[#5eead4] hover:bg-[#5eead4] hover:text-black transition-all flex items-center justify-center group shadow-xl">
                 <IoAdd className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-hide py-6 px-4 space-y-2">
                {fuseChats.map(chat => {
                    const isActive = activeChatId === chat.id;
                    const lastMsg = chat.messages[chat.messages.length - 1];
                    return (
                        <div 
                            key={chat.id}
                            onClick={() => setActiveChatId(chat.id)}
                            className={`group flex items-center gap-4 px-5 py-5 cursor-pointer transition-all rounded-[1.5rem] border ${isActive ? 'bg-[#5eead4]/10 border-[#5eead4]/30' : 'border-transparent hover:bg-white/[0.03] hover:border-white/10'}`}
                        >
                            <div className="relative shrink-0">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs ${isActive ? 'bg-[#5eead4] text-black shadow-[0_0_20px_rgba(94,234,212,0.4)]' : 'bg-zinc-900 text-zinc-500'}`}>
                                    {chat.peerName.substring(0,2)}
                                </div>
                                {chat.isConnected && <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-[#060607]"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className={`font-black text-[11px] tracking-widest uppercase truncate ${isActive ? 'text-white' : 'text-zinc-400'}`}>{chat.peerName}</span>
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 truncate">
                                    {lastMsg ? lastMsg.content : 'Synchronizing...'}
                                </p>
                            </div>
                        </div>
                    );
                })}
                {fuseChats.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                         <IoPlanet size={48} className="mb-4 text-zinc-700" />
                         <span className="text-[10px] font-black uppercase tracking-widest">No nodes found</span>
                    </div>
                )}
          </div>
      </div>

      {/* Main Transmission Area */}
      <div className="flex-1 flex flex-col z-10 bg-black/20 relative">
        {activeChat ? (
            <>
                <div className="h-24 border-b border-white/5 flex items-center justify-between px-10 bg-black/40 backdrop-blur-xl">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-[#5eead4]/30 flex items-center justify-center text-[#5eead4] font-black text-lg shadow-2xl">
                            {activeChat.peerName.substring(0,2)}
                        </div>
                        <div>
                            <h2 className="font-black text-white uppercase tracking-[0.2em] text-sm">
                                {activeChat.peerName}
                            </h2>
                            <div className="flex items-center gap-3 mt-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.3em]">End_To_End_Encrypted_Link</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide pb-32">
                    {activeChat.messages.map(msg => {
                        const isMe = msg.senderName === userConfig.displayName;
                        return (
                            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] group relative ${isMe ? 'animate-in slide-in-from-right-8' : 'animate-in slide-in-from-left-8'} duration-700`}>
                                    <div className={`px-8 py-5 text-sm font-medium leading-relaxed border backdrop-blur-md rounded-[2rem] shadow-2xl ${isMe ? 'bg-[#5eead4]/10 border-[#5eead4]/30 text-white' : 'bg-white/[0.03] border-white/10 text-zinc-300'}`}>
                                        <div className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 mb-3">{isMe ? 'TX_OUT' : 'RX_IN'}</div>
                                        {msg.content}
                                    </div>
                                    <div className={`text-[9px] font-black text-zinc-600 mt-3 uppercase tracking-[0.3em] flex gap-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                         {msg.ttl > 0 && <span className="text-red-500/60 animate-pulse">DECAY_{msg.ttl}S</span>}
                                         <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="p-10 bg-black/40 border-t border-white/5 backdrop-blur-xl absolute bottom-0 left-0 right-0">
                    <div className="flex items-center gap-6 bg-white/[0.02] rounded-3xl border border-white/10 px-8 py-5 focus-within:border-[#5eead4]/50 focus-within:bg-white/[0.04] transition-all shadow-2xl">
                        <IoTerminal className="text-zinc-700 w-5 h-5" />
                        <input
                            autoFocus
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="INPUT_NEURAL_SIGNAL..."
                            className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none placeholder-zinc-800 font-mono uppercase font-black tracking-widest"
                        />
                        <button onClick={handleSend} className="text-[#5eead4] font-black text-[11px] uppercase tracking-[0.4em] hover:text-white hover:scale-105 transition-all active:scale-95">Link</button>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 px-10">
                <div className="w-40 h-40 rounded-[2.5rem] border border-white/5 bg-white/[0.02] flex items-center justify-center mb-10 relative group cursor-pointer shadow-2xl transition-all hover:border-[#5eead4]/30" onClick={createNewSignal}>
                    <div className="absolute inset-0 bg-[#5eead4]/5 rounded-[2.5rem] animate-pulse"></div>
                    <IoLockClosed size={48} className="text-zinc-800 group-hover:text-[#5eead4] transition-colors" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4 tracking-[0.5em] uppercase text-center">Fuse_Mesh_Network</h3>
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em] max-w-sm text-center leading-relaxed opacity-60">
                    Establish an end-to-end encrypted node frequency to begin P2P signal transmission. All data decays based on neural resonance settings.
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

