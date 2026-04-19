/**
 * server/scrapers/SimulationEvaluator.js
 *
 * SOMA's autonomous strategy evolution engine.
 *
 * Runs thousands of accelerated strategy simulations across a large asset
 * universe (crypto, stocks, futures) and all protocol variants. Scores
 * each combination, promotes winners to the PROMETHEUS knowledge library
 * via KnowledgeCuratorArbiter, and maintains a graduated playbook that
 * Mission Control will eventually use as its starting configuration.
 *
 * This runs in background — the real-time zoo window is just one window
 * into what SOMA is doing. The evaluator never stops.
 *
 * Scoring:
 *   - Win rate (profitable trades / total)
 *   - Sharpe ratio (mean return / std dev of returns)
 *   - Max drawdown
 *   - Profit factor (gross profit / gross loss)
 *   - Composite score = winRate*0.35 + sharpe*0.35 + (1-maxDD)*0.2 + pf*0.1
 */

import { promises as fs } from 'fs';
import path from 'path';
import { getCachedMarketData, fetchHistoricalOHLCV } from './MarketDataScraper.js';

// ── Asset universe ─────────────────────────────────────────────────────────

const ASSETS = [
  // Crypto
  { id: 'BTC',  class: 'crypto',  base: 65000, vol: 0.018 },
  { id: 'ETH',  class: 'crypto',  base: 3200,  vol: 0.022 },
  { id: 'SOL',  class: 'crypto',  base: 142,   vol: 0.030 },
  { id: 'AVAX', class: 'crypto',  base: 38,    vol: 0.035 },
  { id: 'LINK', class: 'crypto',  base: 18,    vol: 0.038 },
  { id: 'DOT',  class: 'crypto',  base: 9,     vol: 0.040 },
  { id: 'UNI',  class: 'crypto',  base: 12,    vol: 0.042 },
  { id: 'AAVE', class: 'crypto',  base: 110,   vol: 0.036 },
  // Stocks
  { id: 'NVDA', class: 'stocks',  base: 875,   vol: 0.025 },
  { id: 'MSFT', class: 'stocks',  base: 420,   vol: 0.014 },
  { id: 'AAPL', class: 'stocks',  base: 192,   vol: 0.012 },
  { id: 'META', class: 'stocks',  base: 510,   vol: 0.022 },
  { id: 'GOOGL',class: 'stocks',  base: 175,   vol: 0.016 },
  { id: 'AMZN', class: 'stocks',  base: 195,   vol: 0.018 },
  { id: 'TSLA', class: 'stocks',  base: 175,   vol: 0.040 },
  { id: 'AMD',  class: 'stocks',  base: 170,   vol: 0.030 },
  // Futures
  { id: 'ES',   class: 'futures', base: 5280,  vol: 0.008 },
  { id: 'NQ',   class: 'futures', base: 18500, vol: 0.012 },
  { id: 'CL',   class: 'futures', base: 82,    vol: 0.020 },
  { id: 'GC',   class: 'futures', base: 2340,  vol: 0.009 },
  { id: 'SI',   class: 'futures', base: 28,    vol: 0.018 },
  { id: 'ZB',   class: 'futures', base: 115,   vol: 0.007 },
];

const PROTOCOLS = [
  { id: 'momentum',   sizePct: 0.15, minConf: 0.62, takeProfit: 0.025, stopLoss: 0.015 },
  { id: 'aggressive', sizePct: 0.22, minConf: 0.50, takeProfit: 0.035, stopLoss: 0.020 },
  { id: 'swing',      sizePct: 0.12, minConf: 0.70, takeProfit: 0.040, stopLoss: 0.025 },
  { id: 'defensive',  sizePct: 0.07, minConf: 0.80, takeProfit: 0.015, stopLoss: 0.008 },
  { id: 'scalp',      sizePct: 0.18, minConf: 0.55, takeProfit: 0.008, stopLoss: 0.005 },
  { id: 'trend',      sizePct: 0.14, minConf: 0.65, takeProfit: 0.060, stopLoss: 0.030 },
];

