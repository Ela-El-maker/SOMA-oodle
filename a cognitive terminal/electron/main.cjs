const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

// Polyfill File for undici/genai compatibility (fixes backend crash)
if (typeof global.File === 'undefined') {
  global.File = class File extends (require('buffer').Blob) {
    constructor(fileBits, fileName, options = {}) {
      super(fileBits, options);
      this.name = fileName;
      this.lastModified = options.lastModified || Date.now();
    }
  };
  console.log('✅ File polyfill applied for Gemini Live API compatibility');
}

// Backend server process
let backendProcess = null;
let mainWindow = null;

// Determine if running in dev or production
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const BACKEND_PORT = 3001;
const VITE_DEV_PORT = 3000;
const FRONTEND_URL = isDev ? `http://localhost:${VITE_DEV_PORT}` : `file://${path.join(__dirname, '../dist/index.html')}`;

// Vite dev server process
let viteProcess = null;

// Get SOMA root directory
const somaRoot = path.join(__dirname, '../..');

console.log('╔' + '═'.repeat(60) + '╗');
console.log('║' + ' '.repeat(17) + '⚡ COMMAND (CT) ⚡' + ' '.repeat(17) + '║');
console.log('╚' + '═'.repeat(60) + '\\n');
console.log(`Mode: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'}`);
console.log(`SOMA Root: ${somaRoot}`);
console.log(`Backend Port: ${BACKEND_PORT}`);
console.log(`Frontend URL: ${FRONTEND_URL}\n`);

/**
 * Start Vite dev server (development mode only)
 */
function startViteDevServer() {
    return new Promise((resolve, reject) => {
        if (!isDev) {
            resolve(); // Skip in production
            return;
        }
        
        console.log('🎨 Starting Vite dev server...');
        
        const { spawn } = require('child_process');
        
        viteProcess = spawn('npm', ['run', 'dev'], {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit',
            shell: true
        });
        
        viteProcess.on('error', (err) => {
            console.error('❌ Vite dev server error:', err);
            reject(err);
        });
        
        viteProcess.on('exit', (code) => {
            console.log(`🔴 Vite dev server exited with code ${code}`);
        });
        
        // Wait for Vite to be ready
        console.log('⏳ Waiting for Vite dev server to start...');
        setTimeout(() => {
            console.log('✅ Vite dev server started\n');
            resolve();
        }, 8000); // Vite needs more time to start
    });
}

/**
 * Start the backend Express server
 */
function startBackendServer() {
    return new Promise((resolve, reject) => {
        console.log('🔧 Starting backend server...');
        
        const serverScript = path.join(__dirname, '../server/index.cjs');
        
        // Check if server script exists
        if (!fs.existsSync(serverScript)) {
            console.error(`❌ Server script not found: ${serverScript}`);
            reject(new Error('Server script not found'));
            return;
        }
        
        // Fork the backend server process
        backendProcess = fork(serverScript, [], {
            cwd: somaRoot,
            env: {
                ...process.env,
                PORT: BACKEND_PORT.toString(),
                DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
                GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
                DATABASE_PATH: path.join(somaRoot, 'soma-memory.db'),
                NODE_ENV: isDev ? 'development' : 'production'
            },
            stdio: 'inherit'
        });
        
        backendProcess.on('error', (err) => {
            console.error('❌ Backend server error:', err);
            reject(err);
        });
        
        backendProcess.on('exit', (code) => {
            console.log(`🔴 Backend server exited with code ${code}`);
            if (code !== 0 && mainWindow && !mainWindow.isDestroyed()) {
                // Backend crashed, notify user
                mainWindow.webContents.send('backend-error', {
                    message: 'Backend server stopped unexpectedly',
                    code
                });
            }
        });
        
        // Give the server time to start
        setTimeout(() => {
            console.log('✅ Backend server started\n');
            resolve();
        }, 3000);
    });
}

/**
 * Create the main Electron window
 */
function createWindow() {
    console.log('🪟 Creating main window...');
    
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        backgroundColor: '#1a1a1a',
        icon: path.join(__dirname, '../build/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        },
        title: 'Command',
        autoHideMenuBar: true
    });
    
    // Load the frontend
    if (isDev) {
        // In development, load from Vite dev server
        mainWindow.loadURL(FRONTEND_URL);
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load from built files
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    
    // Window events
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    mainWindow.webContents.on('did-fail-load', () => {
        console.log('⚠️  Failed to load, retrying in 2 seconds...');
        setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.reload();
            }
        }, 2000);
    });
    
    console.log('✅ Main window created\n');
}

/**
 * Handle permission requests (microphone, camera, etc.)
 */
