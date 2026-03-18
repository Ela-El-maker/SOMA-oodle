import React from 'react';
import { useSynapse } from '../context/SynapseContext';
import { ViewMode } from '../types';
import { SomaLogo } from './SomaLogo';

export const Landing: React.FC = () => {
  const { setActiveView } = useSynapse();

  return (
    <div className="relative min-h-full w-full overflow-y-auto overflow-x-hidden">
      <div className="absolute inset-0 soma-landing-bg pointer-events-none"></div>
      <div className="absolute inset-0 soma-landing-grid opacity-40 pointer-events-none"></div>

      <div className="relative z-10 min-h-full w-full flex flex-col">
        <header className="flex items-center justify-between px-6 md:px-10 py-6 shrink-0">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-[var(--soma-accent)]">
              <SomaLogo className="w-10 h-10" glow />
            </div>
            <div className="leading-tight text-right">
              <div className="text-xs uppercase tracking-[0.4em] text-[var(--soma-accent)]/70">Soma</div>
              <div className="text-lg font-black text-white">Dementia OS</div>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-start py-12 md:py-20 px-6 md:px-10">
          <div className="max-w-4xl w-full">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[11px] uppercase tracking-[0.35em] text-[var(--soma-accent)]/80">
              Neural Interface Layer
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl font-black text-white leading-tight">
              A unified interface for cognition, memory, and signal flow.
            </h1>
            <p className="mt-6 text-base md:text-lg text-zinc-300 max-w-2xl">
              Soma is a modular intelligence surface. Orchestrate agents, explore knowledge graphs, and ship adaptive systems from one place.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setActiveView(ViewMode.SOMA)}
                className="px-6 py-3 rounded-xl bg-[var(--soma-accent)] text-black font-bold tracking-wide hover:bg-[var(--soma-accent)]/90 transition shadow-lg shadow-emerald-500/20"
              >
                Launch Core
              </button>
              <button
                onClick={() => setActiveView(ViewMode.FLUX)}
                className="px-6 py-3 rounded-xl border border-white/10 text-white/80 hover:text-white hover:border-white/30 transition"
              >
                Explore Signals
              </button>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'Cognitive Ops', desc: 'Live system telemetry and orchestration tools.' },
                { title: 'Signal Streams', desc: 'Social and broadcast layers tuned for clarity.' },
                { title: 'Memory Fabric', desc: 'Unified archive with recall and resonance.' }
              ].map((card) => (
                <div
                  key={card.title}
                  className="soma-card p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
                >
                  <div className="text-sm font-bold text-white">{card.title}</div>
                  <div className="mt-2 text-sm text-zinc-400">{card.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="soma-card p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
                <div className="text-xs uppercase tracking-widest text-[var(--soma-accent)]/80">Join The Network</div>
                <div className="text-2xl font-black text-white mt-2">Begin your journey</div>
                <div className="text-sm text-zinc-400 mt-2">
                  Development access. Accounts are local-only until backend auth ships.
                </div>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600" placeholder="Email" />
                  <input className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600" placeholder="Password" type="password" />
                </div>
                <button className="mt-4 w-full py-3 rounded-xl bg-[var(--soma-accent)] text-black font-bold uppercase tracking-widest text-xs">
                  Create Session
                </button>
              </div>
              <div className="soma-card p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Command Center</div>
                <div className="text-lg font-bold text-white mt-2">Unified OS dashboard</div>
                <div className="text-sm text-zinc-400 mt-2">
                  See mentions, replies, and system notifications across the entire ecosystem.
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  {['Mentions', 'Replies', 'Signals', 'Alerts'].map((item) => (
                    <div key={item} className="rounded-xl border border-white/10 bg-zinc-950/60 p-4">
                      <div className="text-zinc-500 uppercase tracking-widest">{item}</div>
                      <div className="text-white text-lg font-black mt-2">0</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-12 soma-card p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-[var(--soma-accent)]/80">Soma Analysis</div>
                  <div className="text-xl font-bold text-white mt-2">Suggested Minds</div>
                  <div className="text-sm text-zinc-400 mt-1">Based on your impact and interactions.</div>
                </div>
                <button className="px-4 py-2 rounded-full bg-[var(--soma-accent)] text-black text-xs font-bold uppercase tracking-widest">
                  Explore Minds
                </button>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'Signal Architects', desc: 'Systems, design, and ecosystem strategy.' },
                  { name: 'Neural Aesthetes', desc: 'Cultural curators and visual explorers.' },
                  { name: 'Logos Operators', desc: 'Research, analysis, and synthesis.' }
                ].map((mind) => (
                  <div key={mind.name} className="rounded-xl border border-white/10 bg-zinc-950/60 p-4">
                    <div className="text-white font-bold">{mind.name}</div>
                    <div className="text-xs text-zinc-500 mt-2">{mind.desc}</div>
                    <div className="mt-3 text-[10px] text-[var(--soma-accent)] uppercase tracking-widest">Recommended</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        <footer className="px-6 md:px-10 pb-8 text-xs text-zinc-500 flex items-center justify-between">
          <span>Synapse Layer v2</span>
          <span className="text-zinc-500">Secure by default</span>
        </footer>
      </div>
    </div>
  );
};



