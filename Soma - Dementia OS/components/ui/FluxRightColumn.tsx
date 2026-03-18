import React from 'react';
import { useSynapse } from '../../context/SynapseContext';
import { IoFlash, IoPulseOutline, IoChevronForward } from 'react-icons/io5';

export const FluxRightColumn: React.FC = () => {
    const { minds } = useSynapse();

    const trends = [
        { tag: '#SomaNet', count: '12.5K Signals' },
        { tag: '#BrainRot', count: '8,902 Signals' },
        { tag: '#DigitalDecay', count: '5,120 Signals' },
        { tag: '#NeuralLink', count: 'Active Resonance' },
    ];

    return (
        <div className="w-full space-y-6">
            {/* Trends - Future Minimalist */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-3 mb-6">
                    <IoPulseOutline className="text-[#5eead4] w-5 h-5" />
                    <h3 className="font-black text-xs text-white uppercase tracking-[0.3em]">Top_Resonances</h3>
                </div>

                <div className="space-y-5">
                    {trends.map((trend) => (
                        <div key={trend.tag} className="cursor-pointer group">
                            <div className="font-black text-[#5eead4] text-[13px] uppercase tracking-tighter group-hover:underline">{trend.tag}</div>
                            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1 group-hover:text-zinc-400 transition-colors">{trend.count}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-4 border-t border-white/5">
                    <button className="flex items-center gap-2 text-[9px] font-black text-zinc-500 hover:text-white uppercase tracking-[0.2em] transition-colors">
                        Show more frequencies <IoChevronForward />
                    </button>
                </div>
            </div>

            {/* Who To Link - Future Nodes */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-3 mb-6">
                    <IoFlash className="text-[#5eead4] w-5 h-5" />
                    <h3 className="font-black text-xs text-white uppercase tracking-[0.3em]">Potential_Links</h3>
                </div>

                <div className="space-y-6">
                    {minds.slice(0, 3).map((mind) => (
                        <div key={mind.id} className="flex gap-4 items-center group">
                            <div className="w-12 h-12 bg-zinc-900 border border-white/10 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-xs text-zinc-500 group-hover:border-[#5eead4]/30 transition-all uppercase">
                                {mind.name.substring(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-black text-white text-[13px] uppercase tracking-tight truncate group-hover:text-[#5eead4] transition-colors cursor-pointer">{mind.name}</div>
                                <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest truncate">@Node_{mind.id.substring(5)}</div>
                            </div>
                            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl font-black text-[9px] text-white uppercase tracking-widest hover:bg-[#5eead4] hover:text-black transition-all shadow-lg active:scale-95">
                                Link
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-4 border-t border-white/5">
                    <button className="text-[9px] font-black text-zinc-500 hover:text-white uppercase tracking-[0.2em] transition-colors">Find neural nodes</button>
                </div>
            </div>

            {/* Premium Footer */}
            <div className="px-6 text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] leading-relaxed opacity-60">
                &copy; 2026 SOMA_SYSTEM <br /> 
                <span className="hover:text-white cursor-pointer">About</span> • 
                <span className="hover:text-white cursor-pointer ml-1">Protocols</span> • 
                <span className="hover:text-white cursor-pointer ml-1">Privacy</span>
            </div>
        </div>
    );
};