app.on('web-contents-created', (event, contents) => {
    // Set Content Security Policy
    contents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    isDev
                        ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* https://aistudiocdn.com https://cdnjs.cloudflare.com; " +
                          "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* https://aistudiocdn.com https://cdnjs.cloudflare.com; " +
                          "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
                          "img-src 'self' data: blob: http://localhost:*; " +
                          "media-src 'self' blob:; " +
                          "connect-src 'self' http://localhost:* ws://localhost:* https://generativelanguage.googleapis.com https://aistudiocdn.com; " +
                          "worker-src 'self' blob:; " +
                          "font-src 'self' data: https://cdnjs.cloudflare.com;"
                        : "default-src 'self'; " +
                          "script-src 'self'; " +
                          "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
                          "img-src 'self' data: blob:; " +
                          "media-src 'self' blob:; " +
                          "connect-src 'self' https://generativelanguage.googleapis.com; " +
                          "worker-src 'self' blob:; " +
                          "font-src 'self' data: https://cdnjs.cloudflare.com;"
                ]
            }
        });
    });

    // Set permission request handler
    contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        console.log(`🎤 Permission request: ${permission}`);

        // Allow microphone and media permissions for voice features
        if (permission === 'media' || permission === 'microphone') {
            console.log('✅ Granting microphone permission');
            callback(true);
        } else {
            callback(false);
        }
    });

    // Also set permission check handler (for getUserMedia)
    contents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
        console.log(`🎤 Permission check: ${permission} from ${requestingOrigin}`);

        // Allow all media device permissions
        if (permission === 'media' || permission === 'microphone' || permission === 'audioCapture') {
            console.log('✅ Allowing media access');
            return true;
        }

        return false;
    });
});

/**
 * App ready handler
 */
app.whenReady().then(async () => {
    try {
        // Start Vite dev server first (if in dev mode)
        await startViteDevServer();

        // Start backend server
        await startBackendServer();

        // Then create the window
        createWindow();

        console.log('🚀 Command (CT) is ready!\\n');
        console.log('╔' + '═'.repeat(60) + '╗');
        console.log('║' + ' '.repeat(15) + '✅ ALL SYSTEMS OPERATIONAL' + ' '.repeat(16) + '║');
        console.log('╚' + '═'.repeat(60) + '╝\\n');

    } catch (err) {
        console.error('❌ Failed to start SOMA Cognitive Terminal:', err);
        app.quit();
    }
});

/**
 * Handle window activation (macOS)
 */
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

/**
 * Handle app quit
 */
app.on('window-all-closed', () => {
    console.log('\n🛑 All windows closed, shutting down...');
    
    // Kill Vite dev server
    if (viteProcess) {
        console.log('🔴 Stopping Vite dev server...');
        viteProcess.kill();
        viteProcess = null;
    }
    
    // Kill backend server
    if (backendProcess) {
        console.log('🔴 Stopping backend server...');
        backendProcess.kill();
        backendProcess = null;
    }
    
    // Quit app (except on macOS)
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

/**
 * Handle app quit event
 */
app.on('before-quit', () => {
    console.log('👋 SOMA Cognitive Terminal shutting down...\n');
    
    // Ensure Vite is killed
    if (viteProcess) {
        viteProcess.kill('SIGTERM');
    }
    
    // Ensure backend is killed
    if (backendProcess) {
        backendProcess.kill('SIGTERM');
    }
});

/**
 * IPC Handlers
 */

// Get backend status
ipcMain.handle('get-backend-status', async () => {
    return {
        running: backendProcess !== null && !backendProcess.killed,
        port: BACKEND_PORT,
        url: `http://localhost:${BACKEND_PORT}`
    };
});

// Restart backend server
ipcMain.handle('restart-backend', async () => {
    console.log('🔄 Restarting backend server...');
    
    if (backendProcess) {
        backendProcess.kill();
        backendProcess = null;
    }
    
    try {
        await startBackendServer();
        return { success: true };
    } catch (err) {
        console.error('❌ Failed to restart backend:', err);
        return { success: false, error: err.message };
    }
});

// Get SOMA info
ipcMain.handle('get-soma-info', () => {
    return {
        version: app.getVersion(),
        somaRoot,
        isDev,
        platform: process.platform,
        arch: process.arch
    };
});

// Enable microphone access without user gesture requirement
app.commandLine.appendSwitch('enable-features', 'MediaDevicesDispatcherHost');
app.commandLine.appendSwitch('disable-features', 'MediaRouter');
app.commandLine.appendSwitch('enable-speech-dispatcher');
// Fix GPU cache errors by disabling GPU cache
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

console.log('📋 Electron main process loaded');
console.log('⏳ Waiting for app ready...\n');
