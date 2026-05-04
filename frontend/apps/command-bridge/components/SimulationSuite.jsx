import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Globe, Database, Code2, 
  ChevronRight, ChevronDown, FlaskConical, Brain, Swords, Zap, Radio
} from 'lucide-react';

/**
 * SimulationSuite.jsx — SOMA's Autonomous Trading & Research Simulation
 * VERIFICATION_ID: SOMA_UI_VERIFIED_V45
 */

// Biotech sim card body — real research status
function BiotechCardBody() {
  const [lab, setLab] = useState(null);
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/soma/biotech/status');
        if (r.ok) setLab(await r.json());
      } catch {}
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);
  
  if (!lab) return (
    <div className="flex flex-col items-center justify-center h-full gap-1.5 text-zinc-700">
      <FlaskConical className="w-6 h-6 opacity-15" />
      <span className="text-[10px]">Initialising lab...</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full p-2.5 gap-2">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Sovereign Lab</span>
        <span className={`flex items-center gap-1 text-[9px] font-mono text-emerald-400`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          active
        </span>
      </div>
      <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
        <div className="text-[9px] text-emerald-400 font-bold truncate">{lab.project || 'Initiative'}</div>
        <div className="text-[10px] text-zinc-300 font-mono text-[8px]">Target: {lab.target || 'None'}</div>
      </div>
      <div className="flex-1 flex flex-col justify-end min-h-0">
        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Poseidon Certainty</div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
            style={{ width: `${(lab.confidence || 0) * 100}%` }}
          />
        </div>
        <div className="mt-1 text-[9px] text-zinc-500 font-mono">{(lab.confidence || 0) * 100}% Poseidon Verified</div>
      </div>
    </div>
  );
}

// ── Medical Lab View (Full Screen) ──────────────────────────────────────────

