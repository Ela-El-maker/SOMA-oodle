import React from 'react';
import { motion } from 'framer-motion';
import { IoClose, IoCopy, IoDownload, IoFlash, IoLink, IoShareSocial } from 'react-icons/io5';
import { useSynapse } from '../../../context/SynapseContext';

interface BeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    postAuthor: string;
}

export default function BeamModal({ isOpen, onClose, postAuthor }: BeamModalProps) {
    const { fuseChats, userConfig } = useSynapse();

    if (!isOpen) return null;

    // Mock recent contacts if fuseChats is empty for demo purposes
    const displayContacts = fuseChats.length > 0 ? fuseChats : [
        { id: 'm1', peerName: 'Kaito_X', isConnected: true },
        { id: 'm2', peerName: 'Sarah_V', isConnected: true },
        { id: 'm3', peerName: 'Neon_Gh0st', isConnected: false },
        { id: 'm4', peerName: 'Unit_734', isConnected: true },
    ];

    return (
        <div className="absolute inset-0 z-[90] flex flex-col justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="bg-[#0d0d0f] border-t border-white/10 rounded-t-[2.5rem] p-6 pb-10 overflow-hidden shadow-[0_-20px_100px_rgba(0,0,0,1)]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8"></div>
                
                <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm mb-6 flex items-center gap-2">
                    <IoFlash className="text-[#5eead4]" /> Beam_Signal_To
                </h3>

                {/* Fuse Contact Grid */}
                <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x">
                    {displayContacts.map((contact: any) => (
                        <div key={contact.id} className="flex flex-col items-center gap-3 shrink-0 w-16 snap-start cursor-pointer group">
                            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center relative group-hover:border-[#5eead4]/50 transition-colors shadow-lg">
                                <span className="text-xs font-black text-zinc-500 group-hover:text-white transition-colors">{contact.peerName.substring(0,2)}</span>
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-black rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                            <span className="text-[9px] font-bold text-zinc-500 truncate w-full text-center group-hover:text-[#5eead4] transition-colors">{contact.peerName}</span>
                        </div>
                    ))}
                    
                    {/* Search / More Button */}
                    <div className="flex flex-col items-center gap-3 shrink-0 w-16 snap-start cursor-pointer group">
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <IoShareSocial className="text-white" />
                        </div>
                        <span className="text-[9px] font-bold text-zinc-500 group-hover:text-white">More</span>
                    </div>
                </div>

                <div className="h-px bg-white/5 mb-6"></div>

                {/* System Actions */}
                <div className="space-y-3">
                    <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-zinc-900 rounded-xl text-zinc-400 group-hover:text-white transition-colors">
                                <IoCopy />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">Copy_Neural_Link</span>
                        </div>
                        <IoLink className="text-zinc-600" />
                    </button>
                    
                    <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-zinc-900 rounded-xl text-zinc-400 group-hover:text-white transition-colors">
                                <IoDownload />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">Archive_To_Drive</span>
                        </div>
                        <span className="text-[9px] font-bold text-zinc-600 border border-zinc-700 px-2 py-1 rounded">MP4</span>
                    </button>
                </div>

            </motion.div>
        </div>
    );
}
