import React, { useMemo, useState } from 'react';
import { useSynapse } from '../context/SynapseContext';
import { ViewMode } from '../types';

interface ProfileDashboardProps {
  onEditProfile: () => void;
}

export const ProfileDashboard: React.FC<ProfileDashboardProps> = ({ onEditProfile }) => {
  const { userConfig, fluxPosts, setFluxPosts, socialPosts, setSocialPosts, learningResources, profileFocus, setProfileFocus, minds } = useSynapse();

  const profileName = profileFocus || userConfig.displayName;
  const isSelf = profileName === userConfig.displayName;

  const profileFlux = fluxPosts.filter(p => p.author === profileName);
  const profileMedia = socialPosts.filter(p => p.author === profileName);
  const profileResources = learningResources.filter(r => r.author === profileName);

  const stats = [
    { label: 'Signals', value: profileFlux.length },
    { label: 'Media', value: profileMedia.length },
    { label: 'Artifacts', value: profileResources.length },
    { label: 'Resonance', value: '98%' },
  ];

  const connections = useMemo(() => {
    return minds.slice(0, 8).map(m => ({
      id: m.id,
      name: m.name,
      img: null,
      role: m.tags[0]
    }));
  }, [minds]);

  const recentSignals = useMemo(() => {
    return profileFlux.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [profileFlux]);

  const formatTime = (ts: number) => {
    const now = Date.now();
    const diff = (now - ts) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return new Date(ts).toLocaleDateString();
  };

  const { ensureChatterSpace, setActiveView, setChatterFocus } = useSynapse();
  const handleJoinChatter = () => {
    const network = ensureChatterSpace(`profile-${profileName}`, `Identity: ${profileName}`, profileName.substring(0, 2).toUpperCase());
    setChatterFocus({ networkId: network.id });
    setActiveView(ViewMode.CHATTER);
  };

  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const interactions = useMemo(() => {
    let all: any[] = [];
    socialPosts.filter(p => p.author === profileName).forEach(p => {
      if (p.commentsList) {
        p.commentsList.forEach(c => {
          if (c.author !== profileName) {
            all.push({ ...c, source: 'brainrot', postTitle: 'Visual Cortex', postId: p.id });
          }
        })
      }
    });
    fluxPosts.filter(p => p.author === profileName).forEach(p => {
      if (p.repliesList) {
        p.repliesList.forEach(r => {
          if (r.author !== profileName) {
            all.push({ ...r, source: 'flux', postTitle: 'Signal Stream', postId: p.id });
          }
        })
      }
    });
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }, [socialPosts, fluxPosts, profileName]);

  const handleQuickReply = () => {
    if (!replyingTo || !replyText.trim()) return;
    const target = interactions.find(i => i.id === replyingTo);
    if (!target) return;

    if (target.source === 'brainrot') {
      const updated = socialPosts.map(p => {
        if (p.id === target.postId) {
          const newComment = {
            id: `c-${Date.now()}`,
            author: userConfig.displayName,
            text: replyText,
            timestamp: Date.now(),
            likes: 0,
            userVote: null
          };
          return { ...p, comments: p.comments + 1, commentsList: [newComment, ...(p.commentsList || [])] };
        }
        return p;
      });
      setSocialPosts(updated);
    } else {
      const updated = fluxPosts.map(p => {
        if (p.id === target.postId) {
          const newReply = {
            id: `r-${Date.now()}`,
            author: userConfig.displayName,
            text: replyText,
            timestamp: Date.now(),
            likes: 0
          };
          return { ...p, replies: (p.replies || 0) + 1, repliesList: [newReply, ...(p.repliesList || [])] };
        }
        return p;
      });
      setFluxPosts(updated);
    }
    setReplyText('');
    setReplyingTo(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-[#e0e0e0] font-sans p-4 md:p-8 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black pb-32">

      <div className="max-w-[1400px] mx-auto mb-6 flex justify-between items-end border-b border-white/10 pb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#5eead4] mb-1 animate-pulse font-black">Identity_Monitor_v2</div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase glitch-text" data-text={profileName}>{profileName}</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={handleJoinChatter} className="bg-[#5eead4]/10 hover:bg-[#5eead4]/20 border border-[#5eead4]/30 text-[#5eead4] text-[10px] font-black uppercase tracking-[0.2em] px-6 py-3 rounded-xl backdrop-blur-md transition-all shadow-lg shadow-[#5eead4]/5">
            Chatter
          </button>
          {isSelf && (
            <button onClick={onEditProfile} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-3 rounded-xl backdrop-blur-md transition-all">
              Initialize Edit
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 md:grid-rows-[300px_350px_auto] gap-4">

        <div className="col-span-1 md:col-span-2 row-span-1 relative group overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/30 backdrop-blur-md shadow-2xl">
          <div className="absolute inset-0 z-0">
            {userConfig.bannerUrl ? (
              <img src={userConfig.bannerUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-1000 grayscale group-hover:grayscale-0" alt="Banner" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-[#1da1f2]/20 to-[#794bc4]/20" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 p-8 z-10 flex items-end gap-6 w-full">
            <div className="w-28 h-28 rounded-2xl border-2 border-white/10 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] bg-zinc-900 transition-transform group-hover:scale-105 duration-500">
              {userConfig.avatarUrl && isSelf ? (
                <img src={userConfig.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-zinc-700 bg-zinc-800 uppercase">
                  {profileName.substring(0, 2)}
                </div>
              )}
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${userConfig.status === 'online' ? 'bg-[#5eead4] shadow-[0_0_10px_#5eead4]' : 'bg-zinc-500'}`}></div>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{userConfig.status}</span>
              </div>
              <div className="text-2xl text-white font-black uppercase tracking-tighter">{userConfig.displayName}</div>
              <div className="text-[11px] text-[#5eead4] font-black uppercase tracking-[0.3em] opacity-70">@{userConfig.username}</div>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-1 row-span-1 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl p-8 flex flex-col justify-between group hover:border-[#5eead4]/30 transition-all shadow-xl">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 flex justify-between items-center">
            <span>Neural Metrics</span>
            <IoPulseOutline className="w-4 h-4" />
          </div>
          <div className="grid grid-cols-2 gap-6 mt-4">
            {stats.map(s => (
              <div key={s.label}>
                <div className="text-3xl font-black text-white tabular-nums tracking-tighter">{s.value}</div>
                <div className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1 md:col-span-1 row-span-1 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-[#5eead4]/30 transition-all shadow-xl">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6">System_Manifesto</div>
          <div className="text-sm leading-relaxed text-zinc-400 font-medium uppercase tracking-tight opacity-80 group-hover:opacity-100 transition-opacity">
            "{isSelf ? userConfig.bio : 'Synchronizing all signals and cultural resonance across the local network mesh.'}"
          </div>
        </div>

        <div className="col-span-1 md:col-span-1 row-span-1 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl p-0 overflow-hidden flex flex-col shadow-xl">
          <div className="p-5 border-b border-white/5 bg-white/[0.03] flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Signal Stream</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#5eead4] animate-pulse"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {recentSignals.map(s => (
              <div key={s.id} className="text-xs border-l-2 border-white/5 pl-4 py-1 hover:border-[#5eead4]/50 transition-all group cursor-pointer">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-[#5eead4] text-[9px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">{formatTime(s.timestamp)}</div>
                </div>
                <div className="text-zinc-400 font-medium uppercase tracking-tighter line-clamp-2 group-hover:text-white transition-colors">{s.content}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1 md:col-span-3 row-span-1 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl p-6 overflow-hidden relative shadow-xl">
          <div className="absolute top-6 left-6 z-10 text-[10px] font-black uppercase tracking-[0.3em] text-white bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10">Visual Cortex</div>

          {profileMedia.length > 0 ? (
            <div className="w-full h-full flex gap-4 overflow-x-auto snap-x scrollbar-hide">
              {profileMedia.map((m) => (
                <div key={m.id} className="snap-center shrink-0 w-[240px] h-full relative rounded-2xl overflow-hidden border border-white/5 group bg-zinc-900 transition-all hover:border-[#5eead4]/30 shadow-2xl">
                  <img src={m.mediaUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" alt="Post" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-5">
                    <div className="text-xs font-black text-white uppercase tracking-tighter line-clamp-1">{m.caption}</div>
                    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1">{(Math.random() * 100).toFixed(0)}k Resonances</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center border border-dashed border-white/5 rounded-2xl">
              <div className="text-zinc-700 font-black text-[10px] uppercase tracking-[0.4em]">No Visual Signals Detected</div>
            </div>
          )}
        </div>

        <div className="col-span-1 md:col-span-2 row-span-1 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl p-8 shadow-xl">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-8 flex items-center gap-3">
            <span>Neural Connections</span>
            <span className="bg-[#5eead4]/10 text-[#5eead4] px-2 py-0.5 rounded-lg text-[9px] font-black border border-[#5eead4]/20">{connections.length}</span>
          </div>

          <div className="grid grid-cols-4 gap-6">
            {connections.map(c => (
              <div key={c.id} className="flex flex-col items-center gap-3 group cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 group-hover:border-[#5eead4]/50 transition-all overflow-hidden flex items-center justify-center relative shadow-xl group-hover:scale-110">
                  <div className="text-xs font-black text-zinc-600 group-hover:text-white transition-colors uppercase tracking-widest">{c.name.substring(0, 2)}</div>
                </div>
                <div className="text-center min-w-0 w-full px-1">
                  <div className="text-[11px] font-black text-white uppercase tracking-tight truncate">{c.name}</div>
                  <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest truncate mt-0.5 opacity-60">{c.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 row-span-1 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl p-0 flex flex-col shadow-xl">
          <div className="p-5 border-b border-white/5 bg-white/[0.03] flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Feedback Transmissions</span>
            <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[9px] font-black rounded-lg border border-indigo-500/20 animate-pulse uppercase tracking-widest">{interactions.length} INCOMING</div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {interactions.map(i => (
              <div key={i.id} className="bg-black/40 border border-white/5 p-4 rounded-2xl hover:border-[#5eead4]/30 transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-black text-zinc-500 uppercase tracking-widest">{i.author.substring(0, 2)}</div>
                    <div>
                      <div className="text-xs font-black text-white uppercase tracking-tight leading-none">{i.author}</div>
                      <div className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] mt-1">{i.postTitle}</div>
                    </div>
                  </div>
                  <div className="text-[9px] font-mono text-zinc-600">{formatTime(i.timestamp)}</div>
                </div>
                <p className="text-zinc-400 text-xs font-medium leading-relaxed uppercase tracking-tight pl-11">{i.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

const IoPulseOutline = (props: any) => (
    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4m4 0h10M7 12V5m4 7V3m4 9V7m4 5v-2"></path>
    </svg>
);



