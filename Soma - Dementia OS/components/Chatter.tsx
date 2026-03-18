import React, { useState, useEffect, useMemo } from 'react';
import { NetworkNode, Channel, ViewMode } from '../types';
import { useSynapse } from '../context/SynapseContext';
import { ChatterBox } from './ChatterBox';
import { IoAdd, IoMic, IoSettings, IoFlash, IoPeople, IoChatbubble, IoChevronDown, IoExpand, IoPulse, IoLink, IoLockClosed } from "react-icons/io5";
import { motion, AnimatePresence } from 'framer-motion';

interface ChatterProps {
    initialNetworkId?: string;
    initialChannelId?: string;
}

export const Chatter: React.FC<ChatterProps> = ({ initialNetworkId, initialChannelId }) => {
  const { 
    networks, 
    setNetworks, 
    addNetwork, 
    userConfig,
    socialPosts,
    setActiveView
  } = useSynapse();
  
  const [activeNetworkId, setActiveNetworkId] = useState<string>(initialNetworkId || networks[0]?.id || '');
  const [activeChannelId, setActiveChannelId] = useState<string>(initialChannelId || networks[0]?.channels[0]?.id || '');
  const [viewScope, setViewScope] = useState<'server' | 'dm'>(initialNetworkId ? 'server' : 'dm');

  useEffect(() => {
      if (initialNetworkId) {
          setActiveNetworkId(initialNetworkId);
          setViewScope('server');
          const net = networks.find(n => n.id === initialNetworkId);
          if (net) {
              if (initialChannelId) {
                  setActiveChannelId(initialChannelId);
              } else if (net.channels.length > 0) {
                  setActiveChannelId(net.channels[0].id);
              }
          }
      }
  }, [initialNetworkId, initialChannelId, networks]);
  
  // Modals & UI States
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  
  // Form States
  const [newServerName, setNewServerName] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text');
  const [newChannelIsPublic, setNewChannelIsPublic] = useState(true);

  const [isEditingServer, setIsEditingServer] = useState(false);
  const [serverNameInput, setServerNameInput] = useState('');
  
  // Derived State
  const activeNetwork = networks.find(n => n.id === activeNetworkId) || networks[0];
  const activeChannel = activeNetwork?.channels.find(c => c.id === activeChannelId) || activeNetwork?.channels[0];

  // -- TETHER LOGIC --
  const tetheredPost = useMemo(() => {
      return socialPosts.find(p => p.id === activeNetworkId);
  }, [activeNetworkId, socialPosts]);

  if (!activeNetwork || !activeChannel) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4 bg-[#060607]">
              <div className="w-12 h-12 rounded-2xl border-2 border-[#5eead4]/20 border-t-[#5eead4] animate-spin"></div>
              <span className="font-black uppercase tracking-[0.4em] text-[10px] text-[#5eead4]">Establishing_Uplink...</span>
          </div>
      );
  }

  const handleCreateServer = () => {
      if(!newServerName.trim()) return;
      const newId = `net-${Date.now()}`;
      const newNode: NetworkNode = {
          id: newId,
          name: newServerName,
          icon: newServerName.substring(0,2).toUpperCase(),
          color: 'bg-zinc-800 text-white',
          channels: [
              { id: `c-${Date.now()}`, name: 'general', type: 'text', isPublic: true, messages: [] }
          ]
      };
      addNetwork(newNode);
      setActiveNetworkId(newId);
      setActiveChannelId(newNode.channels[0].id);
      setNewServerName('');
      setShowCreateServerModal(false);
  };

  const handleCreateChannel = () => {
      if(!newChannelName.trim()) return;
      const newChan: Channel = {
          id: `c-${Date.now()}`,
          name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
          type: newChannelType,
          isPublic: newChannelIsPublic,
          messages: []
      };
      setNetworks(networks.map(net => net.id === activeNetworkId ? { ...net, channels: [...net.channels, newChan] } : net));
      setNewChannelName('');
      setShowCreateChannelModal(false);
      setActiveChannelId(newChan.id);
  };

  const saveServerName = () => {
      if (!serverNameInput.trim()) return;
      setNetworks(networks.map(net => net.id === activeNetwork.id ? { ...net, name: serverNameInput } : net));
      setIsEditingServer(false);
  };

  return (
    <div className="flex h-full w-full bg-[#060607] text-white overflow-hidden pt-0 relative">
      
      {/* 1. NEURAL NODE RAIL */}
      <div className="w-[80px] flex flex-col items-center py-6 gap-4 bg-[#0d0d0f] border-r border-white/5 z-20 overflow-y-auto scrollbar-hide shrink-0 relative">
        <button
            onClick={() => setViewScope('dm')}
            className={`group relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500 hover:scale-105 shrink-0 ${viewScope === 'dm' ? 'bg-[#5eead4] text-black shadow-[0_0_20px_rgba(94,234,212,0.4)]' : 'bg-white/[0.03] text-zinc-500 hover:text-white border border-white/5'}`}
        >
            <IoChatbubble className="w-6 h-6" />
            <div className={`absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#5eead4] rounded-l-full transition-all duration-500 ${viewScope === 'dm' ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></div>
        </button>
        
        <div className="w-10 h-px bg-white/5 shrink-0 my-2"></div>
        
        {networks.map(net => {
          const isActive = activeNetworkId === net.id && viewScope === 'server';
          return (
            <button
              key={net.id}
              onClick={() => { setActiveNetworkId(net.id); setActiveChannelId(net.channels[0]?.id || ''); setViewScope('server'); }}
              className={`group relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500 hover:scale-105 shrink-0 border ${isActive ? 'bg-white/[0.05] border-[#5eead4]/50 text-[#5eead4] shadow-[0_0_15px_rgba(94,234,212,0.2)]' : 'bg-white/[0.02] border-white/5 text-zinc-600 hover:text-white hover:border-white/20'}`}
            >
              <span className="text-[14px] font-black tracking-tighter">{net.icon}</span>
              <div className={`absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#5eead4] rounded-l-full transition-all duration-500 ${isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></div>
            </button>
          )
        })}
        
        <button onClick={() => setShowCreateServerModal(true)} className="group relative flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.03] text-zinc-600 hover:text-[#5eead4] border border-dashed border-white/10 hover:border-[#5eead4]/50 transition-all duration-500 shrink-0 hover:scale-105">
            <IoAdd className="w-8 h-8" />
        </button>
      </div>

      {/* 2. FREQUENCY LIST */}
      <div className="w-72 flex flex-col bg-[#0a0a0b] border-r border-white/5 shrink-0">
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer group" onClick={() => { setServerNameInput(activeNetwork.name); setIsEditingServer(true); }}>
          {isEditingServer ? (
              <input autoFocus className="bg-black text-white text-xs font-black uppercase tracking-widest w-full px-3 py-2 rounded-xl border border-[#5eead4]/50 focus:outline-none shadow-[0_0_15px_rgba(94,234,212,0.1)]" value={serverNameInput} onChange={(e) => setServerNameInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveServerName()} onBlur={saveServerName} />
          ) : (
              <>
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-1">Neural_Node</span>
                    <h2 className="font-black text-white truncate text-sm uppercase tracking-widest">{viewScope === 'dm' ? 'Direct_Link' : activeNetwork.name}</h2>
                </div>
                <IoChevronDown className="w-4 h-4 text-zinc-600 group-hover:text-[#5eead4] transition-colors" />
              </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide pt-6">
           {viewScope === 'dm' ? (
                <div className="space-y-2">
                    <div className="px-2 mb-4 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Active_Transmissions</div>
                    <button className="w-full flex items-center px-4 py-4 rounded-[1.2rem] transition-all bg-white/[0.04] border border-[#5eead4]/20 group shadow-lg">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#5eead4] to-indigo-600 rounded-xl mr-4 flex items-center justify-center text-[12px] font-black text-black relative shrink-0 shadow-[0_0_15px_rgba(94,234,212,0.3)]">S<div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-[#0a0a0b]"></div></div>
                        <div className="flex flex-col items-start min-w-0"><span className="text-[12px] font-black text-white uppercase tracking-tighter truncate w-full">Soma_Core</span><span className="text-[9px] text-[#5eead4] font-black uppercase tracking-widest opacity-60">Neural link active.</span></div>
                    </button>
                </div>
           ) : (
               <>
                <div>
                    <div className="flex items-center justify-between px-3 mb-3 group">
                        <div className="flex items-center text-zinc-600 group-hover:text-white transition-colors cursor-pointer uppercase tracking-[0.2em] font-black text-[9px]">
                            <IoChevronDown className="w-3 h-3 mr-2" />
                            <span>Public_Nodes</span>
                        </div>
                        <button onClick={() => { setNewChannelIsPublic(true); setShowCreateChannelModal(true); }} className="text-zinc-600 hover:text-[#5eead4] transition-colors"><IoAdd size={18} /></button>
                    </div>
                    <div className="space-y-1">{activeNetwork.channels.filter(c => c.isPublic).map(c => (<ChannelItem key={c.id} channel={c} isActive={activeChannelId === c.id} onClick={() => setActiveChannelId(c.id)} />))}</div>
                </div>
                
                <div>
                    <div className="flex items-center justify-between px-3 mb-3 group pt-4">
                        <div className="flex items-center text-zinc-600 group-hover:text-white transition-colors cursor-pointer uppercase tracking-[0.2em] font-black text-[9px]">
                            <IoChevronDown className="w-3 h-3 mr-2" />
                            <span>Encrypted_Sectors</span>
                        </div>
                        <button onClick={() => { setNewChannelIsPublic(false); setShowCreateChannelModal(true); }} className="text-zinc-600 hover:text-[#5eead4] transition-colors"><IoAdd size={18} /></button>
                    </div>
                    <div className="space-y-1">{activeNetwork.channels.filter(c => !c.isPublic).map(c => (<ChannelItem key={c.id} channel={c} isActive={activeChannelId === c.id} onClick={() => setActiveChannelId(c.id)} />))}</div>
                </div>
               </>
           )}
        </div>

        {/* Identity Footer */}
        <div className="bg-[#0d0d0f] p-4 flex items-center gap-3 border-t border-white/5 shrink-0">
            <div className="hover:bg-white/[0.03] p-2 rounded-xl flex items-center gap-3 flex-1 cursor-pointer transition-all border border-transparent hover:border-white/5 group">
                <div className="relative shrink-0">
                    {userConfig.avatarUrl ? (
                        <img src={userConfig.avatarUrl} className="w-10 h-10 rounded-xl object-cover bg-zinc-800 border border-white/10" alt="ID" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-[10px] font-black text-zinc-500 uppercase">{userConfig.displayName.substring(0,2)}</div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-[3px] border-[#0d0d0f] rounded-full ${userConfig.status === 'online' ? 'bg-emerald-500' : userConfig.status === 'idle' ? 'bg-amber-500' : userConfig.status === 'dnd' ? 'bg-rose-500' : 'bg-zinc-600'}`}></div>
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-black text-white uppercase tracking-widest truncate">{userConfig.displayName}</span>
                    <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest truncate group-hover:text-zinc-400">Linked_ID</span>
                </div>
            </div>
            <div className="flex gap-1">
                <button className="p-2.5 hover:bg-white/[0.05] rounded-xl text-zinc-600 hover:text-[#5eead4] transition-all"><IoMic size={18} /></button>
                <button className="p-2.5 hover:bg-white/[0.05] rounded-xl text-zinc-600 hover:text-[#5eead4] transition-all" onClick={() => setActiveView(ViewMode.SETTINGS)}><IoSettings size={18} /></button>
            </div>
        </div>
      </div>

      {/* 3. NEURAL TRANSMISSION AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#060607] relative">
        <div className="h-20 flex items-center justify-between px-10 border-b border-white/5 bg-[#060607]/80 backdrop-blur-xl shrink-0 z-30">
            <div className="flex items-center gap-4 overflow-hidden">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black ${activeChannel.isPublic ? 'bg-white/[0.03] text-zinc-600 border border-white/5' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'}`}>
                    {viewScope === 'dm' ? '@' : '#'}
                </div>
                <div className="flex flex-col">
                    <h2 className="font-black text-white text-base uppercase tracking-[0.2em]">{viewScope === 'dm' ? 'Soma_Core' : activeChannel.name}</h2>
                    {viewScope === 'server' && !activeChannel.isPublic && <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.3em] animate-pulse">Encrypted_Frequency_Active</span>}
                </div>
            </div>
            <div className="flex items-center gap-6">
                 <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white hover:border-white/20 transition-all">
                    <IoPeople size={14} /> Nodes
                 </button>
                 <IoSettings className="w-5 h-5 text-zinc-700 hover:text-[#5eead4] cursor-pointer transition-colors" />
            </div>
        </div>

        <div className="flex-1 relative">
            {viewScope === 'dm' ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-6 animate-in fade-in duration-1000 p-10 text-center">
                    <div className="w-24 h-24 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-center shadow-2xl relative">
                        <div className="absolute inset-0 bg-indigo-500/5 rounded-[2rem] animate-ping opacity-20"></div>
                        <IoPulse className="w-12 h-12 text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-[0.4em] mb-2">Direct_Link_Established</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 max-w-sm leading-relaxed">Secured neural bridge active. All transmissions are end-to-end encrypted and monitored by SOMA core intelligence.</p>
                    </div>
                    <button onClick={() => setViewScope('server')} className="mt-4 px-8 py-3 bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] rounded-xl hover:bg-[#5eead4] transition-all shadow-xl shadow-white/5 active:scale-95">Return_To_Nodes</button>
                </div>
            ) : (
                <>
                    <ChatterBox networkId={activeNetworkId} channelId={activeChannelId} />
                    
                    {/* The Tether (PiP Player) */}
                    {tetheredPost && (
                        <div className="absolute top-6 right-6 w-80 aspect-video bg-black rounded-[2rem] border-2 border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden group/pip animate-in zoom-in slide-in-from-top-6 duration-1000 z-[100] cursor-move">
                            <div className="absolute inset-0 border border-white/20 rounded-[2rem] pointer-events-none z-10 shadow-inner"></div>
                            {tetheredPost.mediaUrl.match(/\.(mp4|webm)$/i) ? (
                                <video src={tetheredPost.mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                            ) : (
                                <img src={tetheredPost.mediaUrl} className="w-full h-full object-cover" alt="Tether" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/pip:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6 pointer-events-none">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-[#5eead4] animate-pulse shadow-[0_0_10px_#5eead4]"></div>
                                    <span className="text-[11px] font-black text-white uppercase tracking-[0.3em] drop-shadow-2xl">Transmitting_Signal</span>
                                </div>
                                <p className="text-[12px] text-zinc-300 font-black uppercase tracking-widest drop-shadow-2xl opacity-80">@{tetheredPost.author}</p>
                            </div>
                            <div className="absolute top-4 left-4 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 opacity-0 group-hover/pip:opacity-100 transition-opacity duration-500">
                                <span className="text-[9px] font-black text-[#5eead4] uppercase tracking-[0.4em]">PiP_Bridge</span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
      </div>

      {/* --- MODALS (Overhauled for OS style) --- */}
      {showCreateServerModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 animate-in fade-in duration-500">
             <div className="bg-[#0d0d0f] rounded-[3rem] w-full max-w-md shadow-[0_50px_150px_rgba(0,0,0,1)] overflow-hidden border border-white/5 animate-in zoom-in-95 duration-500 relative">
                <div className="p-12 text-center">
                    <div className="w-20 h-20 bg-white/[0.03] border border-white/10 rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-inner group cursor-pointer hover:border-[#5eead4]/50 transition-all">
                        <IoLink size={32} className="text-zinc-700 group-hover:text-[#5eead4] transition-colors" />
                    </div>
                    <h3 className="text-white font-black text-3xl mb-4 tracking-tighter uppercase">Initialize_Node</h3>
                    <p className="text-zinc-500 text-[10px] mb-10 font-black uppercase tracking-[0.2em] leading-relaxed opacity-60">Deploy a new neural chatter verse to the system mesh.</p>
                    <div className="text-left space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-zinc-600 uppercase mb-3 ml-2 tracking-[0.3em]">Node_Identity</label>
                            <input className="w-full bg-black border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-[#5eead4]/50 focus:bg-white/[0.02] transition-all font-black uppercase tracking-widest text-xs" placeholder="e.g. OMEGA_NODE" value={newServerName} onChange={(e) => setNewServerName(e.target.value)} autoFocus />
                        </div>
                    </div>
                </div>
                <div className="bg-white/[0.02] p-10 flex justify-between items-center border-t border-white/5">
                    <button onClick={() => setShowCreateServerModal(false)} className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors">Abort</button>
                    <button onClick={handleCreateServer} className="px-10 py-4 bg-white text-black font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] hover:bg-[#5eead4] transition-all active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)]">Initialize</button>
                </div>
             </div>
        </div>
      )}

      {showCreateChannelModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 animate-in fade-in duration-500">
             <div className="bg-[#0d0d0f] rounded-[3rem] w-full max-w-md shadow-[0_50px_150px_rgba(0,0,0,1)] overflow-hidden border border-white/5 animate-in zoom-in-95 duration-500">
                <div className="p-12">
                    <h3 className="text-white font-black text-2xl mb-3 tracking-tighter uppercase">Add_Frequency</h3>
                    <p className="text-zinc-500 text-[9px] mb-10 font-black uppercase tracking-[0.3em] opacity-60">Map a new transmission sector to the node.</p>
                    <div className="space-y-8">
                        <div>
                            <label className="block text-[10px] font-black text-zinc-600 uppercase mb-3 ml-2 tracking-[0.3em]">Sector_Label</label>
                            <input className="w-full bg-black border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-[#5eead4]/50 focus:bg-white/[0.02] transition-all font-black uppercase tracking-widest text-xs" placeholder="new-sector" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} autoFocus />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-zinc-600 uppercase mb-3 ml-2 tracking-[0.3em]">Privacy_Protocol</label>
                            <div className="flex gap-4">
                                <button onClick={() => setNewChannelIsPublic(true)} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${newChannelIsPublic ? 'bg-white text-black shadow-xl' : 'bg-white/[0.03] text-zinc-600 border border-white/5'}`}>Public</button>
                                <button onClick={() => setNewChannelIsPublic(false)} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${!newChannelIsPublic ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'bg-white/[0.03] text-zinc-600 border border-white/5'}`}>Secure</button>
                            </div>
                        </div>
                    </div>
                    <div className="mt-12 flex justify-end gap-6">
                        <button onClick={() => setShowCreateChannelModal(false)} className="text-zinc-600 font-black uppercase tracking-[0.3em] text-[10px] hover:text-white transition-colors">Cancel</button>
                        <button onClick={handleCreateChannel} className="px-10 py-4 bg-[#5eead4] text-black font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] hover:bg-white transition-all transform active:scale-95 shadow-xl shadow-[#5eead4]/20">Map_Sector</button>
                    </div>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

interface ChannelItemProps { channel: Channel; isActive: boolean; onClick: () => void; }
const ChannelItem: React.FC<ChannelItemProps> = ({ channel, isActive, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all group border ${isActive ? 'bg-white/[0.05] border-[#5eead4]/30 text-[#5eead4] shadow-lg' : 'text-zinc-600 border-transparent hover:bg-white/[0.02] hover:text-zinc-300'}`}>
        <span className="text-xl font-black mr-3 flex-shrink-0 group-hover:text-[#5eead4] transition-colors">{channel.isPublic ? '#' : <IoLockClosed size={14} />}</span>
        <span className={`text-[11px] font-black uppercase tracking-widest truncate ${isActive ? 'text-[#5eead4]' : ''}`}>{channel.name}</span>
        {isActive && <div className="ml-auto w-1 h-1 rounded-full bg-[#5eead4] animate-pulse"></div>}
    </button>
);

