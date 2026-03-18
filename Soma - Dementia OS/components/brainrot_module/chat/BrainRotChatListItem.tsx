import React from "react";
import { IoPerson, IoFlash } from "react-icons/io5";

interface ChatPreview {
    id: string;
    partnerName: string;
    partnerAvatar?: string;
    lastMessage: string;
    timestamp: number;
    unreadCount: number;
}

interface BrainRotChatListItemProps {
    chat: ChatPreview;
    onClick: () => void;
}

export default function BrainRotChatListItem({ chat, onClick }: BrainRotChatListItemProps) {
    return (
        <div
            onClick={onClick}
            className="flex items-center p-4 cursor-pointer transition-colors group"
        >
            <div className="relative mr-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 flex items-center justify-center transition-all group-hover:border-[#5eead4]/30 shadow-xl">
                    {chat.partnerAvatar ? (
                        <img src={chat.partnerAvatar} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" alt="Avatar" />
                    ) : (
                        <div className="text-lg font-black text-zinc-700 group-hover:text-white uppercase">{chat.partnerName.substring(0, 2)}</div>
                    )}
                </div>
                {chat.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-[#5eead4] text-black text-[9px] font-black w-5 h-5 rounded-lg flex items-center justify-center border-2 border-[#060607] shadow-lg">
                        {chat.unreadCount}
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <span className="font-black text-sm text-white uppercase tracking-tight group-hover:text-[#5eead4] transition-colors truncate">{chat.partnerName}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors ml-2">
                        {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-xs text-zinc-500 font-medium truncate group-hover:text-zinc-300 transition-colors">{chat.lastMessage}</p>
                    {chat.unreadCount > 0 && <IoFlash className="text-[#5eead4] w-3 h-3 animate-pulse" />}
                </div>
            </div>
        </div>
    );
}



