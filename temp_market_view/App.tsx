import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ViewMode, MarketPoint, MarketAnalysis, PredictionScenario } from './types';
import { MarketStream, getHistoricalData } from './services/marketData';
import { analyzeMarketAtmosphere } from './services/geminiService';
import TerrainView from './components/TerrainView';
import CandleView from './components/CandleView';
import { Activity, Zap, Eye, BarChart2, Wifi, WifiOff, Globe, Cpu, Layers, Maximize2, ZapOff } from 'lucide-react';

const MAX_HISTORY = 2000; 

// --- FALLBACK ANALYSIS ENGINE ---
const generateFallbackAnalysis = (data: MarketPoint[]): MarketAnalysis => {
  const recent = data.slice(-30);
  if (recent.length < 2) return { atmosphere: "INITIALIZING", poeticState: "System warming up.", predictions: [] };

  const start = recent[0].close;
  const lastPoint = recent[recent.length - 1];
  const currentClose = lastPoint.close;
  
  // Calculate relative changes (percentages) to be asset-agnostic
  const changeAbs = currentClose - start;
  const changePct = (changeAbs / start) * 100; // Percentage change
  
  const volatilitySum = recent.reduce((acc, p) => acc + (p.high - p.low), 0);
  const avgVolatility = volatilitySum / recent.length;
  const volatilityPct = (avgVolatility / currentClose) * 100;

  // Momentum extraction
  const currentMomentum = lastPoint.momentum !== undefined 
    ? lastPoint.momentum 
    : (currentClose - recent[recent.length-2].close);
    
  const momentumPct = (currentMomentum / currentClose) * 1000; // Normalized momentum scale

  // Generator Helper with Organic Inertia
  const generateScenario = (volMod: number, momMult: number, driftBiasPct: number): number[] => {
      const path: number[] = [];
      let simPrice = currentClose;
      let m = currentMomentum; 
      
      // Base volatility derived from recent history
      const localVol = avgVolatility * volMod;

      for (let i = 0; i < 20; i++) {
         const noise = (Math.random() - 0.5) * localVol;
         const drift = currentClose * (driftBiasPct / 100);
         const targetM = (currentMomentum * momMult) + drift;
         m = (m * 0.85) + (targetM * 0.15) + (noise * 0.1);
         simPrice += m + noise;
         path.push(simPrice);
      }
      return path;
  };

  const predictions: PredictionScenario[] = [
      { type: 'SAFE', data: generateScenario(0.5, 0.2, 0) }, 
      { type: 'BREAKOUT', data: generateScenario(2.5, 1.5, Math.abs(momentumPct) * 0.2 + 0.1) }, 
      { type: 'DROP', data: generateScenario(3.0, 1.5, -Math.abs(momentumPct) * 0.2 - 0.1) }, 
      { type: 'AVERAGE', data: generateScenario(1.0, 1.0, 0) } 
  ];

  // Asset-Agnostic Cyberpunk Heuristics
  if (changePct > 0.3) return { atmosphere: "SURGE", poeticState: "Vertical acceleration detected; gravity is forgotten.", predictions };
  if (changePct < -0.3) return { atmosphere: "CASCADE", poeticState: "Structure failing; the floor dissolves into the void.", predictions };
  if (volatilityPct > 0.05) return { atmosphere: "TURBULENCE", poeticState: "Static noise overwhelms the signal clarity.", predictions };
  if (Math.abs(changePct) < 0.02) return { atmosphere: "STASIS", poeticState: "The horizon is flat and waiting for a pulse.", predictions };
  
  return { atmosphere: "DRIFT", poeticState: "Winds shifting slowly across the digital plains.", predictions };
};

