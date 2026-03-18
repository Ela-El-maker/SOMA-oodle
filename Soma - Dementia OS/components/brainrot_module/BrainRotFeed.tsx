import React, { useRef, useEffect, useState, useMemo } from "react";
import BrainRotPost, { BrainRotPostHandles } from "./BrainRotPost";
import BrainRotOverlay from "./BrainRotOverlay";
import { ChatterBox } from "../ChatterBox";
import { SocialPost, LearningResource } from "../../types";
import { useSynapse } from "../../context/SynapseContext";
import { IoHeart, IoFlash, IoArrowBack, IoSparkles } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";

interface BrainRotFeedProps {
    initialPosts: SocialPost[];
    activeTab: string;
}

export default function BrainRotFeed({ initialPosts, activeTab }: BrainRotFeedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const postRefs = useRef<Record<string, BrainRotPostHandles | null>>({});
    const [activeChatterFor, setActiveChatterFor] = useState<string | null>(null);
    const [activePostId, setActivePostId] = useState<string | null>(null);
    const [showHeart, setShowHeart] = useState<{ x: number, y: number } | null>(null);
    
    // Modal States
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    const [activeArchiveId, setActiveArchiveId] = useState<string | null>(null);

    const { userConfig, socialPosts, setSocialPosts, ensureChatterSpace, learningResources } = useSynapse();

    // Derived Feed Data based on activeTab
    const filteredPosts = useMemo(() => {
        let posts = [...socialPosts];
        if (activeTab === 'create') {
            posts = posts.filter(p => p.type === 'art');
        } else if (activeTab === 'aspect' || activeTab === 'slop') {
            posts = posts.filter(p => p.type === activeTab);
        } else if (activeTab === 'learn') {
            return []; // Handled separately by Learn view
        }
        // Sort by resonance (Gold Standard)
        return posts.sort((a, b) => (b.resonance || 0) - (a.resonance || 0));
    }, [socialPosts, activeTab]);

    useEffect(() => {
        if (!activePostId && filteredPosts.length > 0) {
            setActivePostId(filteredPosts[0].id);
        }
    }, [filteredPosts]);

    // Intersection Observer
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('data-post-id');
                    if (id) {
                        setActivePostId(id);
                        const post = filteredPosts.find(p => p.id === id);
                        if (post) {
                            ensureChatterSpace(post.id, `Feed: ${post.author}`, post.author.substring(0,2).toUpperCase());
                        }
                    }
                }
            });
        }, {
            root: containerRef.current,
            threshold: 0.7 
        });

        const elements = containerRef.current?.querySelectorAll('[data-post-id]');
        elements?.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [filteredPosts]);

    // Handle Play/Stop
    useEffect(() => {
        Object.keys(postRefs.current).forEach(id => {
            const handle = postRefs.current[id];
            if (activePostId === id) {
                handle?.play();
            } else {
                handle?.stop();
            }
        });
    }, [activePostId]);

    const handleVote = (id: string, direction: 'up' | 'down') => {
        const updated = socialPosts.map(p => {
            if (p.id !== id) return p;
            let newResonance = p.resonance || 50;
            let newVote = p.userVote;
            if (direction === 'up') {
                if (p.userVote === 'up') { newResonance -= 1; newVote = null; } 
                else if (p.userVote === 'down') { newResonance += 2; newVote = 'up'; } 
                else { newResonance += 1; newVote = 'up'; }
            } else { 
                if (p.userVote === 'down') { newResonance += 1; newVote = null; } 
                else if (p.userVote === 'up') { newResonance -= 2; newVote = 'down'; } 
                else { newResonance -= 1; newVote = 'down'; }
            }
            return { ...p, resonance: Math.max(0, newResonance), userVote: newVote };
        });
        setSocialPosts(updated);
    };

    const handleDoubleTap = (e: React.MouseEvent, postId: string) => {
        if (e.detail === 2) {
            setShowHeart({ x: e.clientX, y: e.clientY });
            setTimeout(() => setShowHeart(null), 800);
            
            const updated = socialPosts.map(p => {
                if (p.id === postId && !p.likedByMe) {
                    return { ...p, likes: p.likes + 1, likedByMe: true };
                }
                return p;
            });
            setSocialPosts(updated);
        }
    };

    if (activeTab === 'learn') {
        return (
            <div className="h-full w-full overflow-y-auto bg-black p-8 pt-24 pb-32">
                <div className="max-w-4xl mx-auto space-y-12">
                    <h2 className="text-sm font-black text-zinc-600 uppercase tracking-[0.4em] mb-8">Archived_Insights</h2>
                    {learningResources.map(res => (
                        <motion.div 
                            key={res.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            onClick={() => setActiveArchiveId(res.id)}
                            className="group p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-[#5eead4]/30 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-opacity">
                                <IoFlash size={48} className="text-[#5eead4]" />
                            </div>
                            <div className="flex justify-between items-start mb-6">
                                <span className="text-[10px] font-black text-[#5eead4] uppercase tracking-[0.3em] border border-[#5eead4]/20 px-3 py-1 rounded-full bg-[#5eead4]/5">
                                    {res.category}
                                </span>
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{res.resonance}% Resonance</span>
                            </div>
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 group-hover:text-[#5eead4] transition-colors">{res.title}</h3>
                            <p className="text-zinc-400 text-lg leading-relaxed line-clamp-3 font-medium uppercase tracking-tight opacity-80">{res.content}</p>
                            <div className="mt-8 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-[10px] font-black text-zinc-500">
                                    {res.author.substring(0,2)}
                                </div>
                                <span className="text-[11px] font-black text-zinc-600 uppercase tracking-widest">@{res.author}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Archive Detail View */}
                <AnimatePresence>
                    {activeArchiveId && (
                        <motion.div 
                            initial={{ opacity: 0, y: "100%" }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed inset-0 z-[150] bg-[#060607] flex flex-col"
                        >
                            <div className="h-24 border-b border-white/5 flex items-center justify-between px-10 shrink-0">
                                <button onClick={() => setActiveArchiveId(null)} className="p-3 bg-white/5 rounded-2xl text-white hover:text-[#5eead4] transition-all">
                                    <IoArrowBack size={24} />
                                </button>
                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Archive_Protocol_Detail</span>
                                <div className="w-12" />
                            </div>
                            <div className="flex-1 overflow-y-auto p-10 md:p-20 scrollbar-hide">
                                {(() => {
                                    const item = learningResources.find(r => r.id === activeArchiveId);
                                    if (!item) return null;
                                    return (
                                        <div className="max-w-3xl mx-auto">
                                            <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none mb-10">{item.title}</h1>
                                            <div className="flex items-center gap-6 mb-16 pb-16 border-b border-white/5">
                                                <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-900 border-2 border-[#5eead4]/30 flex items-center justify-center text-xl font-black text-zinc-500">
                                                    {item.author.substring(0,2)}
                                                </div>
                                                <div>
                                                    <span className="text-sm font-black text-white uppercase tracking-widest">@{item.author}</span>
                                                    <p className="text-[10px] font-black text-[#5eead4] uppercase tracking-[0.3em] mt-1">Status: Verified_Node</p>
                                                </div>
                                            </div>
                                            <div className="space-y-10">
                                                <p className="text-2xl md:text-3xl font-medium text-zinc-300 uppercase tracking-tight leading-relaxed opacity-90">{item.content}</p>
                                                {item.codeSnippet && (
                                                    <div className="p-10 bg-black border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                                                            <IoFlash size={100} className="text-[#5eead4]" />
                                                        </div>
                                                        <pre className="text-emerald-400 font-mono text-sm overflow-x-auto">
                                                            {item.codeSnippet}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-[#000000] relative"
        >
            {filteredPosts.map(post => (
                <div
                    key={post.id}
                    data-post-id={post.id}
                    className="h-full w-full snap-start relative flex items-center justify-center shrink-0 overflow-hidden bg-black"
                    onMouseDown={(e) => handleDoubleTap(e, post.id)}
                >
                    <div className="w-full h-full max-w-[500px] relative shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                        <BrainRotPost
                            ref={(el) => { postRefs.current[post.id] = el; }}
                            src={post.mediaUrl}
                            isActive={activePostId === post.id}
                        />

                        {/* High-Fidelity Side Glows */}
                        <div className="absolute inset-y-0 -left-px w-[2px] bg-gradient-to-b from-transparent via-[#5eead4]/10 to-transparent opacity-50"></div>
                        <div className="absolute inset-y-0 -right-px w-[2px] bg-gradient-to-b from-transparent via-[#5eead4]/10 to-transparent opacity-50"></div>

                        {/* Overlay Layer */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="w-full h-full pointer-events-auto">
                                <BrainRotOverlay
                                    post={post}
                                    user={{
                                        id: post.author,
                                        displayName: post.author,
                                        photoURL: undefined
                                    }}
                                    onProfileClick={() => setActiveProfileId(post.author)}
                                    onChatter={() => setActiveChatterFor(post.id)}
                                    onVote={(dir) => handleVote(post.id, dir)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Profile Modal */}
            <AnimatePresence>
                {activeProfileId && (
                    <motion.div 
                        initial={{ opacity: 0, x: "100%" }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed inset-0 z-[160] bg-[#060607] flex flex-col"
                    >
                        <div className="h-24 border-b border-white/5 flex items-center justify-between px-10 shrink-0">
                            <button onClick={() => setActiveProfileId(null)} className="p-3 bg-white/5 rounded-2xl text-white hover:text-[#5eead4] transition-all">
                                <IoArrowBack size={24} />
                            </button>
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Node_Identity_Profile</span>
                            <div className="w-12" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 md:p-20 scrollbar-hide pb-32">
                            <div className="max-w-4xl mx-auto">
                                <div className="flex flex-col md:flex-row items-center gap-12 mb-20">
                                    <div className="w-48 h-48 rounded-[3rem] border-4 border-[#5eead4]/30 p-2 shadow-2xl">
                                        <div className="w-full h-full rounded-[2.5rem] bg-zinc-900 flex items-center justify-center">
                                            <span className="text-6xl font-black text-zinc-700">{activeProfileId.substring(0,2).toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div className="text-center md:text-left">
                                        <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-2">{activeProfileId}</h2>
                                        <p className="text-xl font-bold text-[#5eead4] uppercase tracking-[0.2em]">Operational_Node</p>
                                        <div className="flex justify-center md:justify-start gap-10 mt-8 text-zinc-500 font-black uppercase tracking-widest text-xs">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-white text-2xl">{socialPosts.filter(p=>p.author === activeProfileId).length}</span>
                                                <span>Signals</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[#5eead4] text-2xl">8.4K</span>
                                                <span>Resonance</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-inner">
                                    {socialPosts.filter(p=>p.author === activeProfileId).map(p => (
                                        <div key={p.id} className="aspect-[3/4] bg-zinc-900 group cursor-pointer relative">
                                            <img src={p.mediaUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" alt="post" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                                <span className="text-[10px] font-black text-[#5eead4] uppercase">{p.likes} Resonances</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Double Tap Heart Animation */}
            <AnimatePresence>
                {showHeart && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1.2, y: 0 }}
                        exit={{ opacity: 0, scale: 1.5, y: -40 }}
                        className="fixed z-[100] pointer-events-none text-pink-500"
                        style={{ left: showHeart.x - 40, top: showHeart.y - 40 }}
                    >
                        <IoHeart className="w-24 h-24 drop-shadow-[0_0_30px_rgba(236,72,153,0.8)]" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chatter Mini-App Drawer */}
            <AnimatePresence>
                {activeChatterFor && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[80] bg-[#000000]/60 backdrop-blur-md flex items-end"
                        onClick={() => setActiveChatterFor(null)}
                    >
                        <motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="w-full max-w-xl mx-auto h-[75vh] shadow-[0_-30px_100px_rgba(0,0,0,1)] border-t border-white/10 rounded-t-[3rem] overflow-hidden bg-[#060607]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ChatterBox 
                                networkId={activeChatterFor} 
                                channelId={`c-${activeChatterFor}-general`} 
                                isMini 
                                onClose={() => setActiveChatterFor(null)} 
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
