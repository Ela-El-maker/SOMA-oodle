import React, { useMemo } from 'react';
import { useSynapse } from '../context/SynapseContext';
import { ViewMode } from '../types';
import { SomaLogo } from './SomaLogo';
import { 
    IoPulse, 
    IoFlash, 
    IoPerson, 
    IoHome,
    IoChatbubbles, 
    IoLockClosed,
    IoSparkles,
    IoCompass,
    IoLibrary,
    IoArchive,
    IoHeart,
    IoSettings,
    IoLogOut,
    IoArrowBack,
    IoSearch,
    IoNotifications,
    IoMail,
    IoAdd,
    IoChatbubbleOutline
} from "react-icons/io5";

export const UnifiedNavigation: React.FC = () => {
    const { 
        activeView, setActiveView, 
        setProfileFocus, isSidebarOpen, setSidebarOpen,
        synapseChats, activeSynapseChatId, setActiveSynapseChatId,
        fuseChats, setFuseChats
    } = useSynapse();

    // Local state for Fuse chat selection (pushed to context/app if needed, but for now we can just trigger view)
    const [activeFuseChatId, setActiveFuseChatId] = React.useState<string | null>(null);

    const handleNav = (mode: ViewMode) => {
        setProfileFocus(null);
        setActiveView(mode);
        setSidebarOpen(false);
    };

    const startNewSynapseChat = () => {
        setActiveSynapseChatId(null);
        setActiveView(ViewMode.SOMA);
        setSidebarOpen(false);
    };

    const selectSynapseChat = (id: string) => {
        setActiveSynapseChatId(id);
        setActiveView(ViewMode.SOMA);
        setSidebarOpen(false);
    };

    const selectFuseChat = (id: string) => {
        setActiveFuseChatId(id);
        setActiveView(ViewMode.FUSE);
        setSidebarOpen(false);
        // Note: Fuse component uses its own local state for activeChatId, 
        // we might need to bridge this if we want sidebar selection to work.
        // For now, it just ensures we are on the FUSE view.
    };

    // --- DYNAMIC MENU CONFIGURATION ---
    const menuStructure = useMemo(() => {
        const apps = [
            { mode: ViewMode.LANDING, label: 'Home', icon: IoHome, color: 'text-white' },
            { mode: ViewMode.SOMA, label: 'Synapse', icon: IoSparkles, color: 'text-indigo-400' },
            { mode: ViewMode.SIGNAL, label: 'Signal', icon: IoPulse, color: 'text-emerald-400' },
            { mode: ViewMode.FLUX, label: 'Flux', icon: IoHome, color: 'text-sky-400' },
            { mode: ViewMode.BRAINROT, label: 'BrainRot', icon: IoFlash, color: 'text-pink-400' },
            { mode: ViewMode.CHATTER, label: 'Chatter', icon: IoChatbubbles, color: 'text-blue-400' },
            { mode: ViewMode.FUSE, label: 'Fuse', icon: IoLockClosed, color: 'text-emerald-500' },
            { mode: ViewMode.PROFILE, label: 'Studio', icon: IoPerson, color: 'text-zinc-400' },
        ];

        const activeApp = apps.find(a => a.mode === activeView) || apps[0];
        const otherApps = apps.filter(a => a.mode !== activeView);

        let subOptions: { label: string, icon: any, action: () => void, isSynapseHistory?: boolean, isFuseHistory?: boolean }[] = [];

        switch (activeView) {
            case ViewMode.SOMA:
                subOptions = [
                    { label: 'Start New Chat', icon: IoAdd, action: startNewSynapseChat },
                    { label: 'History', icon: IoChatbubbleOutline, action: () => {}, isSynapseHistory: true }
                ];
                break;
            case ViewMode.SIGNAL:
                subOptions = [
                    { label: 'Signal Feed', icon: IoHome, action: () => setSidebarOpen(false) },
                    { label: 'Live Broadcasts', icon: IoPulse, action: () => setSidebarOpen(false) },
                    { label: 'Resonances', icon: IoCompass, action: () => setSidebarOpen(false) },
                    { label: 'Subscriptions', icon: IoPerson, action: () => setSidebarOpen(false) },
                    { label: 'The Vault', icon: IoLibrary, action: () => setSidebarOpen(false) },
                    { label: 'Neural Log', icon: IoArchive, action: () => setSidebarOpen(false) },
                    { label: 'Transmissions', icon: IoFlash, action: () => setSidebarOpen(false) },
                    { label: 'Saved Signals', icon: IoHeart, action: () => setSidebarOpen(false) },
                ];
                break;
            case ViewMode.FLUX:
                subOptions = [
                    { label: 'Flux Feed', icon: IoHome, action: () => setSidebarOpen(false) },
                    { label: 'Signals', icon: IoPulse, action: () => setSidebarOpen(false) },
                    { label: 'Search', icon: IoSearch, action: () => setSidebarOpen(false) },
                ];
                break;
            case ViewMode.BRAINROT:
                subOptions = [
                    { label: 'Direct Feed', icon: IoFlash, action: () => setSidebarOpen(false) },
                    { label: 'Discover', icon: IoCompass, action: () => setSidebarOpen(false) },
                    { label: 'Inbox', icon: IoMail, action: () => setSidebarOpen(false) },
                ];
                break;
            case ViewMode.PROFILE:
                subOptions = [
                    { label: 'Edit Identity', icon: IoSettings, action: () => setSidebarOpen(false) },
                    { label: 'Metrics', icon: IoPulse, action: () => setSidebarOpen(false) },
                ];
                break;
            case ViewMode.CHATTER:
                subOptions = [
                    { label: 'Public Nodes', icon: IoPulse, action: () => setSidebarOpen(false) },
                    { label: 'Encrypted Nodes', icon: IoLockClosed, action: () => setSidebarOpen(false) },
                    { label: 'Direct Messages', icon: IoMail, action: () => setSidebarOpen(false) },
                ];
                break;
            case ViewMode.FUSE:
                subOptions = [
                    { label: 'Link Node', icon: IoAdd, action: () => setSidebarOpen(false) },
                    { label: 'Active Links', icon: IoLockClosed, action: () => {}, isFuseHistory: true }
                ];
                break;
            default:
                subOptions = [
                    { label: 'Launch Module', icon: IoFlash, action: () => handleNav(ViewMode.SOMA) },
                ];
        }

        return { activeApp, subOptions, otherApps };
    }, [activeView, synapseChats, activeSynapseChatId, fuseChats]);

    return (
        <>
            {/* --- TRIGGER (SOMA LOGO) --- */}
            <div className="fixed top-6 left-6 z-[110]">
                <button 
                    onClick={() => setSidebarOpen(!isSidebarOpen)}
                    className={`relative w-14 h-14 bg-[#0d0d0f] border rounded-2xl flex items-center justify-center transition-all duration-500 active:scale-90 shadow-2xl ${isSidebarOpen ? 'border-[#5eead4] rotate-90 shadow-[0_0_20px_rgba(94,234,212,0.3)]' : 'border-white/10 hover:border-white/20'}`}
                >
                    <SomaLogo className={`w-8 h-8 ${isSidebarOpen ? 'text-[#5eead4]' : 'text-white'}`} glow={isSidebarOpen} />
                </button>
            </div>

            {/* --- SIDEBAR OVERLAY (MOBILE) --- */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] animate-in fade-in duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* --- DYNAMIC SIDEBAR --- */}
            <aside className={`fixed left-0 top-0 bottom-0 z-[105] bg-[#0d0d0f]/95 backdrop-blur-2xl border-r border-white/5 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden shadow-[20px_0_50px_rgba(0,0,0,0.5)] ${isSidebarOpen ? 'w-[280px] opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
                
                <div className="flex flex-col h-full pt-24 pb-10 px-6 gap-8 overflow-y-auto scrollbar-hide">
                    
                    {/* SECTION 1: ACTIVE APP & SUB-OPTIONS */}
                    <div className="space-y-6">
                        <div className={`flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg`}>
                            <menuStructure.activeApp.icon className={`w-6 h-6 ${menuStructure.activeApp.color}`} />
                            <span className="font-black text-sm uppercase tracking-[0.2em] text-white">{menuStructure.activeApp.label}</span>
                        </div>

                        <div className="space-y-1 pl-2">
                            {menuStructure.subOptions.map((opt, i) => (
                                <React.Fragment key={i}>
                                    {!opt.isSynapseHistory && !opt.isFuseHistory ? (
                                        <button 
                                            onClick={opt.action}
                                            className="w-full flex items-center gap-4 py-3 px-4 rounded-xl text-zinc-500 hover:text-[#5eead4] hover:bg-[#5eead4]/5 transition-all group"
                                        >
                                            <opt.icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                                            <span className="text-[11px] font-black uppercase tracking-widest">{opt.label}</span>
                                        </button>
                                    ) : opt.isSynapseHistory ? (
                                        <div className="mt-4 space-y-1">
                                            <div className="px-4 py-2 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Recent Memories</div>
                                            {synapseChats.slice(0, 10).map(chat => (
                                                <button 
                                                    key={chat.id}
                                                    onClick={() => selectSynapseChat(chat.id)}
                                                    className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl transition-all group ${activeSynapseChatId === chat.id ? 'bg-[#5eead4]/10 text-[#5eead4]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                                                >
                                                    <IoChatbubbleOutline className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="text-[10px] font-bold uppercase tracking-tight truncate text-left">{chat.title || 'Signal Thread'}</span>
                                                </button>
                                            ))}
                                            {synapseChats.length === 0 && (
                                                <div className="px-4 py-2 text-[10px] text-zinc-700 italic font-medium uppercase tracking-tighter">No signal history found.</div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="mt-4 space-y-1">
                                            <div className="px-4 py-2 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Active Uplinks</div>
                                            {fuseChats.map(chat => (
                                                <button 
                                                    key={chat.id}
                                                    onClick={() => selectFuseChat(chat.id)}
                                                    className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl transition-all group ${activeFuseChatId === chat.id ? 'bg-[#5eead4]/10 text-[#5eead4]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                                                >
                                                    <div className="w-5 h-5 rounded-lg bg-zinc-800 flex items-center justify-center text-[8px] font-black">{chat.peerName.substring(0,2)}</div>
                                                    <span className="text-[10px] font-bold uppercase tracking-tight truncate text-left">{chat.peerName}</span>
                                                </button>
                                            ))}
                                            {fuseChats.length === 0 && (
                                                <div className="px-4 py-2 text-[10px] text-zinc-700 italic font-medium uppercase tracking-tighter">No encrypted links.</div>
                                            )}
                                        </div>
                                    )}
                                    {opt.label === 'Subscriptions' && activeView === ViewMode.SIGNAL && (
                                        <div className="mt-4 space-y-1">
                                            <div className="px-4 py-2 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Active Uplinks</div>
                                            {['Jack', 'Simon', 'Tom', 'Megan Fox', 'Cameron Green'].map(name => (
                                                <button key={name} className="w-full flex items-center gap-3 py-2 px-4 rounded-xl text-zinc-500 hover:text-white transition-all group hover:bg-white/5">
                                                    <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-[8px] font-black">{name.substring(0,2).toUpperCase()}</div>
                                                    <span className="text-[10px] font-bold uppercase tracking-tight">{name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-white/5 w-full opacity-50"></div>

                    {/* SECTION 2: OTHER APPS */}
                    <div className="space-y-2">
                        <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] px-4 mb-4">Switch Frequency</h3>
                        {menuStructure.otherApps.map((app) => (
                            <button
                                key={app.mode}
                                onClick={() => handleNav(app.mode)}
                                className="w-full flex items-center gap-4 py-4 px-4 rounded-2xl text-zinc-500 hover:text-white hover:bg-white/[0.03] transition-all group"
                            >
                                <div className="p-2 rounded-xl bg-zinc-900 border border-white/5 transition-colors group-hover:border-white/20">
                                    <app.icon className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-[0.2em]">{app.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* SECTION 3: SYSTEM ACTIONS */}
                    <div className="mt-auto space-y-2">
                        <button 
                            onClick={() => handleNav(ViewMode.LANDING)}
                            className="w-full flex items-center gap-4 py-4 px-4 rounded-2xl text-red-400 hover:bg-red-400/5 transition-all group"
                        >
                            <IoLogOut className="w-5 h-5" />
                            <span className="text-[11px] font-black uppercase tracking-[0.3em]">Terminate Session</span>
                        </button>
                        
                        <div className="p-4 rounded-2xl bg-[#5eead4]/5 border border-[#5eead4]/10">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Neural Link v2.0</span>
                            </div>
                            <p className="text-[9px] text-zinc-400 font-medium uppercase tracking-tighter leading-relaxed">System stable. Signal intensity nominal across all sectors.</p>
                        </div>
                    </div>

                </div>
            </aside>
        </>
    );
};

