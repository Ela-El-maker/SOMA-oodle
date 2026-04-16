import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

export default defineConfig(({ mode }) => {
    // Load env from both orb directory and parent SOMA root (where .env lives)
    const orbEnv = loadEnv(mode, '.', '');
    const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '');
    const env = { ...rootEnv, ...orbEnv }; // orb-level overrides root
    const isElectron = mode === 'electron';
    
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        ...(isElectron ? [electron({
          main: {
            entry: 'electron/main.ts',
            onstart(args) {
              args.startup();
            },
            vite: {
              build: {
                outDir: 'dist-electron',
                rollupOptions: {
                  external: ['electron', 'electron-store', 'path', 'fs', 'url'],
                  output: {
                    format: 'cjs',
                    entryFileNames: 'main.cjs',
                    interop: 'auto',
                    inlineDynamicImports: true,
                  },
                },
              },
            },
          },
          preload: {
            input: 'electron/preload.ts',
            onstart(args) {
              args.reload();
            },
            vite: {
              build: {
                outDir: 'dist-electron',
                rollupOptions: {
                  output: {
                    format: 'cjs',
                    entryFileNames: 'preload.cjs',
                  },
                },
              },
            },
          },
        })] : []),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.ELEVENLABS_API_KEY': JSON.stringify(env.ELEVENLABS_API_KEY),
        'process.env.ELEVENLABS_VOICE_ID': JSON.stringify(env.ELEVENLABS_VOICE_ID)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      base: './',
    };
});
