import React, { useState } from 'react';
import { SomaChat } from './components/SomaChat';
import { Chatter } from './components/Chatter';
import { Fuse } from './components/Pathways';
import { BrainRot } from './components/BrainRot';
import { Flux } from './components/Flux';
import { Learn } from './components/Learn';
import { Studio } from './components/studio/Studio';
import { Landing } from './components/Landing';
import { Signal } from './components/Signal';
import { UnifiedNavigation } from './components/UnifiedNavigation';
import { ViewMode, UserStatus } from './types';
import { SynapseProvider, useSynapse } from './context/SynapseContext';

// -- Main App Component Wrapper for Context --
function App() {
  return (
    <SynapseProvider>
      <SynapseShell />
    </SynapseProvider>
  );
}

// -- Inner Shell Component --
function SynapseShell() {
  const { userConfig, updateUserConfig, activeView, setActiveView, setProfileFocus, chatterFocus, setChatterFocus, isSettingsOpen, toggleSettings, isSidebarOpen } = useSynapse();

  return (
    <div className="flex h-[100dvh] w-full bg-[var(--soma-bg)] text-gray-100 font-sans overflow-hidden selection:bg-white/20 relative touch-pan-y">

      {/* --- Global Dynamic Sidebar --- */}
      <UnifiedNavigation />

      {/* --- Main Content Area --- */}
      <div className={`flex-1 h-full w-full relative bg-[var(--soma-bg)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isSidebarOpen ? 'md:pl-[280px]' : 'pl-0'}`}>
        {activeView === ViewMode.LANDING && <Landing />}
        {activeView === ViewMode.SOMA && <SomaChat />}
        {activeView === ViewMode.CHATTER && (
          <Chatter 
            initialNetworkId={chatterFocus?.networkId} 
            initialChannelId={chatterFocus?.channelId} 
          />
        )}
        {activeView === ViewMode.FUSE && <Fuse />}
        {activeView === ViewMode.BRAINROT && <BrainRot />}
        {activeView === ViewMode.SIGNAL && <Signal />}
        {activeView === ViewMode.FLUX && <Flux />}
        {activeView === ViewMode.LEARN && <Learn />}
        {activeView === ViewMode.PROFILE && <Studio />}
      </div>

      {/* --- PROFLE / SETTINGS MODAL --- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-zinc-900 w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-[float_0.3s_ease-out] flex flex-col md:flex-row">

            {/* Sidebar */}
            <div className="w-full md:w-1/3 bg-zinc-950 border-r border-white/5 p-6 flex flex-col items-center text-center">
              <div className="relative group mb-4">
                {userConfig.avatarUrl ? (
                  <img src={userConfig.avatarUrl} className="w-24 h-24 rounded-full object-cover border-2 border-white/10 group-hover:border-white/30 transition-colors bg-zinc-900" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-bold text-zinc-500 border-2 border-white/10 group-hover:border-white/30 transition-colors">
                    {userConfig.displayName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => {/* avatar gen logic */}}
                  className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full shadow-lg hover:bg-blue-500 text-white transition-transform hover:scale-110"
                  title="Generate New ID"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{userConfig.displayName}</h2>
              <p className="text-zinc-500 text-sm mb-6">@{userConfig.username}</p>

              <div className="w-full space-y-2">
                <div className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-2 text-left w-full">Net Status</div>
                {(['online', 'idle', 'dnd', 'invisible'] as UserStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={() => updateUserConfig({ status })}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${userConfig.status === status ? 'bg-white/10 text-white' : 'text-zinc-500 hover:bg-white/5'
                      }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${status === 'online' ? 'bg-green-500' :
                      status === 'idle' ? 'bg-yellow-500' :
                        status === 'dnd' ? 'bg-red-500' : 'bg-zinc-600'
                      }`}></div>
                    <span className="capitalize text-sm">{status}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Form */}
            <div className="flex-1 p-6 md:p-8 bg-zinc-900 overflow-y-auto max-h-[80vh]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-white">Identity Configuration</h3>
                <button onClick={() => toggleSettings(false)} className="text-zinc-500 hover:text-white">✕</button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Display Name</label>
                    <input
                      type="text"
                      value={userConfig.displayName}
                      onChange={(e) => updateUserConfig({ displayName: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Handle</label>
                    <input
                      type="text"
                      value={userConfig.username}
                      onChange={(e) => updateUserConfig({ username: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Bio / Signature</label>
                  <textarea
                    rows={3}
                    value={userConfig.bio}
                    onChange={(e) => updateUserConfig({ bio: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                  />
                </div>

                <div className="border-t border-white/5 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">Privacy Shroud (Stealth)</div>
                      <div className="text-xs text-zinc-500">Auto-blur all encrypted data streams</div>
                    </div>
                    <button
                      onClick={() => updateUserConfig({ stealthMode: !userConfig.stealthMode })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${userConfig.stealthMode ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${userConfig.stealthMode ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-white/5">
                <button onClick={() => toggleSettings(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">Close</button>
                <button onClick={() => toggleSettings(false)} className="px-6 py-2 rounded-lg text-sm font-bold bg-white text-black hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;