// ── Tiny synthetic engine ─────────────────────────────────────────────────

function gaussian(mean = 0, std = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function generatePriceSeries(asset, length = 300, anchorPrice = null, realOHLCV = null) {
  // If real historical data available, use actual closing prices
  if (realOHLCV && realOHLCV.length >= 30) {
    const closes = realOHLCV
      .map(r => r.close)
      .filter(p => p && p > 0);
    if (closes.length >= 30) return closes;
  }
  // Synthetic fallback — anchored to real price if available
  const start = anchorPrice || asset.base;
  const prices = [start];
  for (let i = 1; i < length; i++) {
    const prev = prices[prices.length - 1];
    prices.push(Math.max(0.01, prev * (1 + gaussian(0.00003, asset.vol))));
  }
  return prices;
}

function computeRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  const changes = prices.slice(-period - 1).map((p, i, arr) => i === 0 ? 0 : p - arr[i - 1]).slice(1);
  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? -c : 0);
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
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

function getSignal(prices) {
  const rsi = computeRSI(prices);
  const ma10 = computeMA(prices, 10);
  const ma20 = computeMA(prices, 20);
  const ma10prev = computeMA(prices.slice(0, -1), 10);
  const ma20prev = computeMA(prices.slice(0, -1), 20);
  const momentum = computeMomentum(prices);

  let bullScore = 0, bearScore = 0;
  if (rsi < 30) bullScore += 0.8;
  if (rsi > 70) bearScore += 0.7;
  if (ma10prev <= ma20prev && ma10 > ma20) bullScore += 0.75;
  if (ma10prev >= ma20prev && ma10 < ma20) bearScore += 0.75;
  if (momentum > 2) bullScore += 0.6;
  if (momentum < -2) bearScore += 0.6;

  const confidence = Math.max(bullScore, bearScore) / 1.5;
  const direction = bullScore > bearScore ? 'buy' : bearScore > bullScore ? 'sell' : 'hold';
  return { direction, confidence: Math.min(0.95, confidence) };
}

// ── Run a single episode ───────────────────────────────────────────────────
// Returns trade-level stats for scoring

function runEpisode(asset, protocol, anchorPrice = null, realOHLCV = null) {
  const prices = generatePriceSeries(asset, 500, anchorPrice, realOHLCV);
  let cash = 100000;
  let position = null;
  const trades = [];

  for (let i = 30; i < prices.length; i++) {
    const window = prices.slice(0, i + 1);
    const cur = prices[i];

    // Check exit
    if (position) {
      const pnlPct = (cur - position.entry) / position.entry * (position.side === 'long' ? 1 : -1);
      if (pnlPct >= protocol.takeProfit || pnlPct <= -protocol.stopLoss) {
        const realised = pnlPct * position.entry * position.qty;
        cash += position.qty * cur;
        trades.push({ entry: position.entry, exit: cur, side: position.side, pnl: realised, pnlPct });
        position = null;
      }
    }

    // Check entry (every 20 bars)
    if (!position && i % 20 === 0) {
      const { direction, confidence } = getSignal(window);
      if (direction !== 'hold' && confidence >= protocol.minConf) {
        const alloc = cash * protocol.sizePct;
        const qty = alloc / cur;
        cash -= alloc;
        position = { side: direction === 'buy' ? 'long' : 'short', entry: cur, qty };
      }
    }
  }

  // Close any open position at end
  if (position) {
    const cur = prices[prices.length - 1];
    const pnlPct = (cur - position.entry) / position.entry * (position.side === 'long' ? 1 : -1);
    const realised = pnlPct * position.entry * position.qty;
    cash += position.qty * cur;
    trades.push({ entry: position.entry, exit: cur, side: position.side, pnl: realised, pnlPct });
  }

  return { trades, finalCash: cash };
}

// ── Scoring ────────────────────────────────────────────────────────────────

