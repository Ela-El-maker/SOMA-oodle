import React from "react";
import { UserConfig } from "../../../types";
import { IoPerson, IoSettings, IoFlash, IoRepeat, IoPulse } from "react-icons/io5";

interface BrainRotProfileHeaderProps {
    user: UserConfig;
    totalLikes: number;
    followingCount: number;
    followersCount: number;
    isCurrentUser: boolean;
    onEditProfile?: () => void;
    onFollow?: () => void;
}

export default function BrainRotProfileHeader({
    user,
    totalLikes,
    followingCount,
    followersCount,
    isCurrentUser,
    onEditProfile,
    onFollow
}: BrainRotProfileHeaderProps) {

    return (
        <div className="flex flex-col items-center pt-8 pb-10 bg-transparent">
            {/* Future Identity Card */}
            <div className="relative group mb-8">
                <div className="absolute inset-0 bg-[#5eead4] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative w-32 h-32 rounded-[2rem] overflow-hidden border-2 border-white/10 bg-zinc-900 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105">
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                    ) : (
                        <div className="text-4xl font-black text-zinc-700 uppercase">{user.displayName.substring(0, 2)}</div>
                    )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-[#5eead4] p-2 rounded-xl border-4 border-[#060607] shadow-lg">
                    <IoPulse className="w-4 h-4 text-black" />
                </div>
            </div>

            {/* Info */}
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{user.displayName}</h2>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                </div>
                <p className="text-[#5eead4] font-black text-[10px] uppercase tracking-[0.3em] opacity-80">@{user.username}</p>
            </div>

            {/* Stats Array - Future Minimalist Grid */}
            <div className="grid grid-cols-3 gap-12 mb-10">
                <div className="flex flex-col items-center">
                    <span className="text-2xl font-black text-white tabular-nums">{followingCount}</span>
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">Nodes</span>
                </div>
                <div className="flex flex-col items-center border-x border-white/5 px-12">
                    <span className="text-2xl font-black text-white tabular-nums">{followersCount}</span>
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">Uplinks</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-2xl font-black text-white tabular-nums">{totalLikes}</span>
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">Resonance</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                {isCurrentUser ? (
                    <button
                        onClick={onEditProfile}
                        className="px-10 py-3 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
                    >
                        Configure ID
                    </button>
                ) : (
                    <button
                        onClick={onFollow}
                        className="px-12 py-3 bg-[#5eead4] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-black shadow-[0_0_20px_rgba(94,234,212,0.3)] hover:shadow-[0_0_30px_rgba(94,234,212,0.5)] transition-all active:scale-95"
                    >
                        Establish Link
                    </button>
                )}
                <button className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all">
                    <IoRepeat className="w-4 h-4" />
                </button>
            </div>

            {/* Signal Bio */}
            {user.bio && (
                <p className="mt-10 text-center text-xs font-medium uppercase tracking-widest text-zinc-500 max-w-sm leading-relaxed">
                    {user.bio}
                </p>
            )}
        </div>
    );
}



