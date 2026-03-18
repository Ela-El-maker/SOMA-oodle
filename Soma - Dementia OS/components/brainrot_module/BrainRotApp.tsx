import React, { useState, useEffect } from "react";
import BrainRotFeed from "./BrainRotFeed";
import BrainRotNavigation from "./BrainRotNavigation";
import { useSynapse } from "../../context/SynapseContext";
import { SocialPost, ViewMode, LearningResource } from "../../types";
import { IoFlash, IoClose, IoChevronDown, IoLink, IoTerminal, IoSparkles, IoCamera, IoCloudUpload } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";

interface BrainRotAppProps {
    initialPosts: SocialPost[];
}

export default function BrainRotApp({ initialPosts }: BrainRotAppProps) {
    const { userConfig, setActiveView, playlists, createPlaylist, socialPosts, setSocialPosts, addLearningResource } = useSynapse();
    const [isLoading, setIsLoading] = useState(true);
    const [currentTab, setCurrentTab] = useState('home'); // activeTab: aspect, create, slop, learn
    const [activeSubTab, setActiveSubTab] = useState('aspect');
    
    // Feature States from Backup
    const [showCollections, setShowCollections] = useState(false);
    const [showStudio, setShowStudio] = useState(false);
    const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
    
    // Studio States
    const [createMode, setCreateType] = useState<'aspect' | 'art' | 'slop' | 'learn'>('aspect');
    const [createCaption, setCreateCaption] = useState('');
    const [createCode, setCreateCode] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'preview'>('idle');

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const handleTabChange = (tab: string) => {
        if (tab === 'inbox') {
            setActiveView(ViewMode.CHATTER);
            return;
        }
        if (tab === 'home') setActiveSubTab('aspect');
        if (tab === 'discover') setActiveSubTab('create');
        if (tab === 'profile') setActiveSubTab('learn');
        setCurrentTab(tab);
    };

    const handleCreate = async () => {
        setIsScanning(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsScanning(false);

        if (createMode === 'learn') {
            const newRes: LearningResource = {
                id: `res-${Date.now()}`,
                title: 'NEURAL_INSIGHT_' + Math.floor(Math.random()*999),
                author: userConfig.displayName,
                category: 'philosophy',
                content: createCaption,
                codeSnippet: createCode,
                resonance: 50,
                userVote: null,
                tags: ['USER_SIGNAL'],
                timestamp: Date.now()
            };
            addLearningResource(newRes);
            setActiveSubTab('learn');
        } else {
            const newPost: SocialPost = {
                id: `p-${Date.now()}`,
                author: userConfig.displayName,
                type: createMode === 'art' ? 'art' : createMode === 'slop' ? 'slop' : 'aspect',
                mediaUrl: 'https://images.unsplash.com/photo-1614726365723-49cfae92782f?w=1000&auto=format&fit=crop',
                caption: createCaption || 'SIGNAL_ESTABLISHED',
                likes: 0,
                likedByMe: false,
                comments: 0,
                resonance: 50,
                userVote: null,
                aiTag: Math.random() > 0.5 ? 'AI' : null,
                timestamp: Date.now()
            };
            setSocialPosts([newPost, ...socialPosts]);
            setActiveSubTab(createMode === 'art' ? 'create' : createMode);
        }
        
        setShowStudio(false);
        setCreateCaption('');
        setCreateCode('');
    };

    if (isLoading) {
        return (
            <div className="h-full w-full bg-[#000000] flex flex-col items-center justify-center gap-6">
                <div className="relative">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-[#5eead4]/5 border border-[#5eead4]/20 animate-pulse shadow-[0_0_50px_rgba(94,234,212,0.1)]"></div>
                    <IoFlash className="absolute inset-0 m-auto text-[#5eead4] w-12 h-12 animate-pulse" />
                </div>
                <span className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.6em] animate-pulse">Neural_Sync_Initializing</span>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-[#000000] text-white overflow-hidden font-sans">
            
            {/* --- TOP HUD (Tab Switcher & Collections) --- */}
            <div className="absolute top-8 left-0 right-0 z-[100] flex justify-center px-8 pointer-events-none">
                <div className="bg-black/60 backdrop-blur-2xl rounded-3xl p-1.5 flex items-center border border-white/10 pointer-events-auto shadow-2xl">
                    {['aspect', 'create', 'slop', 'learn'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => { setActiveSubTab(tab); setActivePlaylistId(null); }}
                            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                                activeSubTab === tab ? 'bg-white text-black shadow-xl scale-105' : 'text-zinc-500 hover:text-white'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                    
                    <div className="w-px h-6 bg-white/10 mx-3"></div>

                    {/* Collections Dropdown */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowCollections(!showCollections)}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${activePlaylistId ? 'bg-[#5eead4]/20 text-[#5eead4]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <IoChevronDown className={`transition-transform duration-500 ${showCollections ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showCollections && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full right-0 mt-4 w-64 bg-[#0d0d0f] border border-white/10 rounded-[2rem] shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden z-[110] p-4"
                                >
                                    <div className="space-y-2">
                                        <div className="px-4 py-2 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Personal_Nodes</div>
                                        {playlists.length === 0 && <div className="px-4 py-4 text-[10px] text-zinc-700 italic uppercase font-black tracking-widest text-center opacity-40">No_Active_Collections</div>}
                                        {playlists.map(pl => (
                                            <button 
                                                key={pl.id}
                                                onClick={() => { setActivePlaylistId(pl.id); setShowCollections(false); }}
                                                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${activePlaylistId === pl.id ? 'bg-[#5eead4]/10 text-[#5eead4]' : 'hover:bg-white/[0.03] text-zinc-500'}`}
                                            >
                                                <span className="font-black text-[11px] uppercase tracking-widest truncate">{pl.name}</span>
                                                <span className="text-[9px] font-black opacity-40">{pl.itemIds.length}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Main Feed Content */}
            <div className="h-full w-full">
                <BrainRotFeed 
                    activeTab={activeSubTab} 
                    initialPosts={activePlaylistId ? initialPosts.filter(p => playlists.find(pl => pl.id === activePlaylistId)?.itemIds.includes(p.id)) : initialPosts} 
                />
            </div>

            {/* Studio Trigger */}
            <div className="absolute bottom-32 left-0 right-0 z-[100] flex justify-center pointer-events-none">
                <button 
                    onClick={() => setShowStudio(true)}
                    className="pointer-events-auto w-20 h-20 bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(255,255,255,0.2)] flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-90 group"
                >
                    <IoFlash className="w-10 h-10 text-black group-hover:rotate-12 transition-transform" />
                </button>
            </div>

            {/* Studio Modal */}
            <AnimatePresence>
                {showStudio && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="fixed inset-0 z-[200] bg-black flex flex-col"
                    >
                        <div className="h-24 border-b border-white/5 flex items-center justify-between px-10 bg-[#060607]">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#5eead4]/10 border border-[#5eead4]/20 flex items-center justify-center text-[#5eead4]">
                                    <IoSparkles size={20} />
                                </div>
                                <h2 className="text-white font-black uppercase tracking-[0.4em] text-sm">Initialize_Signal</h2>
                            </div>
                            <button onClick={() => setShowStudio(false)} className="p-3 bg-white/5 rounded-2xl text-zinc-500 hover:text-white transition-all">
                                <IoClose size={24} />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            {/* Visual Preview Area */}
                            <div className="w-full md:w-1/2 bg-[#000000] border-r border-white/5 p-12 flex items-center justify-center relative">
                                <div className="w-full max-w-sm aspect-[9/16] bg-zinc-900 rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden relative group">
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-zinc-700">
                                        <IoCamera size={64} className="opacity-20 group-hover:opacity-40 transition-opacity" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">Awaiting_Optical_Input</span>
                                    </div>
                                    {isScanning && (
                                        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-6">
                                            <div className="w-20 h-20 rounded-[2rem] border-4 border-[#5eead4]/10 border-t-[#5eead4] animate-spin"></div>
                                            <span className="text-[#5eead4] font-black uppercase tracking-[0.5em] text-[10px] animate-pulse">Analyzing_Frequency</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Configuration Panel */}
                            <div className="w-full md:w-1/2 bg-[#060607] p-12 overflow-y-auto pb-32">
                                <div className="max-w-md space-y-10">
                                    <div>
                                        <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 ml-2">Transmission_Type</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['aspect', 'art', 'slop', 'learn'].map(type => (
                                                <button 
                                                    key={type}
                                                    onClick={() => setCreateType(type as any)}
                                                    className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all border ${
                                                        createMode === type ? 'bg-[#5eead4] text-black border-[#5eead4]' : 'bg-white/[0.02] text-zinc-600 border-white/5 hover:border-white/20'
                                                    }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 ml-2">Signal_Manifesto</label>
                                        <textarea 
                                            value={createCaption}
                                            onChange={(e) => setCreateCaption(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded-3xl p-6 text-white focus:border-[#5eead4]/50 focus:bg-white/[0.02] transition-all font-medium uppercase tracking-tight text-sm resize-none h-40"
                                            placeholder="Define your signal context..."
                                        />
                                    </div>

                                    {createMode === 'learn' && (
                                        <div>
                                            <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 ml-2">Neural_Code_Artifact</label>
                                            <textarea 
                                                value={createCode}
                                                onChange={(e) => setCreateCode(e.target.value)}
                                                className="w-full bg-black border border-white/10 rounded-3xl p-6 text-emerald-400 font-mono text-xs focus:border-[#5eead4]/50 transition-all resize-none h-40 shadow-inner"
                                                placeholder="// Paste your logical sequence..."
                                            />
                                        </div>
                                    )}

                                    <button 
                                        onClick={handleCreate}
                                        disabled={!createCaption.trim() || isScanning}
                                        className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.4em] text-xs rounded-3xl hover:bg-[#5eead4] transition-all shadow-[0_30px_80px_rgba(255,255,255,0.1)] disabled:opacity-20 active:scale-95"
                                    >
                                        Establish_Resonance
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <BrainRotNavigation currentTab={currentTab} onTabChange={handleTabChange} />
        </div>
    );
}