function scoreRuns(allTrades) {
  if (!allTrades.length) return { score: 0, winRate: 0, sharpe: 0, maxDrawdown: 0, profitFactor: 1, totalPnL: 0 };

  const winRate = allTrades.filter(t => t.pnl > 0).length / allTrades.length;
  const returns = allTrades.map(t => t.pnlPct);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const sharpe = variance > 0 ? mean / Math.sqrt(variance) : 0;

  // Max drawdown from cumulative returns
  let peak = 100000, trough = 100000, equity = 100000, maxDD = 0;
  for (const t of allTrades) {
    equity += t.pnl;
    if (equity > peak) { peak = equity; trough = equity; }
    if (equity < trough) { trough = equity; maxDD = Math.max(maxDD, (peak - trough) / peak); }
  }

  const grossProfit = allTrades.filter(t => t.pnl > 0).reduce((a, t) => a + t.pnl, 0);
  const grossLoss = Math.abs(allTrades.filter(t => t.pnl < 0).reduce((a, t) => a + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 3 : 1;
  const totalPnL = allTrades.reduce((a, t) => a + t.pnl, 0);

  // Composite score
  const score = (
    winRate * 0.35 +
    Math.max(0, Math.min(1, (sharpe + 1) / 2)) * 0.35 +
    (1 - Math.min(1, maxDD)) * 0.20 +
    Math.min(1, profitFactor / 3) * 0.10
  );

  return { score, winRate, sharpe: +sharpe.toFixed(4), maxDrawdown: +maxDD.toFixed(4), profitFactor: +profitFactor.toFixed(2), totalPnL: +totalPnL.toFixed(2) };
}

// ── Evaluator class ────────────────────────────────────────────────────────

const LEDGER_PATH = path.join(process.cwd(), 'SOMA', 'strategy-ledger.json');
const PLAYBOOK_PATH = path.join(process.cwd(), 'SOMA', 'mission-control-playbook.json');
const GRADUATION_THRESHOLD = 0.70; // composite score to graduate to Mission Control
const EPISODES_TO_GRADUATE = 20;   // min episodes before eligible

export class SimulationEvaluator {
  constructor(opts = {}) {
    this.messageBroker = opts.messageBroker || null;
    this.knowledgeCurator = opts.knowledgeCurator || null;
    this._realHistory = new Map();   // assetId → OHLCV rows

    // All combos: asset × protocol
    this._combos = [];
    for (const asset of ASSETS) {
      for (const protocol of PROTOCOLS) {
        this._combos.push({ assetId: asset.id, protocolId: protocol.id, key: `${asset.id}::${protocol.id}` });
      }
    }

    // In-memory ledger: key → { episodes, allTrades, scores, graduated }
    this._ledger = {};
    this._playbook = [];
    this._running = false;
    this._batchSize = 8;    // combos evaluated per tick
    this._tickMs = 3000;    // ms between evaluation batches
    this._comboIdx = 0;     // round-robin pointer

    // Live status for frontend
    this._status = {
      totalEpisodes: 0,
      totalTrades: 0,
      graduated: 0,
      lastBatch: [],
      leaderboard: [],
      startedAt: Date.now(),
    };

    this._loadLedger();
    console.log(`[SimulationEvaluator] Strategy evaluation engine online — ${this._combos.length} combos queued`);
  }

  async _loadLedger() {
    try {
      const raw = await fs.readFile(LEDGER_PATH, 'utf8');
      this._ledger = JSON.parse(raw);
      const playRaw = await fs.readFile(PLAYBOOK_PATH, 'utf8');
      this._playbook = JSON.parse(playRaw);
      this._rebuildStatus();
      console.log(`[SimulationEvaluator] Loaded ledger: ${Object.keys(this._ledger).length} combos, ${this._playbook.length} graduated`);
    } catch {
      // Fresh start
    }
  }

  async _saveLedger() {
    try {
      await fs.mkdir(path.dirname(LEDGER_PATH), { recursive: true });
      await fs.writeFile(LEDGER_PATH, JSON.stringify(this._ledger, null, 2));
      await fs.writeFile(PLAYBOOK_PATH, JSON.stringify(this._playbook, null, 2));
    } catch (e) {
      console.warn('[SimulationEvaluator] Failed to save ledger:', e.message);
    }
  }

  _rebuildStatus() {
    const entries = Object.entries(this._ledger)
      .map(([key, v]) => ({ key, ...v.scores, episodes: v.episodes, trades: v.allTrades.length, assetId: v.assetId, protocolId: v.protocolId, graduated: v.graduated }))
      .sort((a, b) => b.score - a.score);

    this._status.leaderboard = entries.slice(0, 30);
    this._status.graduated = this._playbook.length;
    this._status.totalEpisodes = Object.values(this._ledger).reduce((a, v) => a + v.episodes, 0);
    this._status.totalTrades = Object.values(this._ledger).reduce((a, v) => a + v.allTrades.length, 0);
  }

  start() {
    if (this._running) return;
    this._running = true;
    // Pre-fetch real history for all assets in background
    this._prefetchHistory();
    this._tick();
    console.log('[SimulationEvaluator] Evaluation loop started');
  }

  async _prefetchHistory() {
    const assetIds = [...new Set(ASSETS.map(a => a.id))];
    console.log(`[SimulationEvaluator] Pre-fetching real OHLCV history for ${assetIds.length} assets...`);
    let fetched = 0;
    for (const assetId of assetIds) {
      if (!this._running) break;
      try {
        const rows = await fetchHistoricalOHLCV(assetId);
        if (rows?.length) {
          this._realHistory.set(assetId, rows);
          fetched++;
        }
      } catch {}
      // Stagger to avoid hammering yfinance
      await new Promise(r => setTimeout(r, 800));
    }
    console.log(`[SimulationEvaluator] Real history loaded for ${fetched}/${assetIds.length} assets`);
  }

  stop() {
    this._running = false;
  }

  _tick() {
    if (!this._running) return;
    try {
      this._runBatch();
    } catch (e) {
      console.warn('[SimulationEvaluator] Batch error:', e.message);
    }
    setTimeout(() => this._tick(), this._tickMs);
  }

  _runBatch() {
    // Get real anchor prices if available
    const realData = getCachedMarketData();
    const anchorPrices = {};
    if (realData?.crypto) {
      for (const [id, info] of Object.entries(realData.crypto)) {
        if (info?.price) anchorPrices[id] = info.price;
      }
    }
    if (realData?.stocks) {
      for (const [id, info] of Object.entries(realData.stocks)) {
        if (info?.price) anchorPrices[id] = info.price;
      }
    }
    if (realData?.futures) {
      for (const [id, info] of Object.entries(realData.futures)) {
        if (info?.price) anchorPrices[id] = info.price;
      }
    }

    // Use Thompson sampling: prefer under-explored combos but weight toward
    // high-scoring combos that haven't graduated yet
    const batch = this._selectBatch();
    const batchResults = [];

    for (const { assetId, protocolId, key } of batch) {
      const asset = ASSETS.find(a => a.id === assetId);
      const protocol = PROTOCOLS.find(p => p.id === protocolId);
      if (!asset || !protocol) continue;

      const anchorPrice = anchorPrices[assetId] || null;
      const realOHLCV = this._realHistory.get(assetId) || null;
      const { trades } = runEpisode(asset, protocol, anchorPrice, realOHLCV);

      // Accumulate into ledger
      if (!this._ledger[key]) {
        this._ledger[key] = { assetId, protocolId, episodes: 0, allTrades: [], scores: {}, graduated: false };
      }
      const entry = this._ledger[key];
      entry.episodes++;
      entry.allTrades.push(...trades);

      // Keep last 500 trades per combo to avoid unbounded memory
      if (entry.allTrades.length > 500) {
        entry.allTrades = entry.allTrades.slice(-500);
      }

      entry.scores = scoreRuns(entry.allTrades);
      batchResults.push({ key, assetId, protocolId, ...entry.scores, episodes: entry.episodes });

      // Check graduation
      if (!entry.graduated && entry.episodes >= EPISODES_TO_GRADUATE && entry.scores.score >= GRADUATION_THRESHOLD) {
        this._graduate(assetId, protocolId, entry);
      }
    }

    this._status.lastBatch = batchResults;
    this._rebuildStatus();

    // Save every 10 batches
    if (this._status.totalEpisodes % 10 === 0) {
      this._saveLedger().catch(() => {});
    }
  }

  _selectBatch() {
    const batch = [];
    const n = this._batchSize;

    // Mix: 50% exploration (round-robin), 50% exploitation (highest score, non-graduated)
    const exploitPool = Object.values(this._ledger)
      .filter(e => !e.graduated && e.episodes >= 5)
      .sort((a, b) => b.scores.score - a.scores.score)
      .slice(0, 20);

    for (let i = 0; i < n; i++) {
      if (i % 2 === 0 || exploitPool.length === 0) {
        // Explore: round-robin
        batch.push(this._combos[this._comboIdx % this._combos.length]);
        this._comboIdx++;
      } else {
        // Exploit: pick from top scorers with some randomness
        const pick = exploitPool[Math.floor(Math.random() * Math.min(5, exploitPool.length))];
        batch.push({ assetId: pick.assetId, protocolId: pick.protocolId, key: `${pick.assetId}::${pick.protocolId}` });
      }
    }

    return batch;
  }

  _graduate(assetId, protocolId, entry) {
    entry.graduated = true;

    const playbookEntry = {
      assetId,
      protocolId,
      assetClass: ASSETS.find(a => a.id === assetId)?.class,
      ...entry.scores,
      episodes: entry.episodes,
      trades: entry.allTrades.length,
      graduatedAt: Date.now(),
    };

    this._playbook.push(playbookEntry);
    this._playbook.sort((a, b) => b.score - a.score);

    console.log(`[SimulationEvaluator] GRADUATED: ${assetId} + ${protocolId} — score ${entry.scores.score.toFixed(3)}, winRate ${(entry.scores.winRate * 100).toFixed(1)}%`);

    // Publish to CNS
    if (this.messageBroker) {
      this.messageBroker.publish('simulation.strategy.graduated', playbookEntry).catch(() => {});
    }

    // File to PROMETHEUS knowledge library
    if (this.knowledgeCurator) {
      const content = [
        `**Asset:** ${assetId} (${ASSETS.find(a => a.id === assetId)?.class})`,
        `**Protocol:** ${protocolId}`,
        `**Win Rate:** ${(entry.scores.winRate * 100).toFixed(1)}%`,
        `**Sharpe Ratio:** ${entry.scores.sharpe}`,
        `**Max Drawdown:** ${(entry.scores.maxDrawdown * 100).toFixed(1)}%`,
        `**Profit Factor:** ${entry.scores.profitFactor}`,
        `**Composite Score:** ${entry.scores.score.toFixed(3)}`,
        `**Episodes:** ${entry.episodes} (${entry.allTrades.length} trades)`,
        `**Total P&L:** $${entry.scores.totalPnL.toFixed(2)}`,
        `**Status:** GRADUATED — ready for Mission Control deployment`,
      ].join('\n');

      this.knowledgeCurator.file('prometheus', 'strategy_validated', content, 'SimulationEvaluator')
        .catch(e => console.warn('[SimulationEvaluator] Knowledge filing failed:', e.message));
    }
  }

  getStatus() {
    return { ...this._status, combos: this._combos.length };
  }

  getPlaybook() {
    return this._playbook;
  }

  getLedger() {
    return Object.values(this._ledger)
      .map(e => ({ assetId: e.assetId, protocolId: e.protocolId, ...e.scores, episodes: e.episodes, trades: e.allTrades.length, graduated: e.graduated }))
      .sort((a, b) => b.score - a.score);
  }
}

export default SimulationEvaluator;
