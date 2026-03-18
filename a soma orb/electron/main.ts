const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const fs = require('fs');

// __dirname is automatically available in CommonJS

// Initialize electron-store for persistent settings
const store = new Store();

// Load env vars from a file path
function parseEnvFile(filePath: string): Record<string, string> {
  try {
    if (fs.existsSync(filePath)) {
      const envContent = fs.readFileSync(filePath, 'utf8');
      const envVars: Record<string, string> = {};
      envContent.split('\n').forEach((line: string) => {
        // Skip comments and empty lines
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          envVars[match[1].trim()] = match[2].trim();
        }
      });
      return envVars;
    }
  } catch (error) {
    console.error(`Error loading env file ${filePath}:`, error);
  }
  return {};
}

// Load env vars: root SOMA .env first, then orb .env.local overrides
function loadEnvFile() {
  const rootEnv = parseEnvFile(path.join(__dirname, '../../.env'));       // SOMA root .env
  const localEnv = parseEnvFile(path.join(__dirname, '../.env.local'));   // Orb-level overrides
  return { ...rootEnv, ...localEnv };
}

const envVars = loadEnvFile();

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

// Determine if we're in development or production
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '../public/icon.png'), // Add an icon if you have one
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle permissions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'microphone' || permission === 'audioCapture') {
      callback(true); // Always allow media/microphone access
    } else {
      callback(false);
    }
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-api-key', async () => {
  let apiKey = store.get('geminiApiKey') as string | undefined;
  
  // If no API key is stored, prompt the user
  if (!apiKey && mainWindow) {
    const { response, checkboxChecked } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Enter API Key', 'Cancel'],
      defaultId: 0,
      title: 'Gemini API Key Required',
      message: 'Please enter your Gemini API key',
      detail: 'You can get your API key from https://ai.google.dev/',
      checkboxLabel: 'Remember this key',
      checkboxChecked: true,
    });

    if (response === 0) {
      // User clicked "Enter API Key" - we'll handle this through a renderer-side prompt
      return null;
    }
  }
  
  return apiKey || null;
});

ipcMain.handle('get-elevenlabs-api-key', async () => {
  // Try stored key first, then fall back to env
  let apiKey = store.get('elevenLabsApiKey') as string | undefined;
  if (!apiKey && envVars.ELEVENLABS_API_KEY) {
    apiKey = envVars.ELEVENLABS_API_KEY;
    console.log('Using ElevenLabs API key from .env.local');
  }
  return apiKey || null;
});

ipcMain.handle('get-elevenlabs-voice-id', async () => {
  // Try stored voice ID first, then fall back to env
  let voiceId = store.get('elevenLabsVoiceId') as string | undefined;
  if (!voiceId && envVars.ELEVENLABS_VOICE_ID) {
    voiceId = envVars.ELEVENLABS_VOICE_ID;
    console.log('Using ElevenLabs Voice ID from .env.local');
  }
  return voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default to Rachel (pre-made voice)
});

ipcMain.handle('set-elevenlabs-api-key', async (_event, apiKey: string, remember: boolean) => {
  if (remember) {
    store.set('elevenLabsApiKey', apiKey);
  }
  return true;
});

ipcMain.handle('clear-elevenlabs-api-key', async () => {
  store.delete('elevenLabsApiKey');
  return true;
});

ipcMain.handle('set-api-key', async (_event, apiKey: string, remember: boolean) => {
  if (remember) {
    store.set('geminiApiKey', apiKey);
  }
  return true;
});

ipcMain.handle('clear-api-key', async () => {
  store.delete('geminiApiKey');
  return true;
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle media permissions for microphone
app.on('ready', () => {
  // Request microphone access on startup (important for Windows)
  if (process.platform === 'win32') {
    app.setAsDefaultProtocolClient('gemini-orb');
  }
});
