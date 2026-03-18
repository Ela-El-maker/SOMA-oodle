import React from 'react';
import { SocialPost } from '../../types';
import { IoFlash } from 'react-icons/io5';

interface SignalFeedProps {
    videos: SocialPost[];
    onVideoClick: (id: string) => void;
    sidebarOpen: boolean;
}

export default function SignalFeed({ videos, onVideoClick, sidebarOpen }: SignalFeedProps) {
    return (
        <div className="pb-20">
            {/* Minimalist Banner */}
            <div className="w-full mb-8 relative group overflow-hidden rounded-3xl h-[180px] bg-[#060607] border border-white/5 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-[#5eead4]/10 opacity-50"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_-20%,rgba(94,234,212,0.15),transparent_50%)]"></div>
                <div className="relative h-full flex flex-col justify-center px-10">
                    <div className="flex items-center gap-3 mb-2 text-[#5eead4]">
                        <IoFlash className="w-6 h-6 shadow-[0_0_15px_rgba(94,234,212,0.5)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">Signal_Premium</span>
                    </div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter max-w-md">The neural network is live.</h2>
                    <p className="text-zinc-500 text-sm mt-2 font-medium uppercase tracking-widest">Scanning all frequencies for resonance.</p>
                </div>
            </div>

            {/* Filter Chips - Future Style */}
            <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                {['All Signals', 'Resonance', 'Neural Flux', 'Artifacts', 'Live Feed', 'System Log'].map((chip, i) => (
                    <button key={chip} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all border ${i === 0 ? 'bg-[#5eead4] border-[#5eead4] text-black shadow-[0_0_15px_rgba(94,234,212,0.3)]' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white hover:border-white/20'}`}>
                        {chip}
                    </button>
                ))}
            </div>

            {/* Video Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map(video => (
                    <div key={video.id} className="cursor-pointer group flex flex-col gap-4" onClick={() => onVideoClick(video.id)}>
                        {/* Thumbnail - Future Minimalist */}
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-[#5eead4]/30 transition-all shadow-xl group-hover:shadow-[#5eead4]/5">
                            {video.mediaUrl?.match(/\.(mp4|webm)$/i) ? (
                                <video src={video.mediaUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" muted />
                            ) : (
                                <img src={video.mediaUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Video thumbnail" />
                            )}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                            <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded-lg border border-white/10 tracking-widest">12:45</span>
                        </div>

                        {/* Info */}
                        <div className="flex items-start px-1">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 mr-3.5 flex-shrink-0 flex items-center justify-center font-black text-[10px] text-zinc-500 group-hover:text-[#5eead4] group-hover:border-[#5eead4]/30 transition-all uppercase">
                                {video.author.substring(0, 2)}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-[#5eead4] transition-colors mb-1 uppercase tracking-tight">
                                    {video.caption}
                                </h3>
                                <div className="flex flex-col text-[11px] text-zinc-500 font-bold uppercase tracking-widest gap-0.5">
                                    <span>{video.author}</span>
                                    <span>{Math.floor(video.likes * 100)}K Views &bull; Active Now</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}



