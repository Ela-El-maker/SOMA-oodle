import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NetworkNode, Channel, Message } from '../types';
import { useSynapse } from '../context/SynapseContext';
import { sendMessageToSoma } from '../services/gemini';
import { IoAdd, IoHappy, IoFlash, IoChevronDown, IoChevronForward, IoHeart, IoSparkles, IoPulse, IoLockClosed, IoTerminal } from "react-icons/io5";
import { motion, AnimatePresence } from 'framer-motion';

interface ChatterBoxProps {
    networkId: string;
    channelId: string;
    isMini?: boolean;
    onClose?: () => void;
}

export const ChatterBox: React.FC<ChatterBoxProps> = ({ networkId, channelId, isMini, onClose }) => {
    const { networks, setNetworks, userConfig } = useSynapse();
    const [messageInput, setMessageInput] = useState('');
    const [isSomaTyping, setIsSomaTyping] = useState(false);
    const [blurredMessages, setBlurredMessages] = useState<Record<string, boolean>>({});
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeNetwork = networks.find(n => n.id === networkId);
    const activeChannel = activeNetwork?.channels.find(c => c.id === channelId);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeChannel?.messages]);

    // -- NEURAL SUMMARY LOGIC --
    const summary = useMemo(() => {
        if (!activeChannel || activeChannel.messages.length < 3) return null;
        const keywords = ['glitch', 'resonance', 'cool', 'wow', 'soma', 'neural', 'broken', 'error'];
        const found = keywords.filter(k => activeChannel.messages.some(m => m.content.toLowerCase().includes(k)));
        if (found.length === 0) return "Frequency stable. Awaiting neural synchronization.";
        return `SOMA_INSIGHT: Synchronizing on ${found.slice(0, 2).join(' & ')}. Signal intensity optimal.`;
    }, [activeChannel?.messages]);

    // -- GROUPING LOGIC --
    const processedMessages = useMemo(() => {
        if (!activeChannel) return [];
        const messages = activeChannel.messages;
        const result: { type: 'message' | 'group', data: any }[] = [];
        
        for (let i = 0; i < messages.length; i++) {
            const current = messages[i];
            const group = [current];
            let j = i + 1;
            while (j < messages.length) {
                const next = messages[j];
                const similarity = current.content.toLowerCase() === next.content.toLowerCase() || 
                                   (current.content.length < 15 && next.content.length < 15 && current.content.includes(next.content));
                
                if (similarity) {
                    group.push(next);
                    j++;
                } else {
                    break;
                }
            }

            if (group.length > 2) {
                result.push({ type: 'group', data: group });
                i = j - 1;
            } else {
                result.push({ type: 'message', data: current });
            }
        }
        return result;
    }, [activeChannel?.messages]);

    if (!activeNetwork || !activeChannel) return null;

    const handleSendMessage = async () => {
        if (!messageInput.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            senderName: userConfig.displayName,
            content: messageInput,
            timestamp: Date.now(),
            isEncrypted: !activeChannel.isPublic,
            likes: 0,
            resonance: 10
        };

        const updatedNetworks = networks.map(net => {
            if (net.id === networkId) {
                return {
                    ...net,
                    channels: net.channels.map(chan => {
                        if (chan.id === channelId) {
                            return { ...chan, messages: [...chan.messages, newMessage] };
                        }
                        return chan;
                    })
                };
            }
            return net;
        });
        setNetworks(updatedNetworks);
        setMessageInput('');

        // AI MONITORING
        if (messageInput.toLowerCase().includes('soma') || messageInput.includes('?')) {
            setIsSomaTyping(true);
            setTimeout(async () => {
                try {
                    const responseText = await sendMessageToSoma(activeChannel.messages, messageInput);
                    const aiMsg: Message = {
                        id: `ai-${Date.now()}`,
                        role: 'model',
                        senderName: 'Soma',
                        content: responseText,
                        timestamp: Date.now(),
                        isEncrypted: !activeChannel.isPublic,
                        resonance: 100
                    };
                    setNetworks(updatedNetworks.map(net => {
                        if (net.id === networkId) {
                            return {
                                ...net,
                                channels: net.channels.map(chan => {
                                    if (chan.id === channelId) {
                                        return { ...chan, messages: [...chan.messages, aiMsg] };
                                    }
                                    return chan;
                                })
                            };
                        }
                        return net;
                    }));
                } finally {
                    setIsSomaTyping(false);
                }
            }, 1500);
        }
    };

    const handleLike = (msgId: string) => {
        setNetworks(networks.map(net => ({
            ...net,
            channels: net.channels.map(chan => ({
                ...chan,
                messages: chan.messages.map(m => {
                    if (m.id === msgId) {
                        const newLikes = (m.likes || 0) + 1;
                        return { ...m, likes: newLikes, resonance: Math.min(100, (m.resonance || 0) + 15) };
                    }
                    return m;
                })
            }))
        })));
    };

    const toggleBlur = (msgId: string, isEncrypted: boolean) => {
        if (!isEncrypted && !userConfig.stealthMode) return;
        setBlurredMessages(prev => ({ ...prev, [msgId]: !prev[msgId] }));
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    return (
        <div className={`flex flex-col h-full bg-[#060607] text-white font-sans ${isMini ? 'rounded-t-[2.5rem] shadow-[0_-20px_80px_rgba(0,0,0,0.8)] border-t border-white/10' : ''}`}>
            {/* Mini Header */}
            {isMini && (
                <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-white/[0.02] rounded-t-[2.5rem]">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-2 h-2 rounded-full bg-[#5eead4] animate-pulse"></div>
                        <span className="font-black text-white text-[11px] uppercase tracking-[0.3em] truncate">{activeChannel.name}</span>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-zinc-500 hover:text-white">
                            <IoAdd className="w-6 h-6 rotate-45" />
                        </button>
                    )}
                </div>
            )}

            {/* Neural Summary Banner */}
            <AnimatePresence>
                {summary && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden shrink-0 border-b border-white/5"
                    >
                        <div className="bg-indigo-500/5 p-3 px-6 flex items-center gap-4 relative z-10">
                            <IoSparkles className="text-indigo-400 w-3 h-3 animate-pulse" />
                            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] line-clamp-1 opacity-80">{summary}</span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent animate-pulse"></div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide selection:bg-[#5eead4]/30">
                {!isMini && <div className="h-4" />}
                
                {activeChannel.messages.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center ${isMini ? 'h-[40vh]' : 'h-full'} pb-10 px-8 text-center animate-in fade-in duration-1000`}>
                        <div className="w-24 h-24 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-8 shadow-inner group">
                            <IoPulse className="text-zinc-800 text-4xl group-hover:text-[#5eead4] transition-colors duration-500" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3 tracking-[0.4em] uppercase">Sector_Void</h3>
                        <p className="text-zinc-600 text-[10px] leading-relaxed font-black uppercase tracking-[0.2em] max-w-xs opacity-60">No resonance detected in this frequency range. Initializing neural bridge.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {processedMessages.map((item, idx) => {
                            if (item.type === 'group') {
                                const group = item.data;
                                const groupId = `group-${group[0].id}`;
                                const isExpanded = expandedGroups[groupId];
                                
                                return (
                                    <div key={groupId} className="my-6 animate-in fade-in duration-500">
                                        <button 
                                            onClick={() => toggleGroup(groupId)}
                                            className="w-full flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all group/btn shadow-xl"
                                        >
                                            <div className={`p-1.5 rounded-lg bg-black transition-transform duration-500 ${isExpanded ? 'rotate-90' : ''}`}>
                                                <IoChevronForward className="text-zinc-600 w-3 h-3" />
                                            </div>
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] group-hover/btn:text-[#5eead4] transition-colors">
                                                {group.length} Redundant_Signals_Collapsed
                                            </span>
                                            <div className="flex-1 h-[1px] bg-white/5"></div>
                                        </button>
                                        {isExpanded && (
                                            <div className="pl-6 border-l border-white/5 ml-6 mt-4 space-y-2 animate-in slide-in-from-left-4 duration-500">
                                                {group.map((m: Message) => (
                                                    <MessageItem 
                                                        key={m.id} 
                                                        msg={m} 
                                                        userConfig={userConfig} 
                                                        onLike={() => handleLike(m.id)} 
                                                        onBlur={() => toggleBlur(m.id, !!m.isEncrypted)} 
                                                        shouldBlur={(m.isEncrypted || userConfig.stealthMode) && (blurredMessages[m.id] !== false)}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <div key={item.data.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <MessageItem 
                                        msg={item.data} 
                                        userConfig={userConfig} 
                                        onLike={() => handleLike(item.data.id)} 
                                        onBlur={() => toggleBlur(item.data.id, !!item.data.isEncrypted)} 
                                        shouldBlur={(item.data.isEncrypted || userConfig.stealthMode) && (blurredMessages[item.data.id] !== false)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
                {isSomaTyping && (
                    <div className="flex gap-4 px-4 py-6 mt-4 animate-pulse">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400 shadow-2xl">SO</div>
                        <div className="flex flex-col flex-1 gap-3 pt-1">
                            <div className="h-1.5 bg-indigo-500/20 rounded-full w-16"></div>
                            <div className="h-2 bg-white/[0.03] rounded-full w-full max-w-[240px]"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} className="h-10" />
            </div>

            {/* Input Area */}
            <div className="px-6 pb-8 shrink-0 bg-gradient-to-t from-[#060607] via-[#060607] to-transparent pt-6">
                <div className="bg-white/[0.02] rounded-3xl relative flex items-center pr-4 border border-white/10 focus-within:border-[#5eead4]/50 focus-within:bg-white/[0.04] transition-all shadow-2xl">
                    <button className="p-4 text-zinc-600 hover:text-white transition-colors group/add">
                        <div className="w-8 h-8 bg-zinc-900 group-hover/add:bg-[#5eead4] text-zinc-600 group-hover/add:text-black border border-white/5 rounded-xl flex items-center justify-center transition-all shadow-lg">
                            <IoAdd className="w-6 h-6" />
                        </div>
                    </button>
                    <IoTerminal className="text-zinc-800 w-4 h-4 mr-2" />
                    <input
                        type="text" value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={`Transmit to sector...`}
                        className="flex-1 bg-transparent text-white placeholder-zinc-800 py-5 px-1 focus:outline-none text-[14px] font-black uppercase tracking-widest"
                    />
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                        <button className="text-zinc-700 hover:text-[#5eead4] transition-all transform hover:scale-110"><IoFlash size={20} /></button>
                        <button className="text-zinc-700 hover:text-amber-400 transition-all transform hover:scale-110"><IoHappy size={20} /></button>
                    </div>
                </div>
                <div className="mt-4 px-2 flex items-center justify-between opacity-40 group hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em]">
                            Uplink_Active <span className="text-zinc-700 mx-2">|</span> ID: {userConfig.username}
                        </p>
                    </div>
                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">
                        Neural_Persistance_Active
                    </p>
                </div>
            </div>
        </div>
    );
};

const MessageItem = ({ msg, userConfig, onLike, onBlur, shouldBlur }: any) => {
    const ageInMs = Date.now() - msg.timestamp;
    const resonance = msg.resonance || 0;
    
    const ageInHours = ageInMs / (1000 * 60 * 60);
    const decayOpacity = Math.max(0.2, (1 - (ageInHours / 48)) + (resonance / 100));
    
    const isHighResonance = resonance > 80;
    const isDecaying = decayOpacity < 0.6 && !isHighResonance;

    return (
        <div 
            style={{ opacity: decayOpacity }}
            className={`flex gap-5 px-5 py-4 rounded-[1.5rem] transition-all group relative border border-transparent ${
                isHighResonance ? 'bg-[#5eead4]/5 border-[#5eead4]/20 shadow-[0_0_40px_rgba(94,234,212,0.05)]' : 
                'hover:bg-white/[0.02] hover:border-white/5'
            } ${isDecaying ? 'grayscale opacity-40' : ''}`}
        >
            <div className={`w-11 h-11 rounded-[1rem] flex-shrink-0 flex items-center justify-center text-[12px] font-black shadow-2xl transition-all duration-500 group-hover:scale-105 border ${
                msg.role === 'model' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-zinc-900 text-zinc-500 border-white/5'
            }`}>
                {msg.senderName?.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1 pt-0.5">
                <div className="flex items-baseline gap-3 mb-2">
                    <span className={`font-black text-[13px] uppercase tracking-widest transition-colors ${msg.role === 'model' ? 'text-indigo-300' : 'text-white group-hover:text-[#5eead4]'}`}>
                        {msg.senderName}
                    </span>
                    {msg.role === 'model' && (
                        <span className="bg-indigo-500/10 text-indigo-400 text-[8px] px-2 py-0.5 rounded-md font-black border border-indigo-500/20 flex items-center gap-1.5 tracking-widest">
                            <IoSparkles className="w-2.5 h-2.5" /> SOMA
                        </span>
                    )}
                    <span className="text-[9px] text-zinc-700 font-black uppercase tracking-widest ml-auto">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div onClick={onBlur} className="relative">
                    <p className={`text-zinc-400 text-[14px] leading-relaxed transition-all duration-500 whitespace-pre-wrap font-medium uppercase tracking-tight ${
                        shouldBlur ? 'bg-zinc-900 text-transparent select-none cursor-pointer rounded-lg px-2 blur-sm' : ''
                    } ${isHighResonance ? 'text-white' : ''}`}>
                        {msg.content}
                    </p>
                    {shouldBlur && (
                        <div className="absolute inset-0 flex items-center justify-start pl-4 pointer-events-none">
                            <div className="flex items-center gap-3">
                                <IoLockClosed size={12} className="text-zinc-600" />
                                <span className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">
                                    SECURE_DATA_STREAM
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions (Floating) */}
            <div className="absolute -top-4 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-y-1 bg-[#0d0d0f] border border-white/10 rounded-xl p-2 shadow-2xl z-10">
                <button 
                    onClick={onLike}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2 group/like"
                >
                    <IoHeart className={`w-4 h-4 transition-transform group-active/like:scale-150 ${msg.likes > 0 ? 'text-rose-500' : 'text-zinc-700'}`} />
                    {msg.likes > 0 && <span className="text-[10px] font-black text-rose-500">{msg.likes}</span>}
                </button>
                {isHighResonance && (
                    <div className="p-2 text-[#5eead4] animate-pulse" title="High Resonance Signal">
                        <IoSparkles className="w-4 h-4" />
                    </div>
                )}
            </div>
        </div>
    );
};

