export interface MarketPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  momentum: number; // Calculated derivative
}

export type ViewMode = 'TERRAIN' | 'CANDLE';

export interface PredictionScenario {
  type: 'SAFE' | 'BREAKOUT' | 'AVERAGE' | 'DROP';
  data: number[];
}

export interface MarketAnalysis {
  atmosphere: string;
  poeticState: string;
  predictions?: PredictionScenario[];
}

export enum MarketTrend {
  EXPANSION = 'EXPANSION',
  CONTRACTION = 'CONTRACTION',
  STAGNATION = 'STAGNATION',
  TURBULENCE = 'TURBULENCE'
}