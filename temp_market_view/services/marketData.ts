import { MarketPoint } from '../types';

// --- SIMULATION ENGINE ---
const VOLATILITY_BASE = 2;
const MOMENTUM_FACTOR = 0.95;

let currentPrice = 1000;
let currentMomentum = 0;
let timeStep = 0;

export const generateNextTick = (lastPoint?: MarketPoint): MarketPoint => {
  timeStep++;
  const noise = (Math.random() - 0.5) * VOLATILITY_BASE;
  const regimeShift = (Math.random() - 0.5) * 0.1; 
  currentMomentum = (currentMomentum * MOMENTUM_FACTOR) + noise + regimeShift;
  const open = lastPoint ? lastPoint.close : currentPrice;
  currentPrice = open + currentMomentum;
  const volatility = Math.abs(currentMomentum) + Math.random() * 2;
  const volume = Math.floor(Math.abs(currentMomentum) * 1000 + Math.random() * 500);

  return {
    time: Date.now(),
    open,
    high: Math.max(open, currentPrice) + Math.random() * volatility,
    low: Math.min(open, currentPrice) - Math.random() * volatility,
    close: currentPrice,
    volume,
    momentum: currentMomentum
  };
};

export const generateHistory = (count: number, startPrice: number = 1000): MarketPoint[] => {
  currentPrice = startPrice;
  currentMomentum = 0; // Reset momentum on new history generation
  const history: MarketPoint[] = [];
  let lastPoint: MarketPoint | undefined = undefined;
  for (let i = 0; i < count; i++) {
    const point = generateNextTick(lastPoint);
    point.time = Date.now() - (count - i) * 1000; 
    history.push(point);
    lastPoint = point;
  }
  return history;
};

// --- SERVICE HOOKS (MOCKED FOR DEVELOPMENT) ---

// Mocks for different asset price ranges
const MOCK_ASSETS: Record<string, number> = {
    'btcusdt': 96500,
    'ethusdt': 3650,
    'solusdt': 240,
    'xrpusdt': 2.5,
    'simulation': 1000
};

export const getHistoricalData = async (symbol: string): Promise<MarketPoint[]> => {
  // TODO: Implement real REST API fetch
  /*
  const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1s&limit=1000`);
  ... return parsed data
  */
  
  console.log(`[MockService] Fetching history for ${symbol}`);
  const startPrice = MOCK_ASSETS[symbol.toLowerCase()] || 1000;
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return generateHistory(1000, startPrice); // Return significant history
};

type TickCallback = (point: MarketPoint) => void;

export class MarketStream {
  private symbol: string;
  private onTick: TickCallback;
  private intervalId: any;

  constructor(symbol: string, onTick: TickCallback) {
    this.symbol = symbol;
    this.onTick = onTick;
    this.connect();
  }

  private connect() {
    // TODO: Implement real WebSocket connection
    /*
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${this.symbol}@kline_1s`);
    ...
    */

    console.log(`[MockService] Stream connected for ${this.symbol}`);
    
    // Simulate live ticks using the generator
    this.intervalId = setInterval(() => {
        const point = generateNextTick();
        this.onTick(point);
    }, 1000);
  }

  public close() {
    if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
    }
    console.log(`[MockService] Stream closed`);
  }
}