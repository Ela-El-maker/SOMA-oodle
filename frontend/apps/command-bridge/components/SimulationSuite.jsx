/**
 * SimulationSuite.jsx
 *
 * Windowed simulation environment. SOMA and the user can spawn simulation
 * cards. Each card is a self-contained window with minimize/expand/close controls.
 *
 * Week 1: Market Sim (live synthetic price data, portfolio, trades)
 * Week 2: Code Sandbox, ASI Path Simulator
 * Week 3: C&C Game
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Code2, Brain, Swords, Plus, ChevronDown,
  Minimize2, Maximize2, X, Box, Cpu, Zap, RefreshCw,
  BarChart2, Activity
} from 'lucide-react';
import MarketSim from './simulations/MarketSim';

// ── Sim type registry ──────────────────────────────────────────────────────

const SIM_TYPES = {
  market: {
    id: 'market',
    label: 'Market Sim',
    description: 'Synthetic live market — trade, lose money, learn.',
    icon: TrendingUp,
    color: 'emerald',
    component: MarketSim,
    ready: true,
  },
  code: {
    id: 'code',
    label: 'Code Sandbox',
    description: 'Live JS/Python execution in a sandboxed SOMA shell.',
    icon: Code2,
    color: 'blue',
    component: null,
    ready: false,
  },
  asi_path: {
    id: 'asi_path',
    label: 'ASI Path',
    description: 'Simulate SOMA intelligence growth trajectories.',
    icon: Brain,
    color: 'fuchsia',
    component: null,
    ready: false,
  },
  cc: {
    id: 'cc',
    label: 'C&C Game',
    description: 'Command & control strategy — SOMA as adversary.',
    icon: Swords,
    color: 'red',
    component: null,
    ready: false,
  },
};

// ── ComingSoon placeholder ─────────────────────────────────────────────────

function ComingSoon({ type }) {
  const def = SIM_TYPES[type];
  const Icon = def.icon;
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-3">
      <Icon className={`w-10 h-10 text-${def.color}-500/30`} />
      <div className="text-zinc-400 font-semibold">{def.label}</div>
      <div className="text-zinc-600 text-[11px] max-w-xs">{def.description}</div>
      <span className="mt-2 text-[10px] px-3 py-1 rounded-full bg-zinc-800 text-zinc-500 border border-white/5 uppercase tracking-wider">Coming Soon</span>
    </div>
  );
}

// ── SimWindow wrapper ──────────────────────────────────────────────────────

function SimWindow({ sim, onClose, onToggleExpand, onToggleMinimize }) {
  const def = SIM_TYPES[sim.type];
  const Icon = def.icon;
  const Comp = def.component;
  const colorMap = {
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
    fuchsia: 'border-fuchsia-500/20 bg-fuchsia-500/5',
    red: 'border-red-500/20 bg-red-500/5',
  };
  const dotColor = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    fuchsia: 'bg-fuchsia-500',
    red: 'bg-red-500',
  };

  return (
    <div className={`flex flex-col rounded-xl border border-white/8 bg-[#0c0c0e] overflow-hidden shadow-2xl transition-all duration-200 ${
      sim.expanded ? 'col-span-2' : ''
    } ${sim.minimized ? 'max-h-10' : 'h-full'}`}>
      {/* Title bar */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${colorMap[def.color]} shrink-0 cursor-default select-none`}>
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor[def.color]} ${def.ready ? 'animate-pulse' : 'opacity-30'}`} />
        <Icon className={`w-3.5 h-3.5 text-${def.color}-400`} />
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">{sim.title}</span>
        {sim.spawnedBy === 'soma' && (
          <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 uppercase tracking-wider">
            SOMA
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onToggleMinimize}
            className="p-1 rounded hover:bg-white/10 text-zinc-600 hover:text-zinc-300 transition-colors"
            title={sim.minimized ? 'Restore' : 'Minimize'}
          >
            <Minimize2 className="w-3 h-3" />
          </button>
          <button
            onClick={onToggleExpand}
            className="p-1 rounded hover:bg-white/10 text-zinc-600 hover:text-zinc-300 transition-colors"
            title={sim.expanded ? 'Shrink' : 'Expand'}
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-rose-500/20 text-zinc-600 hover:text-rose-400 transition-colors"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!sim.minimized && (
        <div className="flex-1 overflow-hidden">
          {Comp ? <Comp simId={sim.id} expanded={sim.expanded} /> : <ComingSoon type={sim.type} />}
        </div>
      )}
    </div>
  );
}

// ── Launcher dropdown ──────────────────────────────────────────────────────