function MedicalLabView() {
  const [lab, setLab] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('/api/soma/biotech/status');
        if (r.ok) {
            const data = await r.json();
            setLab(data);
            if (data.latestDiscovery) {
                setLogs(prev => [data.latestDiscovery, ...prev.slice(0, 19)]);
            }
        }
      } catch {}
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-5 bg-black/40">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <FlaskConical className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight italic">SOVEREIGN MEDICAL LAB</h2>
          <p className="text-xs text-emerald-500/60 font-medium tracking-widest uppercase">Modeling Reality · 99.9% Gate</p>
        </div>
        
        {lab && (
            <div className="ml-auto flex items-center gap-6">
                <div className="text-right">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Current Target</div>
                    <div className="text-sm font-mono font-bold text-white">{lab.target || '—'}</div>
                </div>
                <div className="w-48 text-right">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Poseidon Threshold</div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${(lab.confidence || 0) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-emerald-400 font-bold">{(lab.confidence || 0) * 100}%</span>
                    </div>
                </div>
            </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
        <div className="flex flex-col rounded-xl border border-emerald-500/20 bg-zinc-900/40 overflow-hidden">
          <div className="px-4 py-2 border-b border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2">
            <Brain className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Cognition Chamber</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {logs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-zinc-600 italic text-sm">
                    Awaiting 99.9% consensus...
                </div>
            ) : (
                logs.map((log, i) => (
                    <div key={i} className="p-4 rounded-lg bg-black/40 border border-white/5 animate-in slide-in-from-top duration-500 shadow-xl">
                        <div className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wide">🔱 {log.title}</div>
                        <div className="text-[11px] text-zinc-300 leading-relaxed font-mono">{log.synthesis}</div>
                        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                            <span className="text-[9px] text-zinc-600 font-mono tracking-tighter">Poseidon Integrity: {(log.integrity * 100).toFixed(1)}%</span>
                            <span className="text-[9px] text-zinc-500 italic">V2 Sovereign Ready</span>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-blue-500/20 bg-zinc-900/40 overflow-hidden">
          <div className="px-4 py-2 border-b border-blue-500/20 bg-blue-500/5 flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Live Research Ingestion</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 font-mono text-[9px] space-y-1">
            {lab?.activeTargets?.map(t => (
                <div key={t} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-default">
                    <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                    [MISSION] Scanning for {t} inhibitors...
                </div>
            ))}
            {lab?.lastQuery && (
                <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-blue-300/80 italic leading-snug">
                    <Zap className="w-3 h-3 mb-1 opacity-50" />
                    Active Pulse: "{lab.lastQuery}"
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SimulationSuite() {
  const [expandedId, setExpandedId] = useState(null);
  const [sims, setSims] = useState([
    { id: 'market',    type: 'market',    title: 'Market Simulation', spawnedBy: 'system' },
    { id: 'browser',   type: 'browser',   title: 'Web Browser',       spawnedBy: 'system' },
    { id: 'scraper',   type: 'scraper',   title: 'Data Scraper',      spawnedBy: 'system' },
    { id: 'code',      type: 'code',      title: 'Code Sandbox',      spawnedBy: 'system' },
    { id: 'biotech',   type: 'biotech',   title: 'Medical Lab',       spawnedBy: 'system' },
    { id: 'cc',        type: 'cc',        title: 'C&C Game',          spawnedBy: 'system' },
    { id: 'asi',       type: 'asi',       title: 'ASI Path',          spawnedBy: 'system' },
  ]);

  const handleExpand = (id) => setExpandedId(id);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0b] text-zinc-100 font-sans">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-900/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-fuchsia-500/10 border border-fuchsia-500/20">
            <TrendingUp className="w-4 h-4 text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">SIMULATION SUITE</h1>
            <p className="text-[10px] text-zinc-500 font-medium">Autonomous Reality Modeling V4.5</p>
          </div>
        </div>
        {expandedId && (
          <button 
            onClick={() => setExpandedId(null)}
            className="px-3 py-1 text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-all active:scale-95"
          >
            ← BACK TO SUITE
          </button>
        )}
      </div>

      {!expandedId && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
            {sims.map(sim => (
              <SimCard key={sim.id} sim={sim} onExpand={handleExpand} />
            ))}
          </div>
        </div>
      )}

      {expandedId === 'biotech' && <MedicalLabView />}
      {expandedId === 'market' && <div className="p-10 text-center text-zinc-500">Market Sim Active in background.</div>}
      {expandedId === 'code' && <div className="p-10 text-center text-zinc-500">Code Sandbox initializing...</div>}
    </div>
  );
}

function SimCard({ sim, onExpand }) {
  const COLORS = {
    market: { border:'border-orange-500/20', dot:'bg-orange-400', icon:'text-orange-400', hover:'hover:border-orange-500/50' },
    browser:{ border:'border-blue-500/20',   dot:'bg-blue-400',   icon:'text-blue-400',   hover:'hover:border-blue-500/50' },
    scraper:{ border:'border-emerald-500/20', dot:'bg-emerald-400',icon:'text-emerald-400',hover:'hover:border-emerald-500/50'},
    code:   { border:'border-fuchsia-500/20', dot:'bg-fuchsia-400',icon:'text-fuchsia-400',hover:'hover:border-fuchsia-500/50'},
    biotech:{ border:'border-emerald-500/20', dot:'bg-emerald-400',icon:'text-emerald-400',hover:'hover:border-emerald-500/50'},
    cc:     { border:'border-red-500/20',     dot:'bg-red-400',    icon:'text-red-400',    hover:'hover:border-red-500/50' },
    asi:    { border:'border-violet-500/20',  dot:'bg-violet-400', icon:'text-violet-400', hover:'hover:border-violet-500/50'},
  };
  const ICONS = { market: TrendingUp, browser: Globe, scraper: Database, code: Code2, cc: Swords, asi: Brain, biotech: FlaskConical };
  const c = COLORS[sim.type] || COLORS.asi;
  const Icon = ICONS[sim.type] || Brain;
  const isComingSoon = sim.type === 'cc' || sim.type === 'asi';

  return (
    <div 
      onClick={() => !isComingSoon && onExpand(sim.id)}
      className={`group relative flex flex-col h-48 rounded-xl border ${c.border} ${c.hover} bg-zinc-900/30 overflow-hidden transition-all duration-300 ${isComingSoon ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-zinc-900/50 active:scale-[0.98]'}`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-black/20 shrink-0">
        <div className={`w-1.5 h-1.5 rounded-full ${c.dot} ${isComingSoon ? 'opacity-30' : 'animate-pulse'}`} />
        <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
        <span className="text-[10px] font-bold text-zinc-200 uppercase tracking-widest">{sim.title}</span>
        {isComingSoon && <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-white/5 font-bold">SOON</span>}
      </div>
      <div className="flex-1 min-h-0">
        {sim.type === 'biotech' ? <BiotechCardBody /> : (
            <div className="p-4 flex items-center justify-center h-full text-zinc-700 italic text-[10px]">
                Active Simulation Module
            </div>
        )}
      </div>
    </div>
  );
}

export default SimulationSuite;
