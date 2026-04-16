const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (apiKey: string, remember: boolean) => 
    ipcRenderer.invoke('set-api-key', apiKey, remember),
  clearApiKey: () => ipcRenderer.invoke('clear-api-key'),
  getElevenLabsApiKey: () => ipcRenderer.invoke('get-elevenlabs-api-key'),
  getElevenLabsVoiceId: () => ipcRenderer.invoke('get-elevenlabs-voice-id'),
  setElevenLabsApiKey: (apiKey: string, remember: boolean) => 
    ipcRenderer.invoke('set-elevenlabs-api-key', apiKey, remember),
  clearElevenLabsApiKey: () => ipcRenderer.invoke('clear-elevenlabs-api-key'),
});
