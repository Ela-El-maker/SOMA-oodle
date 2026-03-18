import React from 'react';
import { IoHome, IoCompass, IoLibrary, IoTime, IoPlayCircle, IoChatbubbleEllipses, IoChevronDown, IoPulse, IoArchive, IoHeart } from 'react-icons/io5';
import { MdSubscriptions, MdVideoLibrary, MdHistory, MdWatchLater, MdThumbUp } from 'react-icons/md';

interface SignalSidebarProps {
    isOpen: boolean;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function SignalSidebar({ isOpen, activeTab, onTabChange }: SignalSidebarProps) {

    // Main Links
    const mainLinks = [
        { id: 'home', icon: IoHome, label: 'Feed' },
        { id: 'explore', icon: IoCompass, label: 'Resonances' },
        { id: 'subscriptions', icon: IoPulse, label: 'Channels' },
    ];

    // Library Links
    const libraryLinks = [
        { id: 'library', icon: IoLibrary, label: 'Vault' },
        { id: 'history', icon: IoArchive, label: 'Log' },
        { id: 'liked', icon: IoHeart, label: 'Saved' },
    ];

    return (
        <aside className={`fixed left-0 top-16 bottom-0 bg-[#060607]/50 backdrop-blur-xl border-r border-white/5 transition-[width] duration-300 overflow-hidden z-40 ${isOpen ? 'w-[240px]' : 'w-[80px]'}`}>
            
            <div className="flex flex-col h-full py-6 px-3 gap-8">
                
                {/* Main Section */}
                <div className="space-y-1">
                    {mainLinks.map(link => {
                        const isActive = activeTab === link.id;
                        return (
                            <div
                                key={link.id}
                                onClick={() => onTabChange(link.id)}
                                className={`flex items-center ${isOpen ? 'px-4' : 'justify-center'} py-3 cursor-pointer rounded-xl transition-all group ${isActive ? 'bg-[#5eead4]/10 text-[#5eead4]' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
                            >
                                <link.icon className={`${isOpen ? 'mr-4' : ''} w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                {isOpen && <span className="text-[12px] font-black uppercase tracking-widest">{link.label}</span>}
                            </div>
                        );
                    })}
                </div>

                {/* Vault Section */}
                <div className="space-y-1">
                    {isOpen && <h3 className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-3">The Vault</h3>}
                    {libraryLinks.map(link => {
                        const isActive = activeTab === link.id;
                        return (
                            <div
                                key={link.id}
                                onClick={() => onTabChange(link.id)}
                                className={`flex items-center ${isOpen ? 'px-4' : 'justify-center'} py-3 cursor-pointer rounded-xl transition-all group ${isActive ? 'bg-[#5eead4]/10 text-[#5eead4]' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
                            >
                                <link.icon className={`${isOpen ? 'mr-4' : ''} w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                {isOpen && <span className="text-[12px] font-black uppercase tracking-widest">{link.label}</span>}
                            </div>
                        );
                    })}
                </div>

                {/* Uplink Section */}
                {isOpen && (
                    <div className="mt-auto p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">System Status</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-relaxed uppercase tracking-tighter">Neural Uplink Stable. Scanning all frequencies for resonance.</p>
                    </div>
                )}
            </div>
        </aside>
    );
}



