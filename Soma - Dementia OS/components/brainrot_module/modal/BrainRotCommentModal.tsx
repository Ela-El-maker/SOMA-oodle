import React, { useState } from "react";
import { Comment, SocialPost } from "../../../types";
import BrainRotCommentItem from "./BrainRotCommentItem";
import { IoClose, IoFlash } from "react-icons/io5";

interface BrainRotCommentModalProps {
    post: SocialPost;
    isOpen: boolean;
    onClose: () => void;
    currentComments: Comment[];
    onAddComment: (text: string) => void;
}

export default function BrainRotCommentModal({ post, isOpen, onClose, currentComments, onAddComment }: BrainRotCommentModalProps) {
    const [text, setText] = useState("");

    if (!isOpen) return null;

    const handleSend = () => {
        if (!text.trim()) return;
        onAddComment(text);
        setText("");
    };

    return (
        <div className="h-full bg-[#060607] rounded-t-[3rem] shadow-[0_-20px_100px_rgba(0,0,0,0.8)] border-t border-white/10 flex flex-col z-[100] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-black text-xs uppercase tracking-widest">{currentComments.length} Signals Captured</span>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white">
                    <IoClose className="w-6 h-6" />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
                {currentComments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                        <IoFlash className="w-12 h-12" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">No feedback resonance</span>
                    </div>
                ) : (
                    currentComments.map(c => (
                        <BrainRotCommentItem key={c.id} item={c} />
                    ))
                )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-white/5 bg-[#060607] pb-10">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-1.5 focus-within:border-[#5eead4]/50 transition-all">
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Project your resonance..."
                        className="flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder-zinc-600 font-medium"
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button 
                        onClick={handleSend} 
                        disabled={!text.trim()}
                        className={`p-2 rounded-xl transition-all ${text.trim() ? 'text-[#5eead4] shadow-[0_0_15px_rgba(94,234,212,0.3)] bg-[#5eead4]/10' : 'text-zinc-700 bg-transparent'}`}
                    >
                        <IoFlash className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}



