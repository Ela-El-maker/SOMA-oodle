import React, { useEffect } from 'react';
import { SocialPost } from '../../types';
import { IoShareSocial, IoDownload, IoThumbsUp, IoThumbsDown, IoInformationCircle, IoChatbubble, IoPulse, IoChatbubbles } from 'react-icons/io5';
import { ChatterBox } from '../ChatterBox';
import { useSynapse } from '../../context/SynapseContext';

interface SignalWatchProps {
    video: SocialPost;
    recommended: SocialPost[];
    onVideoClick: (id: string) => void;
}

export default function SignalWatch({ video, recommended, onVideoClick }: SignalWatchProps) {
    const { ensureChatterSpace } = useSynapse();

    useEffect(() => {
        ensureChatterSpace(video.id, `Signal: ${video.caption}`, video.author.substring(0, 2).toUpperCase());
    }, [video.id, video.caption, video.author]);

    return (
        <div className="flex flex-col lg:flex-row gap-8 pb-20">

            {/* Primary Signal (Left) */}
            <div className="flex-1">

                {/* Video Player - Premium Frame */}
                <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden relative border border-white/5 shadow-2xl">
                    {video.mediaUrl?.match(/\.(mp4|webm)$/i) ? (
                        <video src={video.mediaUrl} className="w-full h-full" controls autoPlay />
                    ) : (
                        <img src={video.mediaUrl} className="w-full h-full object-contain" alt="Signal source" />
                    )}
                </div>

                {/* Header Info */}
                <div className="mt-6 px-2">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="px-2 py-0.5 rounded bg-[#5eead4]/10 border border-[#5eead4]/20 text-[#5eead4] text-[9px] font-black uppercase tracking-[0.2em]">Live Signal</div>
                        <div className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">#SOMA #NETWORK</div>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">{video.caption}</h1>

                    <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-white/5">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center font-black text-white uppercase">{video.author.substring(0, 2)}</div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-white uppercase tracking-tight">{video.author}</span>
                                    <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">1.2M Subscribers</span>
                                </div>
                            </div>
                            <button className="bg-white text-black px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">Subscribe</button>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors border-r border-white/10">
                                    <IoThumbsUp className="w-4 h-4" /> 
                                    <span className="text-xs font-mono font-bold">{video.likes}</span>
                                </button>
                                <button className="px-4 py-2 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
                                    <IoThumbsDown className="w-4 h-4" />
                                </button>
                            </div>
                            <button className="p-3 bg-white/5 rounded-xl border border-white/10 text-zinc-300 hover:text-white transition-all"><IoShareSocial className="w-4 h-4" /></button>
                            <button className="p-3 bg-white/5 rounded-xl border border-white/10 text-zinc-300 hover:text-white transition-all"><IoDownload className="w-4 h-4" /></button>
                        </div>
                    </div>

                    <div className="mt-6 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                        <p className="text-sm text-zinc-400 leading-relaxed font-medium uppercase tracking-tight opacity-80">
                            Signal Transmitted from sector 7. Encryption protocol active. {video.caption}.
                        </p>
                    </div>
                </div>

                {/* Chatter Integration - Full Height */}
                <div className="mt-8 border border-white/5 rounded-3xl overflow-hidden h-[600px] shadow-2xl bg-[#060607]">
                    <div className="bg-[#0d0d0f] p-4 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <IoChatbubble className="text-[#5eead4] w-5 h-5" />
                            <span className="text-white font-black text-xs uppercase tracking-[0.2em]">Neural Signal Chatter</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_#10b981]"></div>
                            <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Soma Monitoring</span>
                        </div>
                    </div>
                    <ChatterBox networkId={video.id} channelId={`c-${video.id}-general`} />
                </div>
            </div>

            {/* Recommended (Right) */}
            <div className="w-full lg:w-[380px] shrink-0">
                <div className="flex items-center gap-2 mb-6 px-2">
                    <IoPulse className="text-[#5eead4] w-4 h-4" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Related Signals</span>
                </div>
                <div className="flex flex-col gap-4">
                    {recommended.map(rec => (
                        <div key={rec.id} className="flex gap-3 cursor-pointer group p-2 rounded-2xl hover:bg-white/[0.02] transition-colors" onClick={() => onVideoClick(rec.id)}>
                            <div className="w-40 aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-white/5 flex-shrink-0 relative">
                                {rec.mediaUrl?.match(/\.(mp4|webm)$/i) ? (
                                    <video src={rec.mediaUrl} className="w-full h-full object-cover" muted />
                                ) : (
                                    <img src={rec.mediaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Thumbnail" />
                                )}
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                            </div>
                            <div className="flex flex-col min-w-0 py-1">
                                <h4 className="text-[13px] font-bold text-white group-hover:text-[#5eead4] transition-colors leading-snug line-clamp-2 uppercase tracking-tight">{rec.caption}</h4>
                                <div className="mt-1 flex flex-col text-[10px] text-zinc-500 font-bold uppercase tracking-widest gap-0.5">
                                    <span className="hover:text-zinc-300">{rec.author}</span>
                                    <span>{Math.floor(Math.random() * 50)}k Views</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}



