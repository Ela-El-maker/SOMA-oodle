import React from "react";
import { IoHome, IoSearch, IoAdd, IoChatbubble, IoPerson, IoDiscOutline } from "react-icons/io5";
import { motion } from "framer-motion";

interface BrainRotNavigationProps {
    currentTab: string;
    onTabChange: (tab: string) => void;
}

export default function BrainRotNavigation({ currentTab, onTabChange }: BrainRotNavigationProps) {
    const tabs = [
        { id: 'home', icon: IoHome, label: 'Feed' },
        { id: 'discover', icon: IoSearch, label: 'Nodes' },
        { id: 'create', icon: IoDiscOutline, label: '', isAction: true },
        { id: 'inbox', icon: IoChatbubble, label: 'Sync' },
        { id: 'profile', icon: IoPerson, label: 'Identity' },
    ];

    return (
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-black/60 backdrop-blur-2xl border-t border-white/10 flex justify-around items-center z-[60] pb-6 px-4">
            {tabs.map(tab => {
                if (tab.isAction) {
                    return (
                        <button key={tab.id} className="relative group flex items-center justify-center -mt-8">
                            <div className="absolute inset-0 bg-[#5eead4] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                            <div className="relative w-16 h-16 bg-[#5eead4] rounded-[1.8rem] flex items-center justify-center transform transition-all duration-500 active:scale-90 group-hover:rotate-90 group-hover:scale-110 shadow-[0_0_30px_rgba(94,234,212,0.3)]">
                                <IoAdd className="w-10 h-10 text-black" />
                            </div>
                        </button>
                    );
                }

                const isActive = currentTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex flex-col items-center justify-center gap-2 transition-all duration-500 ${isActive ? 'text-[#5eead4]' : 'text-zinc-600 hover:text-zinc-300'}`}
                    >
                        <div className={`relative ${isActive ? 'scale-110' : 'scale-100'} transition-transform duration-500`}>
                            <tab.icon className={`w-6 h-6 ${isActive ? 'drop-shadow-[0_0_8px_rgba(94,234,212,0.5)]' : ''}`} />
                            {isActive && (
                                <motion.div 
                                    layoutId="nav-dot"
                                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#5eead4] rounded-full shadow-[0_0_10px_#5eead4]"
                                />
                            )}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
}



