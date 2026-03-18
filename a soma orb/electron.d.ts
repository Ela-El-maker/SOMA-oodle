export interface ElectronAPI {
  getApiKey: () => Promise<string | null>;
  setApiKey: (apiKey: string, remember: boolean) => Promise<boolean>;
  clearApiKey: () => Promise<boolean>;
  getElevenLabsApiKey: () => Promise<string | null>;
  getElevenLabsVoiceId: () => Promise<string | null>;
  setElevenLabsApiKey: (apiKey: string, remember: boolean) => Promise<boolean>;
  clearElevenLabsApiKey: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
