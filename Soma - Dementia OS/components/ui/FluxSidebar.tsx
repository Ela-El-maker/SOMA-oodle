import React from 'react';
import { useSynapse } from '../../context/SynapseContext';
import { ViewMode } from '../../types';
import { IoHomeOutline, IoChatbubbles, IoSearchOutline, IoPulseOutline, IoArchiveOutline, IoSettingsOutline, IoFlash } from 'react-icons/io5';

export const FluxSidebar: React.FC = () => {
    const { userConfig, setActiveView, setProfileFocus, toggleSettings, fluxPosts } = useSynapse();

    const stats = {
        signals: fluxPosts.filter(p => p.author === userConfig.displayName).length,
        uplinks: 142,
        resonance: '98%'
    };

    const navItems = [
        { label: 'Feed', view: ViewMode.FLUX, icon: IoHomeOutline },
        { label: 'Network', view: ViewMode.SIGNAL, icon: IoPulseOutline },
        { label: 'Chatter', view: ViewMode.CHATTER, icon: IoChatbubbles },
        { label: 'Archive', view: ViewMode.LEARN, icon: IoArchiveOutline },
    ];

    return (
        <div className="w-full space-y-6">
            {/* Premium Profile Card */}
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
                <div className="h-24 bg-[#5eead4]/10 relative">
                    {userConfig.bannerUrl && <img src={userConfig.bannerUrl} className="w-full h-full object-cover opacity-40" alt="Banner" />}
                    <div
                        className="absolute -bottom-10 left-6 w-20 h-20 bg-zinc-900 border-4 border-[#060607] rounded-2xl overflow-hidden shadow-2xl cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => { setProfileFocus(userConfig.displayName); setActiveView(ViewMode.PROFILE); }}
                    >
                        {userConfig.avatarUrl ? (
                            <img src={userConfig.avatarUrl} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center font-black text-2xl text-zinc-500 uppercase">
                                {userConfig.displayName.substring(0, 2)}
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-12 px-6 pb-6">
                    <div
                        className="font-black text-xl text-white uppercase tracking-tighter hover:text-[#5eead4] transition-colors cursor-pointer"
                        onClick={() => { setProfileFocus(userConfig.displayName); setActiveView(ViewMode.PROFILE); }}
                    >
                        {userConfig.displayName}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#5eead4] mt-1 mb-6 opacity-70">@{userConfig.username}</div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col">
                            <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Signals</span>
                            <span className="text-sm font-black text-white">{stats.signals}</span>
                        </div>
                        <div className="flex flex-col border-x border-white/5 px-2">
                            <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Uplinks</span>
                            <span className="text-sm font-black text-white">{stats.uplinks}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest text-right">Resonance</span>
                            <span className="text-sm font-black text-[#5eead4]">{stats.resonance}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Navigation Menu */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden py-2 px-2 shadow-xl">
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => setActiveView(item.view)}
                        className="w-full text-left px-4 py-3 rounded-2xl hover:bg-white/5 flex items-center gap-4 transition-all group"
                    >
                        <item.icon className="w-5 h-5 text-zinc-500 group-hover:text-[#5eead4] group-hover:scale-110 transition-all" />
                        <span className="font-black text-zinc-500 text-[11px] uppercase tracking-[0.2em] group-hover:text-white transition-colors">{item.label}</span>
                    </button>
                ))}
                <div className="h-px bg-white/5 my-2 mx-4"></div>
                <button
                    onClick={() => toggleSettings(true)}
                    className="w-full text-left px-4 py-3 rounded-2xl hover:bg-white/5 flex items-center gap-4 transition-all group"
                >
                    <IoSettingsOutline className="w-5 h-5 text-zinc-500 group-hover:text-white" />
                    <span className="font-black text-zinc-500 text-[11px] uppercase tracking-[0.2em] group-hover:text-white transition-colors">Configure</span>
                </button>
            </div>

            {/* System Uplink Status */}
            <div className="p-6 rounded-3xl bg-[#5eead4]/5 border border-[#5eead4]/10 shadow-inner">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#5eead4] animate-pulse shadow-[0_0_8px_#5eead4]"></div>
                    <span className="text-[10px] font-black text-[#5eead4] uppercase tracking-[0.3em]">Network_Sync</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium leading-relaxed uppercase tracking-widest opacity-80">
                    Neural frequencies are currently synchronized across all local sectors.
                </p>
            </div>
        </div>
    );
};



