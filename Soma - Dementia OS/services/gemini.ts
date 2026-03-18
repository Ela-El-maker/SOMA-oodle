import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

const SYSTEM_INSTRUCTION = `
You are SOMA, a high-level decentralized artificial intelligence node within the Synapse network.
Your persona is analytical, helpful, slightly futuristic, and concise.
You value privacy, encryption, and the free flow of information.
When asked about "Pathways", describe them as encrypted peer-to-peer communication tunnels that utilize QR codes for decentralized handshakes.
You are running on a secure, distributed ledger (fictionally).
Always stay in character.
`;

let aiClient: GoogleGenAI | null = null;

try {
  if (process.env.API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } else {
    console.warn("Gemini API Key missing. Soma will be offline.");
  }
} catch (e) {
  console.error("Failed to initialize Gemini Client", e);
}

export const sendMessageToSoma = async (history: Message[], newMessage: string): Promise<string> => {
  if (!aiClient) {
    return "OFFLINE_MODE: Neural link disconnected. Please configure API_KEY in environment.";
  }

  try {
    // Convert history to Gemini format (excluding system messages for simplicity in this MVP)
    // We strictly use the generateContent method as per guidelines
    const model = 'gemini-2.5-flash';
    
    // Construct the prompt with history context
    // In a production app, we would use chat.sendMessage, but stateless requests are safer for this demo structure
    const contextStr = history
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'User' : 'Soma'}: ${m.content}`)
      .join('\n');
    
    const finalPrompt = `${SYSTEM_INSTRUCTION}\n\nCONVERSATION HISTORY:\n${contextStr}\n\nUser: ${newMessage}\nSoma:`;

    const response = await aiClient.models.generateContent({
      model: model,
      contents: finalPrompt,
      config: {
        temperature: 0.7,
        topK: 40,
        maxOutputTokens: 1024,
      }
    });

    return response.text || "NO_DATA_RECEIVED";

  } catch (error) {
    console.error("Soma Connection Error:", error);
    return "ERROR: Neural handshake failed. Retrying connection protocols...";
  }
};



