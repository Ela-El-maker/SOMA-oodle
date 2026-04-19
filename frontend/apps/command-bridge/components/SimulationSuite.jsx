/**
 * SimulationSuite.jsx — SOMA's Autonomous Trading Simulation
 *
 * Zoo window. SOMA is the animal. You watch through the glass.
 * No user controls. SOMA picks the asset class, protocol, and asset.
 * She scans market data, her swarm agents debate, she decides, she trades.
 * All of this trains her for the real Mission Control trading system.
 *
 * Layout:
 *   [ SCANNER ] [ COGNITION ] [ TRADING VIEW ]
 *   SOMA's          SOMA's        SOMA's
 *   perception      thinking      actions
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity, Brain, TrendingUp, TrendingDown, Eye, Zap,
  BarChart2, Radio, Shield, Compass, Box, Cpu
} from 'lucide-react';

// ── Asset universe ─────────────────────────────────────────────────────────

const ASSET_CLASSES = {
  crypto:  { label: 'CRYPTO',  color: 'emerald', assets: [
    { id: 'BTC',  label: 'Bitcoin',   base: 65000, vol: 0.018 },
    { id: 'ETH',  label: 'Ethereum',  base: 3200,  vol: 0.022 },
    { id: 'SOL',  label: 'Solana',    base: 142,   vol: 0.030 },
    { id: 'AVAX', label: 'Avalanche', base: 38,    vol: 0.035 },
  ]},
  futures: { label: 'FUTURES', color: 'blue', assets: [
    { id: 'ES',   label: 'S&P 500 Futures',   base: 5280,  vol: 0.008 },
    { id: 'NQ',   label: 'Nasdaq Futures',    base: 18500, vol: 0.012 },
    { id: 'CL',   label: 'Crude Oil Futures', base: 82,    vol: 0.020 },
    { id: 'GC',   label: 'Gold Futures',      base: 2340,  vol: 0.009 },
  ]},
  stocks: { label: 'STOCKS',  color: 'fuchsia', assets: [
    { id: 'NVDA', label: 'NVIDIA',    base: 875,  vol: 0.025 },
    { id: 'MSFT', label: 'Microsoft', base: 420,  vol: 0.014 },
    { id: 'AAPL', label: 'Apple',     base: 192,  vol: 0.012 },
    { id: 'META', label: 'Meta',      base: 510,  vol: 0.022 },
  ]},
};

const PROTOCOLS = {
  aggressive: { label: 'AGGRESSIVE SWARM', sizePct: 0.22, minConf: 0.50, color: 'red',     desc: 'Max position size, high-frequency decisions, tight exits.' },
  momentum:   { label: 'MOMENTUM',         sizePct: 0.15, minConf: 0.62, color: 'emerald', desc: 'Rides trending moves. Enters on breakout confirmation.' },
  swing:      { label: 'SWING',            sizePct: 0.12, minConf: 0.70, color: 'blue',    desc: 'Longer holds. Waits for clean reversals and confluence.' },
  defensive:  { label: 'DEFENSIVE',        sizePct: 0.07, minConf: 0.80, color: 'amber',   desc: 'Low exposure. Only highest-confidence setups executed.' },
};

// ── Swarm agents ───────────────────────────────────────────────────────────

const AGENTS = {
  LOGOS:      { color: '#60a5fa', label: 'LOGOS',      role: 'Technical Analysis' },
  PROMETHEUS: { color: '#34d399', label: 'PROMETHEUS', role: 'Strategy & Momentum' },
  THALAMUS:   { color: '#fbbf24', label: 'THALAMUS',   role: 'Risk & Threat Detection' },
  AURORA:     { color: '#c084fc', label: 'AURORA',     role: 'Sentiment & Narrative' },
};

// ── Synthetic news headlines ───────────────────────────────────────────────

const NEWS_POOL = [
  'Fed minutes signal no rate cuts before Q3 — markets digest',
  'BTC ETF inflows hit $420M in 24h — institutional demand sustained',
  'Tech earnings beats drive NDX momentum into close',
  'Oil supply disruption risk elevated — geopolitical pressure in region',
  'Crypto exchange reports record derivatives volume',
  'NVDA raises guidance on AI data center demand',
  'Dollar index DXY breaks below 104 — risk-on conditions improving',
  'Gold breaks $2,350 resistance on safe-haven flows',
  'On-chain data: BTC long-term holder supply at 3-year high',
  'Options expiry Friday — max pain analysis points to $64K',
  'ETH validators increase — staking yield drops to 3.8%',
  'Emerging market funds rotate into US equities',
  'Crude inventories drop 4.2M barrels — above forecast draw',
  'SOL ecosystem TVL up 34% week-over-week',
  'Fed official: "Inflation trending in right direction"',
];

// ── Math utilities ─────────────────────────────────────────────────────────

function gaussian(mean = 0, std = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function computeRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  const changes = prices.slice(-period - 1).map((p, i, arr) => i === 0 ? 0 : p - arr[i - 1]).slice(1);
  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? -c : 0);
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function computeMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function computeMomentum(prices, period = 10) {
  if (prices.length < period + 1) return 0;
  const old = prices[prices.length - period - 1];
  const cur = prices[prices.length - 1];
  return ((cur - old) / old) * 100;
}

// ── Signal generator ───────────────────────────────────────────────────────

function analyzeSignals(prices, asset) {
  const rsi = computeRSI(prices);
  const ma10 = computeMA(prices, 10);
  const ma20 = computeMA(prices, 20);
  const momentum = computeMomentum(prices);
  const current = prices[prices.length - 1];
  const prevMa10 = computeMA(prices.slice(0, -1), 10);
  const prevMa20 = computeMA(prices.slice(0, -1), 20);
  const maCross = (prevMa10 <= prevMa20 && ma10 > ma20) ? 'bull' : (prevMa10 >= prevMa20 && ma10 < ma20) ? 'bear' : null;
  const signals = [];
  if (rsi > 70) signals.push({ type: 'RSI_OB', strength: 0.7, label: `RSI overbought (${rsi.toFixed(1)})`, direction: -1 });
  if (rsi < 30) signals.push({ type: 'RSI_OS', strength: 0.8, label: `RSI oversold (${rsi.toFixed(1)})`, direction: 1 });
  if (maCross === 'bull') signals.push({ type: 'MA_CROSS_BULL', strength: 0.75, label: 'MA(10) crossed above MA(20)', direction: 1 });
  if (maCross === 'bear') signals.push({ type: 'MA_CROSS_BEAR', strength: 0.75, label: 'MA(10) crossed below MA(20)', direction: -1 });
  if (Math.abs(momentum) > 2) signals.push({ type: 'MOMENTUM', strength: Math.min(0.9, Math.abs(momentum) / 5), label: `Momentum: ${momentum > 0 ? '+' : ''}${momentum.toFixed(2)}%`, direction: momentum > 0 ? 1 : -1 });
  return { rsi, ma10, ma20, momentum, current, signals };
}

// ── Debate generator ───────────────────────────────────────────────────────

function generateDebate(analysis, asset, protocol) {
  const { rsi, ma10, ma20, momentum, signals } = analysis;
  const bullSignals = signals.filter(s => s.direction > 0).length;
  const bearSignals = signals.filter(s => s.direction < 0).length;
  const dominant = bullSignals > bearSignals ? 'bull' : bearSignals > bullSignals ? 'bear' : 'neutral';
  const fmt = n => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(2)}`;
  const messages = [];

  // LOGOS: technical
  if (signals.find(s => s.type === 'MA_CROSS_BULL')) {
    messages.push({ agent: 'LOGOS', text: `MA(10)/${fmt(ma10)} crossed above MA(20)/${fmt(ma20)}. Trend confirmation. Volume consistent with breakout. Technical bias: LONG.` });
  } else if (signals.find(s => s.type === 'MA_CROSS_BEAR')) {
    messages.push({ agent: 'LOGOS', text: `MA(10) crossed below MA(20). Death cross forming. Downward pressure likely to persist. Technical bias: SHORT.` });
  } else if (rsi > 65) {
    messages.push({ agent: 'LOGOS', text: `RSI ${rsi.toFixed(1)} — approaching overbought. No crossover signal yet. Watching for exhaustion candle.` });
  } else if (rsi < 35) {
    messages.push({ agent: 'LOGOS', text: `RSI ${rsi.toFixed(1)} — oversold. Divergence possible. Mean-reversion setup developing.` });
  } else {
    messages.push({ agent: 'LOGOS', text: `Price ${fmt(analysis.current)} between MA(10)/${fmt(ma10)} and MA(20)/${fmt(ma20)}. No clean signal. Monitoring.` });
  }

  // PROMETHEUS: strategy
  if (dominant === 'bull' && Math.abs(momentum) > 1) {
    messages.push({ agent: 'PROMETHEUS', text: `Momentum ${momentum > 0 ? '+' : ''}${momentum.toFixed(2)}% supports entry here. Historical edge on this setup: ~2.1R. Aligns with ${protocol.label} protocol — recommend LONG with ${(protocol.sizePct * 100).toFixed(0)}% allocation.` });
  } else if (dominant === 'bear') {
    messages.push({ agent: 'PROMETHEUS', text: `Bearish signal confluence. Short setup if we can get entry near MA resistance. Risk/reward acceptable. Watch for retest before committing.` });
  } else {
    messages.push({ agent: 'PROMETHEUS', text: `Signal conflict. Neutral stance. ${protocol.label} protocol requires minimum ${(protocol.minConf * 100).toFixed(0)}% confidence — not there yet. Hold cash.` });
  }

  // THALAMUS: risk
  const riskScore = (rsi > 70 ? 30 : rsi < 30 ? 10 : 20) + (Math.abs(momentum) > 3 ? 20 : 10);
  messages.push({ agent: 'THALAMUS', text: `Risk score: ${riskScore}/100. ${rsi > 70 ? 'Overbought conditions increase reversal risk. Reduce size.' : rsi < 30 ? 'Oversold bounce likely but downtrend intact — stop required.' : 'Volatility nominal. Standard position sizing acceptable.'}${dominant !== 'neutral' ? ' Max loss tolerance: 2% of capital.' : ''}` });

  // AURORA: sentiment
  const sentiments = [
    'Market narrative is cautiously optimistic. Smart money flows suggest accumulation.',
    'Fear & Greed index elevated. Retail FOMO increasing — late-cycle warning.',
    'Sentiment neutral. No clear crowd positioning. Allows clean entry without fighting flow.',
    'Options market pricing elevated vol. Uncertainty suggests patience.',
    'Institutional positioning data aligns with bullish thesis — they\'re buying dips.',
  ];
  messages.push({ agent: 'AURORA', text: sentiments[Math.floor(Math.random() * sentiments.length)] });

  // Confidence calculation
  const votes = { buy: 0, sell: 0, hold: 0 };
  const conf = Math.min(0.95, 0.50 + bullSignals * 0.12 - bearSignals * 0.12 + (Math.abs(momentum) > 2 ? 0.08 : 0));
  let action = 'hold';
  if (dominant === 'bull' && conf >= protocol.minConf) action = 'buy';
  else if (dominant === 'bear' && conf >= protocol.minConf) action = 'sell';

  return { messages, action, confidence: conf, dominant };
}

// ── SparkLine SVG ──────────────────────────────────────────────────────────

function SparkLine({ data, width = 300, height = 80, up }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - ((v - min) / range) * (height - 6) - 3,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const fill = `${d} L${width},${height} L0,${height} Z`;
  const color = up ? '#10b981' : '#f43f5e';
  const id = `sg-${up ? 'u' : 'd'}`;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${id})`} />
      <path d={d} stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={color} />
    </svg>
  );
}

// ── Scanner Panel ──────────────────────────────────────────────────────────

function ScannerPanel({ assetClass, prices, signals, news, scanning, wsb, realDataTs }) {
  const def = ASSET_CLASSES[assetClass];
  if (!def) return null;

  const wsbBarWidth = wsb ? Math.round(wsb.sentiment * 100) : 50;
  const wsbColor = wsb?.sentiment > 0.6 ? 'emerald' : wsb?.sentiment < 0.4 ? 'rose' : 'amber';

  return (
    <div className="flex flex-col h-full border-r border-white/5 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2 shrink-0">
        <Eye className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">PERCEPTION</span>
        {realDataTs && (
          <span className="ml-auto text-[9px] text-emerald-500 font-mono">LIVE</span>
        )}
        {scanning && <span className={`${realDataTs ? '' : 'ml-auto'} flex items-center gap-1 text-[9px] text-emerald-400`}>
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />scanning
        </span>}
      </div>

      {/* Live tickers */}
      <div className="px-3 py-2 border-b border-white/5 shrink-0">
        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          Live Prices
          {realDataTs && <span className="text-emerald-600">· real</span>}
        </div>
        <div className="space-y-1">
          {def.assets.map(asset => {
            const px = prices[asset.id];
            if (!px || px.length < 2) return null;
            const cur = px[px.length - 1];
            const prev = px[0];
            const chg = ((cur - prev) / prev) * 100;
            const up = chg >= 0;
            return (
              <div key={asset.id} className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-zinc-400 w-10">{asset.id}</span>
                <span className="font-mono text-[11px] text-zinc-200">{cur >= 1000 ? `$${(cur / 1000).toFixed(2)}K` : `$${cur.toFixed(2)}`}</span>
                <span className={`font-mono text-[10px] ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {up ? '+' : ''}{chg.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* WSB sentiment */}
      {wsb && (
        <div className="px-3 py-2 border-b border-white/5 shrink-0">
          <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            r/WallStreetBets
            <span className={`ml-auto text-[9px] font-bold text-${wsbColor}-400`}>{wsb.sentimentLabel}</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1.5">
            <div
              className={`h-full bg-${wsbColor}-500 rounded-full transition-all duration-1000`}
              style={{ width: `${wsbBarWidth}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-zinc-600">
            <span>🐻 {wsb.bearCount} puts/short</span>
            <span>{wsb.bullCount} calls/moon 🚀</span>
          </div>
          {wsb.posts?.[0] && (
            <div className="mt-1.5 text-[9px] text-zinc-600 italic leading-snug border-t border-white/5 pt-1">
              Top post: "{wsb.posts[0].title.substring(0, 70)}{wsb.posts[0].title.length > 70 ? '…' : ''}"
            </div>
          )}
        </div>
      )}

      {/* Signals */}
      <div className="px-3 py-2 border-b border-white/5 shrink-0">
        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Signals Detected</div>
        <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
          {signals.length === 0
            ? <div className="text-[10px] text-zinc-700 italic">Scanning for signals...</div>
            : signals.slice(0, 8).map((s, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${s.direction > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-[10px] text-zinc-500 leading-tight">{s.assetId} — {s.label}</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* News feed */}
      <div className="px-3 py-2 flex-1 overflow-hidden min-h-0">
        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">News Feed</div>
        <div className="space-y-2 overflow-y-auto custom-scrollbar h-full">
          {news.slice(0, 10).map((n, i) => (
            <div key={i} className="text-[10px] leading-snug border-b border-white/5 pb-1.5 last:border-0">
              {n.source && <span className="text-zinc-700 font-bold mr-1">{n.source}</span>}
              <span className="text-zinc-600">{n.text || n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Cognition Panel ────────────────────────────────────────────────────────

function CognitionPanel({ debate, phase, protocol, decision }) {
  const endRef = useRef(null);
  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [debate]);

  return (
    <div className="flex flex-col h-full border-r border-white/5">
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
        <Brain className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">COGNITION</span>
        {phase === 'debating' && (
          <span className="ml-auto flex items-center gap-1 text-[9px] text-fuchsia-400">
            <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-pulse" />debating
          </span>
        )}
      </div>

      {/* Protocol */}
      {protocol && (
        <div className="px-3 py-2 border-b border-white/5">
          <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Active Protocol</div>
          <div className={`text-[10px] font-bold text-${protocol.color}-400`}>{protocol.label}</div>
          <div className="text-[9px] text-zinc-600 mt-0.5 leading-snug">{protocol.desc}</div>
        </div>
      )}

      {/* Debate scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-3">
        {debate.length === 0
          ? <div className="text-[10px] text-zinc-700 italic pt-2">Awaiting first debate cycle...</div>
          : debate.map((msg, i) => {
            const agent = AGENTS[msg.agent];
            return (
              <div key={i} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: agent.color }}>{agent.label}</span>
                  <span className="text-[9px] text-zinc-700">{agent.role}</span>
                </div>
                <div className="text-[10px] text-zinc-400 leading-snug pl-2 border-l border-white/10">{msg.text}</div>
              </div>
            );
          })
        }

        {/* Decision verdict */}
        {decision && (
          <div className={`mt-2 px-3 py-2 rounded-lg border ${
            decision.action === 'buy'  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            decision.action === 'sell' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
            'bg-zinc-800/60 border-white/10 text-zinc-400'
          }`}>
            <div className="text-[10px] font-bold uppercase tracking-wider">
              Verdict: {decision.action.toUpperCase()}
            </div>
            <div className="text-[9px] mt-0.5 opacity-70">
              Confidence {(decision.confidence * 100).toFixed(0)}% · {decision.action === 'hold' ? 'Threshold not met' : 'Executing order'}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ── Trading Panel ──────────────────────────────────────────────────────────

function TradingPanel({ asset, prices, position, trades, cash, sessionPnL, executing }) {
  if (!asset) return (
    <div className="flex items-center justify-center h-full text-zinc-700 text-xs">
      Awaiting asset selection...
    </div>
  );

  const px = prices[asset.id] || [];
  const current = px[px.length - 1] || asset.base;
  const open = px[0] || asset.base;
  const up = current >= open;
  const chg = ((current - open) / open) * 100;
  const posValue = position ? position.qty * current : 0;
  const posUnrealised = position ? (current - position.entry) * position.qty * (position.side === 'long' ? 1 : -1) : 0;
  const fmt = n => n >= 1000 ? `$${(n / 1000).toFixed(2)}K` : `$${n.toFixed(2)}`;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
        <BarChart2 className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TRADING VIEW</span>
        {executing && <span className="ml-auto flex items-center gap-1 text-[9px] text-amber-400"><Zap className="w-3 h-3" />executing</span>}
      </div>

      {/* Price header */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-xl font-mono font-bold text-white">{fmt(current)}</span>
          <span className={`text-xs font-mono font-bold flex items-center gap-0.5 ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {up ? '+' : ''}{chg.toFixed(2)}%
          </span>
          <span className="text-[10px] text-zinc-600 ml-1">{asset.label}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="px-3 pb-2">
        <SparkLine data={px} width={270} height={72} up={up} />
      </div>

      {/* Position */}
      <div className="px-3 py-2 border-y border-white/5 grid grid-cols-2 gap-x-4 gap-y-1">
        <div>
          <div className="text-[9px] text-zinc-600 uppercase tracking-wider">Cash</div>
          <div className="font-mono text-[11px] text-zinc-300">{fmt(cash)}</div>
        </div>
        <div>
          <div className="text-[9px] text-zinc-600 uppercase tracking-wider">Session P&L</div>
          <div className={`font-mono text-[11px] font-bold ${sessionPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {sessionPnL >= 0 ? '+' : ''}{fmt(sessionPnL)}
          </div>
        </div>
        {position ? (
          <>
            <div>
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider">Position</div>
              <div className="font-mono text-[11px] text-zinc-300 capitalize">{position.side} {position.qty.toFixed(4)} {asset.id}</div>
            </div>
            <div>
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider">Unrealised</div>
              <div className={`font-mono text-[11px] font-bold ${posUnrealised >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {posUnrealised >= 0 ? '+' : ''}{fmt(posUnrealised)}
              </div>
            </div>
          </>
        ) : (
          <div className="col-span-2 text-[10px] text-zinc-700">No open position</div>
        )}
      </div>

      {/* Trade log */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2">
        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Executed Trades</div>
        {trades.length === 0
          ? <div className="text-[10px] text-zinc-700 italic">No trades yet</div>
          : trades.slice(0, 12).map((t, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5 border-b border-white/5 last:border-0">
              <span className={`text-[9px] font-bold w-8 ${t.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>{t.side.toUpperCase()}</span>
              <span className="font-mono text-[10px] text-zinc-400">{t.qty.toFixed(4)} {t.assetId}</span>
              <span className="font-mono text-zinc-600 text-[9px] ml-auto">@ {fmt(t.price)}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── SOMA Autonomous Engine ─────────────────────────────────────────────────

const HISTORY_LEN = 80;
const PHASE_DURATIONS = { init: 4000, scanning: 12000, debating: 8000, deciding: 1500, executing: 2000, monitoring: 10000 };

export default function SimulationSuite() {
  const [phase, setPhase] = useState('init');
  const [assetClassKey, setAssetClassKey] = useState(null);
  const [protocolKey, setProtocolKey] = useState(null);
  const [activeAsset, setActiveAsset] = useState(null);
  const [prices, setPrices] = useState({});
  const [signals, setSignals] = useState([]);
  const [news, setNews] = useState([]);
  const [wsb, setWsb] = useState(null);
  const [realDataTs, setRealDataTs] = useState(null);
  const [debate, setDebate] = useState([]);
  const [decision, setDecision] = useState(null);
  const [position, setPosition] = useState(null);
  const [trades, setTrades] = useState([]);
  const [cash, setCash] = useState(100000);
  const [sessionPnL, setSessionPnL] = useState(0);
  const [initLog, setInitLog] = useState([]);
  const [debateTimer, setDebateTimer] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const pricesRef = useRef(prices);
  pricesRef.current = prices;
  const positionRef = useRef(position);
  positionRef.current = position;
  const cashRef = useRef(cash);
  cashRef.current = cash;
  const tradesRef = useRef(trades);
  tradesRef.current = trades;
  const sessionPnLRef = useRef(sessionPnL);
  sessionPnLRef.current = sessionPnL;

  // ── Initialise prices for an asset class ────────────────────────────────
  const initPrices = useCallback((classKey) => {
    const def = ASSET_CLASSES[classKey];
    const init = {};
    for (const asset of def.assets) {
      const arr = [asset.base];
      for (let i = 1; i < HISTORY_LEN; i++) {
        const prev = arr[arr.length - 1];
        arr.push(Math.max(0.01, prev * (1 + gaussian(0.00003, asset.vol * 0.4))));
      }
      init[asset.id] = arr;
    }
    return init;
  }, []);

  // ── Real market data polling (every 30s) ─────────────────────────────────
  const realDataRef = useRef(null);
  useEffect(() => {
    const fetchReal = async () => {
      try {
        const res = await fetch('/api/soma/simulations/market-data');
        if (!res.ok) return;
        const data = await res.json();
        realDataRef.current = data;
        setRealDataTs(data.timestamp || Date.now());

        // Inject real prices as anchors into current price history
        if (data.crypto) {
          setPrices(prev => {
            const next = { ...prev };
            for (const [id, info] of Object.entries(data.crypto)) {
              if (info?.price && next[id]?.length) {
                // Nudge last price toward real price smoothly
                const arr = [...next[id]];
                const realPrice = info.price;
                arr[arr.length - 1] = realPrice * (1 + gaussian(0, 0.001));
                next[id] = arr;
              }
            }
            return next;
          });
        }
        if (data.stocks) {
          setPrices(prev => {
            const next = { ...prev };
            for (const [id, info] of Object.entries(data.stocks)) {
              if (info?.price && next[id]?.length) {
                const arr = [...next[id]];
                arr[arr.length - 1] = info.price * (1 + gaussian(0, 0.001));
                next[id] = arr;
              }
            }
            return next;
          });
        }
        if (data.futures) {
          setPrices(prev => {
            const next = { ...prev };
            for (const [id, info] of Object.entries(data.futures)) {
              if (info?.price && next[id]?.length) {
                const arr = [...next[id]];
                arr[arr.length - 1] = info.price * (1 + gaussian(0, 0.001));
                next[id] = arr;
              }
            }
            return next;
          });
        }

        // Real news headlines
        if (data.news?.length) {
          setNews(data.news);
        }

        // WSB sentiment
        if (data.wsb) {
          setWsb(data.wsb);
        }
      } catch (e) {
        // silent — synthetic data continues
      }
    };

    fetchReal();
    const t = setInterval(fetchReal, 30_000);
    return () => clearInterval(t);
  }, []);

  // ── Price tick (runs always while a class is selected) ──────────────────
  useEffect(() => {
    if (!assetClassKey) return;
    const def = ASSET_CLASSES[assetClassKey];
    const t = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        for (const asset of def.assets) {
          const arr = next[asset.id] || [];
          const last = arr[arr.length - 1] || asset.base;
          const newPrice = Math.max(0.01, last * (1 + gaussian(0.00005, asset.vol)));
          next[asset.id] = [...arr.slice(-(HISTORY_LEN - 1)), newPrice];
        }
        return next;
      });
    }, 800);
    return () => clearInterval(t);
  }, [assetClassKey]);

  // ── Autonomous engine ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const delay = ms => new Promise(res => setTimeout(res, ms));

    const log = msg => { if (!cancelled) setInitLog(prev => [...prev.slice(-8), msg]); };

    const run = async () => {
      // ── INIT ──
      setPhase('init');
      log('Booting simulation engine...');
      await delay(800);

      // Pick asset class
      const classKeys = Object.keys(ASSET_CLASSES);
      const ck = classKeys[Math.floor(Math.random() * classKeys.length)];
      log(`Selecting asset class: ${ASSET_CLASSES[ck].label}...`);
      await delay(900);
      if (cancelled) return;
      setAssetClassKey(ck);
      setPrices(initPrices(ck));

      // Pick protocol
      const protoKeys = Object.keys(PROTOCOLS);
      const pk = protoKeys[Math.floor(Math.random() * protoKeys.length)];
      log(`Loading protocol: ${PROTOCOLS[pk].label}...`);
      await delay(900);
      if (cancelled) return;
      setProtocolKey(pk);

      // Pick active asset
      const assets = ASSET_CLASSES[ck].assets;
      const asset = assets[Math.floor(Math.random() * assets.length)];
      log(`Focusing on: ${asset.label} (${asset.id})`);
      await delay(800);
      if (cancelled) return;
      setActiveAsset(asset);

      // Seed news
      const shuffled = [...NEWS_POOL].sort(() => Math.random() - 0.5).slice(0, 8);
      setNews(shuffled);
      log('Market data streams connected. Beginning scan cycle.');
      await delay(600);

      // ── MAIN LOOP ──
      while (!cancelled) {
        // SCANNING
        setPhase('scanning');
        setDecision(null);
        setScanCount(c => c + 1);

        // Let prices accumulate for ~12s, detect signals
        await delay(4000);
        if (cancelled) break;

        // Compute signals on current prices
        const currentPrices = pricesRef.current;
        const allSignals = [];
        for (const a of ASSET_CLASSES[ck].assets) {
          const px = currentPrices[a.id];
          if (!px || px.length < 20) continue;
          const ana = analyzeSignals(px, a);
          for (const sig of ana.signals) {
            allSignals.push({ ...sig, assetId: a.id });
          }
        }
        if (!cancelled) setSignals(allSignals.slice(-12));

        // Rotate a news item
        const newHeadline = NEWS_POOL[Math.floor(Math.random() * NEWS_POOL.length)];
        if (!cancelled) setNews(prev => [newHeadline, ...prev.slice(0, 7)]);

        await delay(4000);
        if (cancelled) break;

        // Check if we should close existing position (exit logic)
        const pos = positionRef.current;
        if (pos) {
          const px = pricesRef.current[asset.id] || [];
          const cur = px[px.length - 1] || asset.base;
          const pnl = (cur - pos.entry) * pos.qty * (pos.side === 'long' ? 1 : -1);
          const pnlPct = pnl / (pos.entry * pos.qty);
          if (pnlPct > 0.025 || pnlPct < -0.015) {
            // Take profit or stop loss
            const exitSide = pos.side === 'long' ? 'sell' : 'buy';
            const proceeds = cur * pos.qty;
            if (!cancelled) {
              setCash(c => { const n = c + proceeds; cashRef.current = n; return n; });
              const realised = pnl;
              setSessionPnL(p => { const n = p + realised; sessionPnLRef.current = n; return n; });
              setTrades(t => {
                const n = [{ side: exitSide, qty: pos.qty, price: cur, assetId: asset.id, ts: Date.now(), realised }, ...t];
                tradesRef.current = n;
                return n;
              });
              setPosition(null);
              positionRef.current = null;
            }
          }
        }

        await delay(4000);
        if (cancelled) break;

        // DEBATING
        setPhase('debating');
        const px = pricesRef.current[asset.id] || [];
        const ana = analyzeSignals(px, asset);
        const proto = PROTOCOLS[pk];
        const { messages, action, confidence, dominant } = generateDebate(ana, asset, proto);

        // Stream debate messages one by one
        setDebate([]);
        for (const msg of messages) {
          if (cancelled) break;
          await delay(1800);
          if (!cancelled) setDebate(prev => [...prev.slice(-12), msg]);
        }

        // DECIDING
        if (cancelled) break;
        setPhase('deciding');
        const dec = { action, confidence, dominant };
        setDecision(dec);
        await delay(1500);

        // EXECUTING
        if (!cancelled && action !== 'hold' && !positionRef.current) {
          setPhase('executing');
          await delay(600);
          const curPx = pricesRef.current[asset.id] || [];
          const entryPrice = curPx[curPx.length - 1] || asset.base;
          const cash_ = cashRef.current;
          const allocPct = proto.sizePct;
          const allocCash = cash_ * allocPct;
          const qty = allocCash / entryPrice;
          const side = action === 'buy' ? 'long' : 'short';
          const newPos = { side, qty, entry: entryPrice, assetId: asset.id };
          if (!cancelled) {
            setCash(c => { const n = c - allocCash; cashRef.current = n; return n; });
            setPosition(newPos);
            positionRef.current = newPos;
            setTrades(t => {
              const n = [{ side: action, qty, price: entryPrice, assetId: asset.id, ts: Date.now() }, ...t];
              tradesRef.current = n;
              return n;
            });
          }
          await delay(1400);
        }

        // MONITORING
        if (!cancelled) {
          setPhase('monitoring');
          await delay(PHASE_DURATIONS.monitoring);
        }
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const assetClassDef = assetClassKey ? ASSET_CLASSES[assetClassKey] : null;
  const protocolDef = protocolKey ? PROTOCOLS[protocolKey] : null;
  const phaseColors = { init: 'zinc', scanning: 'emerald', debating: 'fuchsia', deciding: 'amber', executing: 'orange', monitoring: 'blue' };
  const phaseColor = phaseColors[phase] || 'zinc';

  return (
    <div className="h-full flex flex-col bg-[#09090b] text-zinc-200 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 shrink-0">
        <Box className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-bold text-white tracking-tight">SIMULATION SUITE</span>
        <span className="text-zinc-700 text-xs">·</span>
        <span className="text-[10px] text-zinc-600">SOMA autonomous — observation only</span>

        <div className="ml-auto flex items-center gap-2">
          {assetClassDef && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full bg-${assetClassDef.color}-500/10 text-${assetClassDef.color}-400 border border-${assetClassDef.color}-500/20 font-bold uppercase tracking-wider`}>
              {assetClassDef.label}
            </span>
          )}
          {protocolDef && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full bg-${protocolDef.color}-500/10 text-${protocolDef.color}-400 border border-${protocolDef.color}-500/20 font-bold uppercase tracking-wider`}>
              {protocolDef.label}
            </span>
          )}
          <span className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-${phaseColor}-500/10 text-${phaseColor}-400 border border-${phaseColor}-500/20 font-mono uppercase tracking-wider`}>
            <span className={`w-1.5 h-1.5 rounded-full bg-${phaseColor}-400 ${['scanning','debating','executing'].includes(phase) ? 'animate-pulse' : ''}`} />
            {phase}
          </span>
        </div>
      </div>

      {/* ── Init overlay ── */}
      {phase === 'init' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <Cpu className="w-10 h-10 text-orange-400/50 animate-pulse" />
          <div className="text-sm font-semibold text-zinc-400">SOMA initialising simulation...</div>
          <div className="w-72 space-y-1">
            {initLog.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-600 font-mono">
                <span className="text-emerald-500">›</span> {l}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3-panel layout ── */}
      {phase !== 'init' && (
        <div className="flex-1 grid grid-cols-3 overflow-hidden min-h-0">
          <ScannerPanel
            assetClass={assetClassKey}
            prices={prices}
            signals={signals}
            news={news}
            scanning={phase === 'scanning'}
            wsb={wsb}
            realDataTs={realDataTs}
          />
          <CognitionPanel
            debate={debate}
            phase={phase}
            protocol={protocolDef}
            decision={decision}
          />
          <TradingPanel
            asset={activeAsset}
            prices={prices}
            position={position}
            trades={trades}
            cash={cash}
            sessionPnL={sessionPnL}
            executing={phase === 'executing'}
          />
        </div>
      )}
    </div>
  );
}