// --- PARTICLE SYSTEM ---
const ParticleSystem = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      pulseSpeed: number;
      pulseOffset: number;
      colorType: 'magenta' | 'mint';
    }> = [];

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.floor((canvas.width * canvas.height) / 15000); 
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5,
          speedY: Math.random() * 0.2 + 0.05,
          speedX: (Math.random() - 0.5) * 0.1,
          opacity: Math.random() * 0.5 + 0.1,
          pulseSpeed: Math.random() * 0.02 + 0.005,
          pulseOffset: Math.random() * Math.PI * 2,
          colorType: Math.random() > 0.6 ? 'magenta' : 'mint' 
        });
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = Date.now() / 1000;

      particles.forEach(p => {
        p.y -= p.speedY;
        p.x += p.speedX;
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (p.x > canvas.width + 5) p.x = -5;
        if (p.x < -5) p.x = canvas.width + 5;
        const currentOpacity = p.opacity + Math.sin(time * p.pulseSpeed + p.pulseOffset) * 0.1;
        const color = p.colorType === 'magenta' 
            ? `rgba(217, 70, 239, ${Math.max(0, currentOpacity)})`
            : `rgba(0, 255, 157, ${Math.max(0, currentOpacity)})`;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.size > 1.2) {
            ctx.shadowBlur = 4;
            ctx.shadowColor = color;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', init);
    init();
    animate();
    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
};

export default function App() {
  const [activeAsset, setActiveAsset] = useState('btcusdt');
  const [data, setData] = useState<MarketPoint[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('TERRAIN');
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  // --- DATA STREAM HANDLING ---
  useEffect(() => {
    setData([]); // Clear data on switch
    setAnalysis(null);
    setIsConnected(false);

    let stream: MarketStream | null = null;
    let isMounted = true;

    const initData = async () => {
      // 1. Fetch History (Mocked Service)
      try {
          const history = await getHistoricalData(activeAsset);
          if (isMounted && history.length > 0) {
              setData(history);
          }
      } catch (e) {
          console.warn("History fetch failed:", e);
      }

      // 2. Connect Stream (Mocked Service)
      stream = new MarketStream(activeAsset, (point) => {
         if (!isMounted) return;
         setIsConnected(true);
         setData(prev => {
            const lastClose = prev.length > 0 ? prev[prev.length - 1].close : point.open;
            point.momentum = point.close - lastClose;
            
            const newHistory = [...prev, point];
            if (newHistory.length > MAX_HISTORY) newHistory.shift();
            return newHistory;
         });
      });
    };

    initData();

    return () => {
       isMounted = false;
       if (stream) stream.close();
    };
  }, [activeAsset]);

  // Dimension handling
  useEffect(() => {
    const updateDims = () => {
      if (containerRef.current) {
        setDims({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', updateDims);
    updateDims();
    setTimeout(updateDims, 100);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  // Analysis Handler
  const handleAnalyze = async () => {
    if (isThinking) return;
    setIsThinking(true);
    setAnalysis(null);
    
    let result = await analyzeMarketAtmosphere(data);
    if (!result) {
        // console.warn("Using local fallback analysis engine.");
        result = generateFallbackAnalysis(data);
    }
    setAnalysis(result);
    setIsThinking(false);
  };

  // Helper values
  const current = data[data.length - 1];
  const prev = data[data.length - 2];
  const isUp = current && prev ? current.close > prev.close : true;

  const renderView = () => {
      if (dims.width === 0) return null;
      switch(viewMode) {
          case 'TERRAIN': return <TerrainView data={data} width={dims.width} height={dims.height} predictions={analysis?.predictions} />;
          case 'CANDLE': return <CandleView data={data} width={dims.width} height={dims.height} predictions={analysis?.predictions} />;
          default: return <TerrainView data={data} width={dims.width} height={dims.height} predictions={analysis?.predictions} />;
      }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f0720] text-market-text font-sans selection:bg-market-up selection:text-white relative overflow-hidden">
      
      {/* BACKGROUND LAYERS */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e1b4b] via-[#0f0720] to-[#020617]" />
        <div className="absolute inset-0 opacity-[0.05]" 
          style={{ backgroundImage: 'linear-gradient(#ff00ff 1px, transparent 1px), linear-gradient(90deg, #ff00ff 1px, transparent 1px)', backgroundSize: '30px 30px' }} 
        />
        <div className="absolute inset-0 opacity-[0.07]" 
          style={{ backgroundImage: 'linear-gradient(#d946ef 1px, transparent 1px), linear-gradient(90deg, #d946ef 1px, transparent 1px)', backgroundSize: '150px 150px' }} 
        />
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
             style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, #000 1px, #000 3px)' }}
        />
        <div className="absolute inset-0 opacity-60"><ParticleSystem /></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)] opacity-80" />
      </div>

      {/* HEADER / HUD */}
      <header className="flex-none p-6 flex justify-between items-center z-10 bg-gradient-to-b from-[#0f0720] via-[#0f0720]/80 to-transparent backdrop-blur-[2px]">
        <div className="flex items-center gap-6">
          <div className={`p-2 rounded-full border border-slate-800/50 ${isUp ? 'bg-market-up/10 shadow-[0_0_15px_rgba(255,0,255,0.3)]' : 'bg-market-down/10 shadow-[0_0_15px_rgba(99,102,241,0.3)]'}`}>
            <Activity className={`w-6 h-6 ${isUp ? 'text-market-up' : 'text-market-down'} transition-colors duration-500`} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
               <h1 className="text-[10px] font-bold tracking-[0.3em] uppercase text-slate-500">Market View // System</h1>
               <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800">
                  {isConnected ? <Wifi className="w-3 h-3 text-green-500" /> : <WifiOff className="w-3 h-3 text-red-500" />}
                  <span className={`text-[9px] font-mono ${isConnected ? 'text-green-500' : 'text-red-500'}`}>{isConnected ? 'LINKED' : 'OFFLINE'}</span>
               </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-mono ${isUp ? 'text-market-up neon-glow-text' : 'text-market-down neon-glow-text'} transition-colors duration-300`}>
                 {current?.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '---'}
              </span>
              <span className="text-[10px] text-indigo-400/80 font-mono tracking-widest bg-indigo-950/20 px-1 py-0.5 rounded border border-indigo-900/30">
                MOCK_FEED
              </span>
            </div>
          </div>
        </div>
        
        {/* GEMINI TRIGGER */}
        <div className="hidden md:flex flex-col items-end">
           <button 
             onClick={handleAnalyze}
             disabled={isThinking || data.length < 10}
             className="group flex items-center gap-2 px-4 py-2 bg-slate-900/40 border border-slate-800/60 rounded-sm hover:border-market-up/50 transition-all mb-2 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Cpu className={`w-4 h-4 ${isThinking ? 'animate-pulse text-market-up' : 'text-slate-500 group-hover:text-market-up'}`} />
             <span className="text-[10px] tracking-wider font-mono uppercase text-slate-500 group-hover:text-white transition-colors">
               {isThinking ? 'Processing...' : 'Interpret Terrain'}
             </span>
           </button>
           
           {analysis && (
             <div className="text-right animate-in fade-in slide-in-from-top-2 duration-700">
               <div className="text-[10px] font-bold text-market-up tracking-[0.2em] uppercase mb-1 drop-shadow-[0_0_5px_rgba(255,0,255,0.5)]">
                 {analysis.atmosphere}
               </div>
               <div className="text-xs text-slate-400 italic max-w-xs leading-relaxed opacity-80 border-r-2 border-slate-800 pr-2">
                 "{analysis.poeticState}"
               </div>
             </div>
           )}
        </div>
      </header>

      {/* VISUALIZATION */}
      <main className="flex-grow relative overflow-hidden z-10" ref={containerRef}>
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${isUp ? 'opacity-20' : 'opacity-10'}`}>
           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] mix-blend-screen ${isUp ? 'bg-market-up/10' : 'bg-market-down/10'}`} />
        </div>

        {dims.width > 0 && data.length > 0 && (
          <div className="absolute inset-0 transition-opacity duration-500">
             {renderView()}
          </div>
        )}
        
        {data.length === 0 && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-50">
              <div className="flex flex-col items-center gap-4 text-slate-600 animate-in fade-in zoom-in duration-500">
                  <Globe className="w-12 h-12 text-indigo-500 animate-pulse" />
                  <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-mono tracking-widest text-indigo-300">ESTABLISHING UPLINK...</span>
                      <span className="text-[10px] text-slate-500 uppercase">Connecting to Neural Feed</span>
                  </div>
              </div>
           </div>
        )}

        {/* MODULAR LENS DECK */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#0f0720]/90 backdrop-blur-md p-1.5 rounded-full border border-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.8)] z-50 flex gap-1">
           <button 
             onClick={() => setViewMode('TERRAIN')} 
             className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'TERRAIN' ? 'bg-indigo-900/80 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
           >
             <Maximize2 className="w-3 h-3" />
             <span className="hidden sm:inline">Terrain</span>
           </button>
           <button 
             onClick={() => setViewMode('CANDLE')} 
             className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'CANDLE' ? 'bg-indigo-900/80 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
           >
             <BarChart2 className="w-3 h-3" />
             <span className="hidden sm:inline">Candle</span>
           </button>
        </div>
      </main>

      <footer className="flex-none p-4 flex justify-between items-center text-[9px] text-slate-600 font-mono uppercase tracking-[0.2em] z-10 border-t border-white/5 bg-[#0f0720]/50 backdrop-blur-sm">
         <div className="flex gap-4">
             <span>Vol: {current?.volume.toFixed(0) || 0}</span>
             <span>Freq: 1Hz</span>
         </div>
         <div className="flex gap-4">
            <span>Latency: 24ms</span>
            <span className="text-slate-600">Secure::Encrypted</span>
         </div>
      </footer>
    </div>
  );
}