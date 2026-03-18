import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateOracleInsight = async (context: string) => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a cryptic but inspiring creative AI assistant living in a retro-futuristic dashboard. 
      Your user is a digital artist/developer.
      Based on this context: "${context}", generate a short, profound, or inspiring "oblique strategy" or creative prompt.
      Keep it under 30 words. Make it sound like a transmission from the future.
      Do not use quotes.`,
    });
    return response.text?.trim() || "Signal lost.";
  } catch (error) {
    console.error("Oracle Error:", error);
    return "Signal interrupted. Realigning creative matrix...";
  }
};

export const analyzeVibe = async () => {
   try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Give me a 3-word abstract aesthetic description for a high-tech portfolio dashboard. E.g., "Neon Glitch Silence" or "Velvet Void Echo".`,
    });
    return response.text?.trim() || "Static Void Null";
  } catch (error) {
    console.error("Vibe Error:", error);
    return "Static Void Null";
  }
}

export type ArtifactType = 'MYTH' | 'QUOTE' | 'CONCEPT';

export interface CreativeArtifact {
  type: ArtifactType;
  content: string;
  title?: string;
}

export const generateCreativeArtifact = async (userContext: any): Promise<CreativeArtifact> => {
  try {
    const ai = getClient();
    
    const contextString = `
      User Name: ${userContext.name || 'Unknown'}
      Role: ${userContext.role || 'Creator'}
      Bio: ${userContext.bio || ''}
      Manifesto/Philosophy: ${userContext.manifesto || ''}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        You are the "Creative Engine" of a personal dashboard. You are not a chatbot. You are a generative mirror.
        Read the user's context:
        ${contextString}

        Generate ONE creative artifact to inspire the user. 
        Choose randomly between these three types:
        1. MYTH: A 2-sentence micro-myth or fable that metaphorically reflects their identity.
        2. QUOTE: A stylized, profound aphorism in their voice. (Not generic motivation. Something artistic/cyberpunk).
        3. CONCEPT: A specific, avant-garde idea for a new visual project or dashboard widget they could build.

        Return valid JSON matching this schema:
        {
          "type": "MYTH" | "QUOTE" | "CONCEPT",
          "title": "A short 2-3 word cryptic title",
          "content": "The actual text content"
        }
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             type: { type: Type.STRING, enum: ['MYTH', 'QUOTE', 'CONCEPT'] },
             title: { type: Type.STRING },
             content: { type: Type.STRING }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    return json as CreativeArtifact;
  } catch (error) {
    console.error("Inspire Error:", error);
    return {
      type: 'QUOTE',
      title: 'SYSTEM GLITCH',
      content: 'The void stares back, but today it is silent. Try again.'
    };
  }
};

export const generateAvatar = async (userContext: any): Promise<string | null> => {
  try {
    const ai = getClient();
    
    const prompt = `
      Generate a cinematic, high-end digital profile avatar.
      
      User Context:
      Role: ${userContext.role || 'Futurist'}
      Bio/Vibe: ${userContext.bio || 'mysterious creator'}
      
      Visual Style: 
      Sleek, futuristic, slightly cyberpunk but elegant. 
      Professional yet artistic. 
      Deep shadows, volumetric lighting, glass/metal textures.
      Portrait composition, centered face.
      High resolution, 8k, photorealistic or high-end 3D render.
      No text in the image.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;

  } catch (error) {
    console.error("Avatar Gen Error:", error);
    return null;
  }
};

export const generateCoverImage = async (userContext: any): Promise<string | null> => {
  try {
    const ai = getClient();
    
    const prompt = `
      Generate a cinematic, high-end digital cover image / banner background.
      
      User Context:
      Role: ${userContext.role || 'Futurist'}
      Bio/Vibe: ${userContext.bio || 'mysterious creator'}
      
      Visual Style: 
      Wide aspect ratio.
      Abstract, atmospheric, cyberpunk, minimalist, or ethereal. 
      Suitable for a profile header background.
      High resolution, 8k.
      No text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9" 
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;

  } catch (error) {
    console.error("Cover Gen Error:", error);
    return null;
  }
};

export const chatWithAgent = async (message: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        You are "NOVA", an advanced AI agent managing a creator's ecosystem hub called "Studio".
        The user is asking you something.
        Keep your response extremely short (under 20 words).
        Tone: Efficient, slightly robotic but helpful, cyberpunk.
        User message: "${message}"
      `,
    });
    return response.text?.trim() || "System processing...";
  } catch (error) {
    console.error("Agent Chat Error:", error);
    return "Connection unstable.";
  }
};



