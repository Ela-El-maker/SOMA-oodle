const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose safe APIs to the renderer process
 */
contextBridge.exposeInMainWorld('electron', {
    // Backend control
    getBackendStatus: () => ipcRenderer.invoke('get-backend-status'),
    restartBackend: () => ipcRenderer.invoke('restart-backend'),
    
    // SOMA info
    getSomaInfo: () => ipcRenderer.invoke('get-soma-info'),
    
    // Backend error listener
    onBackendError: (callback) => {
        ipcRenderer.on('backend-error', (event, data) => callback(data));
    },
    
    // Environment info
    isElectron: true,
    platform: process.platform
});

console.log('📋 Electron preload script loaded');
