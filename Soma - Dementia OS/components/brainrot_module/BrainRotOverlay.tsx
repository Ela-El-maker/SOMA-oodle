import React, { useMemo, useState, useEffect } from "react";
import { IoHeart, IoHeartOutline, IoChatbubble, IoPerson, IoFlash, IoRepeat, IoShareOutline, IoChevronUp, IoChevronDown, IoMusicalNotes } from "react-icons/io5";
import { useSynapse } from "../../context/SynapseContext";
import { ViewMode, SocialPost } from "../../types";
import { motion, AnimatePresence } from "framer-motion";
import BeamModal from "./modal/BeamModal";

interface User {
    id: string;
    displayName: string;
    photoURL?: string;
}

interface BrainRotOverlayProps {
    user: User;
    post: SocialPost;
    onLike?: (liked: boolean) => void;
    onChatter?: () => void;
    onProfileClick?: () => void;
    onVote?: (direction: 'up' | 'down') => void;
}

export default function BrainRotOverlay({ user, post, onLike, onChatter, onProfileClick, onVote }: BrainRotOverlayProps) {
    const { ensureChatterSpace, setActiveView, setChatterFocus } = useSynapse();
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likes);
    const [showBeam, setShowBeam] = useState(false);
    const [expandedCaption, setExpandedCaption] = useState(false);

    useEffect(() => {
        setLiked(post.likedByMe || false);
        setLikeCount(post.likes);
    }, [post]);

    const handleLike = () => {
        const newState = !liked;
        setLiked(newState);
        setLikeCount(prev => newState ? prev + 1 : prev - 1);
        if (onLike) onLike(newState);
    };

    return (
        <>
            <div className="absolute inset-0 z-10 flex flex-col justify-end p-8 pointer-events-none">
                {/* Bottom Overlay - SOMA Premium Style */}
                <div className="flex flex-row justify-between items-end mb-20 pointer-events-auto">
                    
                    {/* Left Side: Signal Info & Marquee */}
                    <div className="flex-1 mr-16 text-left self-end animate-in fade-in slide-in-from-left-8 duration-1000">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="px-3 py-1 rounded-full bg-[#5eead4]/10 border border-[#5eead4]/20 text-[#5eead4] text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_0_15px_rgba(94,234,212,0.1)]">
                                {post.type === 'art' ? 'Verified_Artist' : post.type === 'aspect' ? 'Organic_Aspect' : 'Synthetic_Stream'}
                            </div>
                            {post.aiTag && (
                                <div className={`px-3 py-1 rounded-full backdrop-blur-md text-[9px] font-black uppercase tracking-[0.2em] border ${
                                    post.aiTag === 'AI' ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-white/5 border-white/10 text-zinc-500'
                                }`}>
                                    {post.aiTag === 'AI' ? 'AI_GENERATED' : 'HYBRID_SIGNAL'}
                                </div>
                            )}
                            <div className="w-2 h-2 rounded-full bg-[#5eead4] animate-pulse shadow-[0_0_10px_#5eead4]"></div>
                        </div>

                        <h3 className="text-white font-black text-3xl uppercase tracking-tighter drop-shadow-2xl cursor-pointer hover:text-[#5eead4] transition-all active:scale-95 inline-block" onClick={onProfileClick}>
                            @{user.displayName}
                        </h3>

                        <div className="relative">
                            <p 
                                className={`text-zinc-400 text-[15px] mt-4 drop-shadow-xl leading-relaxed font-medium uppercase tracking-tight opacity-80 max-w-sm transition-all duration-300 ${expandedCaption ? '' : 'line-clamp-2'}`}
                                onClick={() => setExpandedCaption(!expandedCaption)}
                            >
                                {post.caption}
                            </p>
                            {post.caption.length > 60 && (
                                <button 
                                    onClick={() => setExpandedCaption(!expandedCaption)}
                                    className="text-[10px] font-black text-[#5eead4] uppercase tracking-widest mt-1 hover:underline"
                                >
                                    {expandedCaption ? 'Collapse_Data' : 'Expand_Data'}
                                </button>
                            )}
                        </div>

                        {/* Neural Sound Marquee */}
                        <div className="mt-6 flex items-center gap-3 py-2 px-4 bg-white/[0.03] border border-white/5 rounded-xl w-fit max-w-[200px] overflow-hidden cursor-pointer hover:border-[#5eead4]/30 transition-colors group/sound">
                            <IoMusicalNotes className="text-[#5eead4] shrink-0 group-hover/sound:animate-spin" size={14} />
                            <div className="overflow-hidden whitespace-nowrap">
                                <motion.div 
                                    animate={{ x: [0, -100] }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex gap-8 group-hover/sound:text-zinc-300"
                                >
                                    <span>Original_Resonance - {user.displayName}</span>
                                    <span>Original_Resonance - {user.displayName}</span>
                                </motion.div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Action Stack */}
                    <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-right-8 duration-1000">
                        
                        {/* Identity Node */}
                        <div className="relative group cursor-pointer mb-4" onClick={onProfileClick}>
                            <div className="w-16 h-16 rounded-[1.5rem] border-2 border-white/10 overflow-hidden bg-zinc-900 flex items-center justify-center transition-all group-hover:border-[#5eead4]/50 group-hover:scale-110 shadow-2xl">
                                {user.photoURL ? (
                                    <img src={user.photoURL} className="w-full h-full object-cover" alt={user.displayName} />
                                ) : (
                                    <div className="text-xl font-black text-zinc-500 group-hover:text-white uppercase">{user.displayName.substring(0, 2)}</div>
                                )}
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#5eead4] rounded-lg p-1.5 border-2 border-[#060607] transform transition-transform group-hover:scale-110 shadow-lg">
                                <IoFlash className="w-3.5 h-3.5 text-black" />
                            </div>
                        </div>

                        {/* Like Action */}
                        <button onClick={handleLike} className="flex flex-col items-center gap-1.5 group/act transition-all active:scale-90">
                            <div className={`p-4 rounded-[1.2rem] backdrop-blur-xl border transition-all duration-500 ${liked ? 'bg-pink-500/20 border-pink-500/40 text-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.3)]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'}`}>
                                {liked ? <IoHeart className="w-7 h-7 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]" /> : <IoHeartOutline className="w-7 h-7" />}
                            </div>
                            <span className="text-white text-[11px] font-black uppercase tracking-widest mt-1 opacity-60 group-hover/act:opacity-100 transition-opacity">{likeCount}</span>
                        </button>

                        {/* Chatter Action (The Unified Sync) */}
                        <button onClick={onChatter} className="flex flex-col items-center gap-1.5 group/act transition-all active:scale-90">
                            <div className="p-4 rounded-[1.2rem] bg-white/5 backdrop-blur-xl border border-white/10 text-white hover:bg-[#5eead4] hover:text-black hover:border-[#5eead4] transition-all duration-500 shadow-xl group-hover/act:shadow-[#5eead4]/20">
                                <IoChatbubble className="w-7 h-7" />
                            </div>
                            <span className="text-white text-[11px] font-black uppercase tracking-widest mt-1 opacity-60 group-hover/act:opacity-100 transition-opacity">{post.comments}</span>
                        </button>

                        {/* Resonance Voting (Up/Down) */}
                        <div className="flex flex-col items-center gap-1 bg-black/40 rounded-2xl p-1.5 backdrop-blur-md border border-white/5 shadow-2xl">
                            <button 
                                onClick={() => onVote?.('up')}
                                className={`p-2 rounded-xl transition-all ${post.userVote === 'up' ? 'bg-[#5eead4]/20 text-[#5eead4]' : 'text-zinc-600 hover:text-white'}`}
                            >
                                <IoChevronUp size={20} strokeWidth={3} />
                            </button>
                            <span className={`text-[10px] font-black transition-colors ${post.resonance > 80 ? 'text-[#5eead4]' : 'text-zinc-500'}`}>
                                {post.resonance}
                            </span>
                            <button 
                                onClick={() => onVote?.('down')}
                                className={`p-2 rounded-xl transition-all ${post.userVote === 'down' ? 'bg-rose-500/20 text-rose-500' : 'text-zinc-600 hover:text-white'}`}
                            >
                                <IoChevronDown size={20} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Share Action */}
                        <button onClick={() => setShowBeam(true)} className="flex flex-col items-center gap-1.5 transition-all active:scale-90 group/share">
                            <div className="p-4 rounded-[1.2rem] bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-500 opacity-40 group-hover/share:opacity-100">
                                <IoShareOutline className="w-7 h-7" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Beam Modal (Share Sheet) */}
            <AnimatePresence>
                {showBeam && (
                    <BeamModal 
                        isOpen={showBeam} 
                        onClose={() => setShowBeam(false)} 
                        postAuthor={user.displayName}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
