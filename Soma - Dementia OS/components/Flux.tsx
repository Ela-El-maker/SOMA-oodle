import React, { useState, useRef } from 'react';
import { useSynapse } from '../context/SynapseContext';
import { FluxPost, ViewMode } from '../types';
import { FluxRightColumn } from './ui/FluxRightColumn';
import { ChatterBox } from './ChatterBox';
import { IoImageOutline, IoStatsChartOutline, IoHappyOutline, IoChatbubbleOutline, IoRepeatOutline, IoHeartOutline, IoHeart, IoShareOutline, IoFlashOutline, IoClose } from 'react-icons/io5';

export const Flux: React.FC = () => {
    const {
        fluxPosts, addFluxPost, setFluxPosts,
        userConfig, socialPosts, setActiveView,
        setProfileFocus, ensureChatterSpace
    } = useSynapse();

    const [content, setContent] = useState('');
    const [attachments, setAttachments] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
    const [activeChatterFor, setActiveChatterFor] = useState<string | null>(null);

    const CHAR_LIMIT = 280;
    const charCount = content.length;
    const isOverLimit = charCount > CHAR_LIMIT;

    const handlePost = () => {
        if ((!content.trim() && attachments.length === 0) || isOverLimit) return;

        const newPost: FluxPost = {
            id: `f-${Date.now()}`,
            author: userConfig.displayName,
            handle: userConfig.username,
            avatar: userConfig.avatarUrl,
            content: content,
            timestamp: Date.now(),
            likes: 0,
            reposts: 0,
            replies: 0,
            likedByMe: false,
            attachments: attachments,
            repliesList: []
        };

        addFluxPost(newPost);
        setContent('');
        setAttachments([]);
    };

    const handleLike = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = fluxPosts.map(p => {
            if (p.id === id) {
                return {
                    ...p,
                    likes: p.likedByMe ? p.likes - 1 : p.likes + 1,
                    likedByMe: !p.likedByMe
                };
            }
            return p;
        });
        setFluxPosts(updated);
    };

    const handleRepost = (postToRepost: FluxPost, e: React.MouseEvent) => {
        e.stopPropagation();
        const newPost: FluxPost = {
            id: `f-re-${Date.now()}`,
            author: userConfig.displayName,
            handle: userConfig.username,
            avatar: userConfig.avatarUrl,
            content: postToRepost.content,
            timestamp: Date.now(),
            likes: 0,
            reposts: 0,
            replies: 0,
            likedByMe: false,
            linkedContentId: postToRepost.id,
            linkedContentType: 'flux',
            repostedByMe: true,
            attachments: postToRepost.attachments,
            repliesList: []
        };

        addFluxPost(newPost);

        const updatedOriginals = fluxPosts.map(p => {
            if (p.id === postToRepost.id) {
                return { ...p, reposts: p.reposts + 1 };
            }
            return p;
        });
        setFluxPosts(updatedOriginals);
    };

    const handleReplyClick = (e: React.MouseEvent, postId: string) => {
        e.stopPropagation();
        setExpandedPostId(expandedPostId === postId ? null : postId);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setAttachments(prev => [...prev, event.target!.result as string]);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const formatTime = (ts: number) => {
        const now = Date.now();
        const diff = (now - ts) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return new Date(ts).toLocaleDateString();
    };

    const openProfile = (author: string) => {
        setProfileFocus(author);
        setActiveView(ViewMode.PROFILE);
    };

    const handleJoinChatter = (post: FluxPost, e: React.MouseEvent) => {
        e.stopPropagation();
        ensureChatterSpace(post.id, `Flux: ${post.author}`, post.author.substring(0, 2).toUpperCase());
        setActiveChatterFor(activeChatterFor === post.id ? null : post.id);
    };

    return (
        <div className="min-h-screen w-full bg-[#060607] font-sans text-[15px] text-[#e0e0e0] overflow-y-auto selection:bg-[#5eead4]/30 pb-32">
            <div className="max-w-[1400px] mx-auto pt-16 px-6 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start">
                
                {/* --- MAIN STREAM --- */}
                <div className="w-full border-x border-white/5 min-h-screen">
                    <div className="p-4 border-b border-white/10 bg-white/[0.02] backdrop-blur-sm mb-2 rounded-2xl">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0 border border-white/10">
                                {userConfig.avatarUrl && <img src={userConfig.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />}
                            </div>
                            <div className="flex-1">
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Transmit a signal..."
                                    className="w-full bg-transparent text-white border-none p-0 text-[18px] font-medium resize-none focus:ring-0 placeholder-zinc-700 min-h-[60px]"
                                />
                                {attachments.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto py-2">
                                        {attachments.map((src, i) => (
                                            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group">
                                                <img src={src} className="w-full h-full object-cover" alt="Attachment" />
                                                <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-red-500 transition-colors"><IoClose className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5">
                                    <div className="flex gap-4 text-[#5eead4]">
                                        <button onClick={() => fileInputRef.current?.click()} className="hover:bg-[#5eead4]/10 p-2 rounded-full transition-colors"><IoImageOutline className="w-5 h-5" /></button>
                                        <button className="hover:bg-[#5eead4]/10 p-2 rounded-full transition-colors"><IoStatsChartOutline className="w-5 h-5" /></button>
                                        <button className="hover:bg-[#5eead4]/10 p-2 rounded-full transition-colors"><IoHappyOutline className="w-5 h-5" /></button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-[10px] font-mono font-bold ${isOverLimit ? 'text-red-500' : 'text-zinc-600'}`}>{CHAR_LIMIT - charCount}</span>
                                        <button onClick={handlePost} disabled={(content.trim().length === 0 && attachments.length === 0) || isOverLimit} className="bg-[#5eead4] hover:bg-[#4fd1bc] text-black font-black px-6 py-2 rounded-xl text-xs uppercase tracking-widest disabled:opacity-30 transition-all shadow-[0_0_20px_rgba(94,234,212,0.2)]">Post</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                        {fluxPosts.map(post => {
                            const linkedBrainRot = post.linkedContentType === 'brainrot' ? socialPosts.find(p => p.id === post.linkedContentId) : null;
                            const isChatterOpen = activeChatterFor === post.id;
                            return (
                                <div key={post.id} className="bg-[#060607] p-4 hover:bg-white/[0.02] transition-colors group">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0 border border-white/5 cursor-pointer" onClick={() => openProfile(post.author)}>
                                            {post.avatar ? <img src={post.avatar} className="w-full h-full object-cover" alt="Avatar" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">{post.author.substring(0, 2)}</div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="font-bold text-white truncate hover:underline cursor-pointer" onClick={() => openProfile(post.author)}>{post.author}</span>
                                                    <span className="text-zinc-500 text-xs truncate">@{post.handle}</span>
                                                    <span className="text-zinc-700">·</span>
                                                    <span className="text-zinc-500 text-xs">{formatTime(post.timestamp)}</span>
                                                </div>
                                            </div>
                                            <div className="text-[15px] text-zinc-300 leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</div>
                                            {post.attachments && post.attachments.length > 0 && (
                                                <div className="mb-3 rounded-2xl overflow-hidden border border-white/5">{post.attachments.map((src, i) => (<img key={i} src={src} className="w-full max-h-[500px] object-cover" alt="Post attachment" />))}</div>
                                            )}
                                            {linkedBrainRot && (
                                                <div className="mb-3 border border-white/10 rounded-2xl flex overflow-hidden bg-white/5 hover:bg-white/10 transition-colors group/linked">
                                                    <div className="w-24 h-24 bg-zinc-900 flex-shrink-0"><img src={linkedBrainRot.mediaUrl} className="w-full h-full object-cover opacity-80 group-hover/linked:opacity-100 transition-opacity" alt="Linked signal" /></div>
                                                    <div className="p-3 flex flex-col justify-center min-w-0"><div className="text-[9px] text-[#5eead4] font-black uppercase tracking-[0.2em] mb-1">Attached_Signal</div><div className="font-bold text-sm text-white truncate">@{linkedBrainRot.author}</div><div className="text-xs text-zinc-400 truncate mt-0.5">{linkedBrainRot.caption}</div></div>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between max-w-md mt-4 text-zinc-500">
                                                <button onClick={(e) => handleReplyClick(e, post.id)} className="flex items-center gap-2 hover:text-[#5eead4] transition-colors group/act"><div className="p-2 rounded-full group-hover/act:bg-[#5eead4]/10 transition-colors"><IoChatbubbleOutline className="w-4 h-4" /></div><span className="text-xs font-mono">{post.repliesList ? post.repliesList.length : post.replies}</span></button>
                                                <button onClick={(e) => handleRepost(post, e)} className={`flex items-center gap-2 transition-colors group/act ${post.repostedByMe ? 'text-emerald-400' : 'hover:text-emerald-400'}`}><div className="p-2 rounded-full group-hover/act:bg-emerald-400/10 transition-colors"><IoRepeatOutline className="w-4 h-4" /></div><span className="text-xs font-mono">{post.reposts}</span></button>
                                                <button onClick={(e) => handleLike(post.id, e)} className={`flex items-center gap-2 transition-colors group/act ${post.likedByMe ? 'text-pink-500' : 'hover:text-pink-500'}`}><div className="p-2 rounded-full group-hover/act:bg-pink-500/10 transition-colors">{post.likedByMe ? <IoHeart className="w-4 h-4" /> : <IoHeartOutline className="w-4 h-4" />}</div><span className="text-xs font-mono">{post.likes}</span></button>
                                                <button onClick={(e) => handleJoinChatter(post, e)} className={`flex items-center gap-2 transition-colors group/act ${isChatterOpen ? 'text-[#5eead4]' : 'hover:text-[#5eead4]'}`}><div className="p-2 rounded-full group-hover/act:bg-[#5eead4]/10 transition-colors"><IoFlashOutline className="w-4 h-4" /></div><span className="text-[10px] font-black uppercase tracking-tighter">Chatter</span></button>
                                                <button className="p-2 rounded-full hover:bg-white/10 hover:text-white transition-colors"><IoShareOutline className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                    {isChatterOpen && (
                                        <div className="mt-4 ml-14 h-[450px] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-top-4 duration-500">
                                            <ChatterBox networkId={post.id} channelId={`c-${post.id}-general`} isMini onClose={() => setActiveChatterFor(null)} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- RIGHT SIDEBAR --- */}
                <div className="sticky top-20 hidden lg:block">
                    <FluxRightColumn />
                </div>

            </div>
        </div>
    );
};



