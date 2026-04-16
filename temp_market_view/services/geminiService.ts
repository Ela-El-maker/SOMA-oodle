import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MarketPoint, MarketAnalysis } from '../types';

const getClient = () => {
  // Safe access to process.env
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
  if (!apiKey) {
    console.warn("API Key missing in environment");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeMarketAtmosphere = async (data: MarketPoint[]): Promise<MarketAnalysis | null> => {
  const ai = getClient();
  if (!ai) return null;

  // Simplify data for token efficiency
  const recentData = data.slice(-50).map(p => ({
    c: p.close.toFixed(2),
    v: p.volume
  }));

  const prompt = `
    You are 'Market View', a cyberpunk market observer. 
    Analyze this sequence of market price data.
    1. Describe the "shape" and "weather" of the market terrain.
    2. PROJECT 4 distinct future scenarios (20 points each) based on the data.
       CRITICAL: Ensure the first point of every prediction is close to the last data point to avoid visual cliffs.
       - "SAFE": Low volatility, sideways/conservative movement.
       - "BREAKOUT": High volatility, upward aggressive extension.
       - "DROP": High volatility, downward crash or correction.
       - "AVERAGE": The most likely path based on current momentum.
    
    Use terms like: Ridge, Valley, Flow, Fracture, Tension, Bloom, Static, Void.
  `;

  // Define schema for strict JSON output
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      atmosphere: { 
        type: Type.STRING, 
        description: "A single uppercase word describing the vibe (e.g. ELECTRIC, DORMANT, FRACTURED)." 
      },
      poeticState: { 
        type: Type.STRING, 
        description: "A short, haiku-like sentence (max 15 words) describing the movement pattern visually." 
      },
      predictions: {
        type: Type.ARRAY,
        description: "Four distinct projected price paths: SAFE, BREAKOUT, DROP, and AVERAGE.",
        items: {
          type: Type.OBJECT,
          properties: {
             type: { type: Type.STRING, enum: ['SAFE', 'BREAKOUT', 'AVERAGE', 'DROP'] },
             data: { type: Type.ARRAY, items: { type: Type.NUMBER } }
          },
          required: ['type', 'data']
        }
      }
    },
    required: ["atmosphere", "poeticState", "predictions"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { text: prompt },
        { text: `DATA_PACKET: ${JSON.stringify(recentData)}` }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as MarketAnalysis;
  } catch (error) {
    console.error("Gemini interpretation failed:", error);
    return null;
  }
};