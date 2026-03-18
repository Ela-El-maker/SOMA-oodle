import React from "react";
import { Comment } from "../../../types";
import { IoHeartOutline } from "react-icons/io5";

interface BrainRotCommentItemProps {
    item: Comment;
}

export default function BrainRotCommentItem({ item }: BrainRotCommentItemProps) {
    return (
        <div className="flex flex-row p-4 hover:bg-white/[0.02] transition-colors rounded-2xl group">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 shrink-0 flex items-center justify-center mr-4 font-black text-[10px] text-zinc-500 group-hover:text-[#5eead4] transition-colors uppercase">
                {item.author.substring(0, 2)}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-black text-white uppercase tracking-tight">
                        {item.author}
                    </span>
                    <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">
                        {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                </div>
                <p className="text-sm text-zinc-400 font-medium leading-relaxed group-hover:text-zinc-200 transition-colors">
                    {item.text}
                </p>
            </div>
            <div className="flex flex-col items-center ml-2 text-zinc-600 group-hover:text-zinc-400 transition-colors">
                <button className="p-1 hover:text-pink-500 transition-colors">
                    <IoHeartOutline className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono font-bold mt-0.5">{item.likes}</span>
            </div>
        </div>
    );
}



