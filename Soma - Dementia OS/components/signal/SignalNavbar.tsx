import React, { useState } from 'react';
import { IoMenu, IoSearch, IoMic, IoVideocam, IoNotifications, IoFlash } from 'react-icons/io5';
import { useSynapse } from '../../context/SynapseContext';

interface SignalNavbarProps {
    onMenuClick: () => void;
}

export default function SignalNavbar({ onMenuClick }: SignalNavbarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const { userConfig } = useSynapse();

    return (
        <nav className="flex items-center justify-between px-6 py-3 bg-[#060607]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
            {/* Left: Menu & Logo */}
            <div className="flex items-center gap-6">
                <button onClick={onMenuClick} className="p-2 hover:bg-white/5 rounded-lg transition-colors group">
                    <IoMenu className="w-6 h-6 text-zinc-400 group-hover:text-white" />
                </button>
                <div className="flex items-center gap-2 cursor-pointer group">
                    <div className="w-8 h-8 rounded-xl bg-[#5eead4] flex items-center justify-center relative shadow-[0_0_15px_rgba(94,234,212,0.3)]">
                        <IoFlash className="text-black w-5 h-5" />
                    </div>
                    <span className="text-xl font-black tracking-[0.2em] text-white uppercase font-mono">Signal</span>
                </div>
            </div>

            {/* Middle: Search - Minimalist */}
            <div className="hidden md:flex items-center flex-1 max-w-[500px] mx-10">
                <div className="flex flex-1 items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus-within:border-[#5eead4]/50 transition-all">
                    <IoSearch className="w-4 h-4 text-zinc-500 mr-3" />
                    <input
                        type="text"
                        placeholder="Scan frequencies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full outline-none bg-transparent text-sm text-white placeholder-zinc-600"
                    />
                </div>
            </div>

            {/* Right: Icons */}
            <div className="flex items-center gap-2">
                <button className="p-2.5 hover:bg-white/5 rounded-xl transition-colors text-zinc-400 hover:text-white hidden sm:flex">
                    <IoVideocam className="w-5 h-5" />
                </button>
                <button className="p-2.5 hover:bg-white/5 rounded-xl transition-colors text-zinc-400 hover:text-white relative">
                    <IoNotifications className="w-5 h-5" />
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#5eead4] rounded-full shadow-[0_0_5px_#5eead4]"></div>
                </button>
                <div className="w-9 h-9 rounded-xl border border-white/10 overflow-hidden ml-2 cursor-pointer hover:border-[#5eead4]/50 transition-all">
                    {userConfig.avatarUrl ? (
                        <img src={userConfig.avatarUrl} className="w-full h-full object-cover" alt="User" />
                    ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                            {userConfig.displayName.substring(0, 1)}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}