function SimLauncher({ onSpawn }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider transition-all"
      >
        <Plus className="w-3.5 h-3.5" />
        New Sim
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-[#111113] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {Object.values(SIM_TYPES).map(def => {
            const Icon = def.icon;
            return (
              <button
                key={def.id}
                onClick={() => { onSpawn(def.id); setOpen(false); }}
                className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0 ${
                  !def.ready ? 'opacity-40 cursor-not-allowed' : ''
                }`}
                disabled={!def.ready}
              >
                <Icon className={`w-4 h-4 mt-0.5 text-${def.color}-400 shrink-0`} />
                <div>
                  <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                    {def.label}
                    {!def.ready && <span className="text-[9px] text-zinc-600 normal-case font-normal">soon</span>}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-0.5 leading-snug">{def.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Click-outside to close */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}

// ── Main SimulationSuite ───────────────────────────────────────────────────

let _nextId = 1;

export default function SimulationSuite() {
  const [sims, setSims] = useState([]);
  const [somaMessage, setSomaMessage] = useState(null);

  // Listen for SOMA-spawned simulations from backend
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/soma/simulations');
        if (!res.ok) return;
        const data = await res.json();
        if (!data.pending?.length) return;
        for (const pending of data.pending) {
          spawnSim(pending.type, pending.title, 'soma');
        }
        // Acknowledge so SOMA doesn't re-spawn them
        await fetch('/api/soma/simulations/ack', { method: 'POST' });
      } catch {}
    };
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, []);

  const spawnSim = useCallback((type, title, spawnedBy = 'user') => {
    const def = SIM_TYPES[type];
    if (!def) return;
    const id = `sim-${_nextId++}`;
    setSims(prev => [...prev, {
      id,
      type,
      title: title || `${def.label} #${_nextId - 1}`,
      spawnedBy,
      minimized: false,
      expanded: false,
    }]);
    if (spawnedBy === 'soma') {
      setSomaMessage(`I spawned a ${def.label} — I wanted to explore something.`);
      setTimeout(() => setSomaMessage(null), 6000);
    }
  }, []);

  const closeSim = useCallback((id) => {
    setSims(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleExpand = useCallback((id) => {
    setSims(prev => prev.map(s => s.id === id ? { ...s, expanded: !s.expanded, minimized: false } : s));
  }, []);

  const toggleMinimize = useCallback((id) => {
    setSims(prev => prev.map(s => s.id === id ? { ...s, minimized: !s.minimized } : s));
  }, []);

  const totalReady = Object.values(SIM_TYPES).filter(d => d.ready).length;

  return (
    <div className="h-full flex flex-col bg-[#09090b] text-zinc-200">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <Box className="w-5 h-5 text-orange-400" />
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">SIMULATION SUITE</h2>
            <div className="text-[10px] text-zinc-600">
              {sims.length} running · {totalReady} sim type{totalReady !== 1 ? 's' : ''} available
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats pills */}
          <div className="hidden md:flex items-center gap-2">
            {Object.values(SIM_TYPES).map(def => {
              const Icon = def.icon;
              const count = sims.filter(s => s.type === def.id).length;
              return (
                <div key={def.id} className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-mono transition-all ${
                  count > 0
                    ? `bg-${def.color}-500/10 border-${def.color}-500/20 text-${def.color}-400`
                    : 'bg-zinc-900 border-white/5 text-zinc-600'
                }`}>
                  <Icon className="w-2.5 h-2.5" />
                  {count}
                </div>
              );
            })}
          </div>
          <SimLauncher onSpawn={spawnSim} />
        </div>
      </div>

      {/* SOMA message banner */}
      {somaMessage && (
        <div className="mx-5 mt-3 px-4 py-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-xs flex items-center gap-2 shrink-0">
          <Cpu className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
          <span><strong className="text-fuchsia-400">SOMA:</strong> {somaMessage}</span>
        </div>
      )}

      {/* Window grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {sims.length === 0 ? (
          <EmptyState onSpawn={spawnSim} />
        ) : (
          <div className={`grid gap-4 h-full ${
            sims.length === 1 ? 'grid-cols-1' :
            sims.filter(s => s.expanded).length > 0 ? 'grid-cols-2' :
            'grid-cols-2'
          }`} style={{ gridAutoRows: sims.some(s => s.minimized) ? 'auto' : '420px' }}>
            {sims.map(sim => (
              <SimWindow
                key={sim.id}
                sim={sim}
                onClose={() => closeSim(sim.id)}
                onToggleExpand={() => toggleExpand(sim.id)}
                onToggleMinimize={() => toggleMinimize(sim.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ onSpawn }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-6 px-8">
      <div className="relative">
        <Box className="w-16 h-16 text-orange-500/20" />
        <Activity className="w-5 h-5 text-orange-400/60 absolute bottom-0 right-0 animate-pulse" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-zinc-300 mb-2">SOMA's Sandbox</h3>
        <p className="text-sm text-zinc-600 max-w-sm leading-relaxed">
          Run simulations, test strategies, and let SOMA model futures.
          Each window is a live environment — market data, code execution, or autonomous play.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => onSpawn('market')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-sm font-semibold transition-all"
        >
          <TrendingUp className="w-4 h-4" />
          Open Market Sim
        </button>
        {Object.values(SIM_TYPES).filter(d => !d.ready).map(def => {
          const Icon = def.icon;
          return (
            <button
              key={def.id}
              disabled
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 text-zinc-600 text-sm font-semibold opacity-40 cursor-not-allowed`}
            >
              <Icon className="w-4 h-4" />
              {def.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-zinc-700">SOMA can also spawn simulations autonomously when she wants to explore something.</p>
    </div>
  );
}
