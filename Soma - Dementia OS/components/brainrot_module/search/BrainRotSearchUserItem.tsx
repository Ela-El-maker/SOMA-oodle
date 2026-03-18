import React from "react";
import { UserConfig } from "../../../types";
import { IoPerson, IoFlash } from "react-icons/io5";

interface BrainRotSearchUserItemProps {
    user: Partial<UserConfig> & { id: string };
    onClick: () => void;
}

export default function BrainRotSearchUserItem({ user, onClick }: BrainRotSearchUserItemProps) {
    return (
        <div
            onClick={onClick}
            className="flex items-center p-4 cursor-pointer transition-all group"
        >
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 mr-4 flex items-center justify-center transition-all group-hover:border-[#5eead4]/30 shadow-xl">
                {user.avatarUrl ? (
                    <img src={user.avatarUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" alt="Avatar" />
                ) : (
                    <div className="text-sm font-black text-zinc-700 group-hover:text-white uppercase">{user.displayName?.substring(0, 2)}</div>
                )}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white uppercase tracking-tight group-hover:text-[#5eead4] transition-colors truncate">
                        {user.displayName}
                    </span>
                    <IoFlash className="text-[#5eead4] w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-0.5 group-hover:text-zinc-400 transition-colors">
                    @{user.username || user.displayName?.toLowerCase().replace(/\s/g, '')}
                </span>
            </div>
            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl font-black text-[9px] text-white uppercase tracking-widest hover:bg-[#5eead4] hover:text-black transition-all opacity-0 group-hover:opacity-100">
                Link
            </button>
        </div>
    );
}



