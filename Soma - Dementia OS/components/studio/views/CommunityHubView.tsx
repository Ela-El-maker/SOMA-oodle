import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Users, Hash, ArrowLeft, Heart, MessageSquare, Share2, MoreHorizontal, X, Check, Image as ImageIcon, LayoutGrid, Flashlight } from 'lucide-react';
import { UserProfile, Community, CommunityPost, ViewMode } from '../../../types';
import { MOCK_COMMUNITIES } from '../constants';
import { useSynapse } from '../../../context/SynapseContext';
import { ChatterBox } from '../../ChatterBox';

interface Props {
    currentUser: UserProfile;
    onBack: () => void;
    initialCommunityId?: string;
    initialMode?: 'explore' | 'detail';
}

const CommunityHubView: React.FC<Props> = ({ currentUser, onBack, initialCommunityId, initialMode = 'explore' }) => {
    const { ensureChatterSpace, setActiveView, setChatterFocus } = useSynapse();
    const [viewMode, setViewMode] = useState<'explore' | 'detail' | 'create'>(initialCommunityId ? 'detail' : initialMode);
    const [activeCommunity, setActiveCommunity] = useState<Community | null>(
        initialCommunityId ? MOCK_COMMUNITIES.find(c => c.id === initialCommunityId) || null : null
    );
    const [communities, setCommunities] = useState<Community[]>(MOCK_COMMUNITIES);
    const [showJoinToast, setShowJoinToast] = useState(false);

    const [newCommunityName, setNewCommunityName] = useState('');
    const [newCommunityDesc, setNewCommunityDesc] = useState('');

    const handleOpenCommunity = (community: Community) => {
        setActiveCommunity(community);
        // Ensure space exists for backend synchronization
        ensureChatterSpace(community.id, `Community: ${community.name}`, community.name.substring(0,2).toUpperCase());
        setViewMode('detail');
    };

    const handleJumpToChatter = () => {
        if (!activeCommunity) return;
        setChatterFocus({ networkId: activeCommunity.id });
        setActiveView(ViewMode.CHATTER);
    };

    const handleCreateCommunity = () => {
        if (!newCommunityName) return;
        const newComm: Community = {
            id: `c-${Date.now()}`,
            name: newCommunityName,
            description: newCommunityDesc || 'No description.',
            membersCount: 1,
            image: 'https://images.unsplash.com/photo-1614850523060-8da1d56ae167?w=500',
            isJoined: true,
            category: 'Custom',
            tags: ['New']
        };
        setCommunities([...communities, newComm]);
        handleOpenCommunity(newComm);
        setNewCommunityName('');
        setNewCommunityDesc('');
    };

    const toggleJoin = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setCommunities(prev => prev.map(c => {
            if (c.id === id) {
                const newState = !c.isJoined;
                if (newState) {
                    setShowJoinToast(true);
                    setTimeout(() => setShowJoinToast(false), 2000);
                }
                return { ...c, isJoined: newState, membersCount: c.membersCount + (newState ? 1 : -1) };
            }
            return c;
        }));
        
        if (activeCommunity && activeCommunity.id === id) {
             setActiveCommunity(prev => prev ? ({ ...prev, isJoined: !prev.isJoined, membersCount: prev.membersCount + (!prev.isJoined ? 1 : -1) }) : null);
        }
    };

    const ExploreView = () => (
        <div className="flex flex-col min-h-screen pb-32">
            <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-md pt-8 pb-4 px-6 border-b border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={onBack} className="p-2 -ml-2 text-white/60 hover:text-[#5eead4] transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500">Neural_Hub</h1>
                    <button 
                        onClick={() => setViewMode('create')}
                        className="p-2 bg-[#5eead4] text-black rounded-xl hover:scale-105 transition-transform shadow-lg shadow-[#5eead4]/20"
                    >
                        <Plus size={20} strokeWidth={3} />
                    </button>
                </div>
                
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input 
                        type="text" 
                        placeholder="Scan community nodes..." 
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#5eead4]/50 transition-all placeholder:text-zinc-600 font-medium"
                    />
                </div>
            </div>

            <div className="p-6 space-y-10">
                <section>
                    <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                        <div className="w-1 h-1 rounded-full bg-[#5eead4]"></div> Established_Connections
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {communities.filter(c => c.isJoined).map(c => (
                            <div 
                                key={c.id}
                                onClick={() => handleOpenCommunity(c)}
                                className="group flex items-center gap-5 p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-[#5eead4]/30 hover:bg-white/[0.04] transition-all cursor-pointer shadow-xl"
                            >
                                <img src={c.image} className="w-16 h-16 rounded-2xl object-cover bg-black border border-white/10" alt="Node" />
                                <div className="min-w-0">
                                    <h3 className="font-black text-white group-hover:text-[#5eead4] transition-colors uppercase tracking-tight truncate">{c.name}</h3>
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{c.membersCount} Linked</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                        <div className="w-1 h-1 rounded-full bg-indigo-500"></div> Global_Resonances
                    </h2>
                    <div className="space-y-6">
                        {communities.filter(c => !c.isJoined).map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => handleOpenCommunity(c)}
                                className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/5 group cursor-pointer shadow-2xl"
                            >
                                <div className="absolute inset-0 z-0">
                                    <img src={c.image} className="w-full h-full object-cover opacity-30 group-hover:opacity-50 group-hover:scale-105 transition-all duration-1000" alt="Banner" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                </div>

                                <div className="relative z-10 p-8 flex flex-col items-start gap-4">
                                    <div className="flex justify-between w-full items-start">
                                        <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-[#5eead4]">
                                            {c.category}
                                        </div>
                                        <button 
                                            onClick={(e) => toggleJoin(e, c.id)}
                                            className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#5eead4] transition-colors shadow-xl"
                                        >
                                            Link
                                        </button>
                                    </div>
                                    
                                    <div className="mt-12">
                                        <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter group-hover:text-[#5eead4] transition-colors">{c.name}</h3>
                                        <p className="text-xs text-zinc-400 font-medium uppercase tracking-tight line-clamp-2 max-w-md leading-relaxed opacity-80">{c.description}</p>
                                    </div>

                                    <div className="flex items-center gap-6 text-[10px] text-zinc-500 font-black uppercase tracking-widest pt-4">
                                        <span className="flex items-center gap-2"><Users size={14} /> {c.membersCount}</span>
                                        <div className="flex gap-3">
                                            {c.tags.slice(0, 2).map(t => <span key={t} className="text-[#5eead4]/60">#{t}</span>)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );

    const DetailView = () => {
        if (!activeCommunity) return null;
        
        return (
            <div className="flex flex-col min-h-screen bg-black relative">
                {/* Hero Header */}
                <div className="relative h-72 w-full overflow-hidden">
                    <img src={activeCommunity.image} className="w-full h-full object-cover" alt="Hero" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black" />
                    
                    <button 
                        onClick={() => setViewMode('explore')}
                        className="absolute top-8 left-6 p-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl text-white hover:text-[#5eead4] transition-all z-20 active:scale-90 shadow-2xl"
                    >
                        <ArrowLeft size={24} />
                    </button>
                </div>

                {/* Community Info */}
                <div className="px-8 -mt-16 relative z-10 mb-10">
                    <div className="flex justify-between items-end gap-6 mb-6">
                        <div className="min-w-0">
                            <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter drop-shadow-2xl mb-2">{activeCommunity.name}</h1>
                            <div className="flex items-center gap-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                                <span className="flex items-center gap-2"><Users size={14} className="text-[#5eead4]" /> {activeCommunity.membersCount} Nodes</span>
                                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                <span className="flex items-center gap-2 text-indigo-400">#{activeCommunity.category}</span>
                            </div>
                        </div>
                        <div className="flex gap-3 shrink-0">
                            <button 
                                onClick={handleJumpToChatter}
                                className="p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-[#5eead4] hover:bg-[#5eead4] hover:text-black transition-all shadow-xl"
                                title="Open in Chatter"
                            >
                                <MessageSquare size={24} />
                            </button>
                            <button 
                                onClick={(e) => toggleJoin(e, activeCommunity.id)}
                                className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl
                                    ${activeCommunity.isJoined 
                                        ? 'bg-white/10 text-white border border-white/10 hover:bg-white/20' 
                                        : 'bg-[#5eead4] text-black hover:scale-105'}
                                `}
                            >
                                {activeCommunity.isJoined ? 'Synchronized' : 'Establish Link'}
                            </button>
                        </div>
                    </div>
                    
                    <p className="text-zinc-400 text-sm font-medium uppercase tracking-tight leading-relaxed max-w-2xl opacity-80">
                        {activeCommunity.description}
                    </p>
                </div>

                {/* Live Chatter Integration - THE HEART OF COMMUNITY */}
                <div className="flex-1 bg-[#060607] rounded-t-[3rem] border-t border-white/10 shadow-[0_-30px_100px_rgba(0,0,0,0.8)] overflow-hidden min-h-[600px] mb-20">
                    <div className="h-full flex flex-col">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Live_Chatter_Frequency</span>
                            </div>
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">Monitored by SOMA</span>
                        </div>
                        
                        <div className="flex-1">
                            <ChatterBox networkId={activeCommunity.id} channelId={`c-${activeCommunity.id}-general`} />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const CreateView = () => (
        <div className="fixed inset-0 bg-[#060607] z-[150] flex flex-col p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-12 max-w-2xl mx-auto w-full">
                <button onClick={() => setViewMode('explore')} className="p-3 bg-white/5 rounded-2xl text-zinc-500 hover:text-white transition-all">
                    <X size={24} />
                </button>
                <h2 className="font-black text-sm uppercase tracking-[0.4em] text-white">Initialize_Node</h2>
                <div className="w-12" />
            </div>

            <div className="flex-1 flex flex-col gap-10 max-w-lg mx-auto w-full pb-20">
                <div className="w-full aspect-video bg-white/[0.02] rounded-[2.5rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-zinc-600 hover:text-[#5eead4] hover:border-[#5eead4]/30 transition-all cursor-pointer group shadow-inner">
                    <ImageIcon size={48} className="transition-transform group-hover:scale-110" />
                    <span className="text-[10px] font-black mt-4 uppercase tracking-[0.3em]">Upload_Cover_Signal</span>
                </div>

                <div className="space-y-8">
                    <div>
                        <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-3 ml-2">Node_Identity</label>
                        <input 
                            value={newCommunityName}
                            onChange={(e) => setNewCommunityName(e.target.value)}
                            type="text" 
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#5eead4]/50 transition-all placeholder:text-zinc-800 font-bold"
                            placeholder="e.g. CYBER_VANGUARD"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-3 ml-2">Signal_Context</label>
                        <textarea 
                            value={newCommunityDesc}
                            onChange={(e) => setNewCommunityDesc(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#5eead4]/50 transition-all h-32 resize-none font-medium"
                            placeholder="Define the node purpose..."
                        />
                    </div>
                </div>

                <button 
                    onClick={handleCreateCommunity}
                    disabled={!newCommunityName}
                    className="w-full py-5 bg-[#5eead4] rounded-2xl font-black text-xs uppercase tracking-[0.3em] text-black shadow-[0_20px_50px_rgba(94,234,212,0.3)] disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
                >
                    Establish_Community
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <AnimatePresence>
                {showJoinToast && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] bg-[#5eead4] text-black font-black px-8 py-4 rounded-2xl shadow-[0_20px_60px_rgba(94,234,212,0.4)] flex items-center gap-3 uppercase text-[10px] tracking-widest"
                    >
                        <Check size={18} strokeWidth={3} /> Node established
                    </motion.div>
                )}
            </AnimatePresence>

            {viewMode === 'explore' && <ExploreView />}
            {viewMode === 'detail' && <DetailView />}
            {viewMode === 'create' && <CreateView />}
        </div>
    );
};

export default CommunityHubView;




