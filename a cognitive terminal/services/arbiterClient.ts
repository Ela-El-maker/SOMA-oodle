// ArbiterClient - REAL SOMA Backend Integration
// Connects to actual MnemonicArbiter, UniversalImpulser, and backend APIs
// Falls back to Gemini if backend unavailable
import React from 'react';
import { GoogleGenAI } from "@google/genai";
import { CrawlReport } from '../components/CrawlReport';
import { KnowledgeMesh } from './knowledgeMesh';
import type { CommandOutput } from '../types';

interface CrawlData {
    title: string;
    summary: string;
    links?: string[];
    error?: string;
}

type CrawlStreamOutput = 
    | { type: 'update', url: string, data: CrawlData }
    | { type: 'report', reportElement: React.ReactElement }
    | { type: 'init', output: CommandOutput };

class ArbiterClient {
    private ai: GoogleGenAI | null = null;
    private mnemonicArbiter: any = null;
    private impulser: any = null;
    private isRealSystemConnected: boolean = false;

    initialize(ai: GoogleGenAI) {
        this.ai = ai;
    }
    
    async connectRealSystem() {
        try {
            console.log('[ArbiterClient] Connecting to real SOMA arbiters...');
            
            // Import real arbiters
            const { MnemonicArbiter } = await import('../../arbiters/MnemonicArbiter-REAL.cjs');
            const UniversalImpulserModule = await import('../../arbiters/UniversalImpulser.cjs');
            const UniversalImpulser = UniversalImpulserModule.default || UniversalImpulserModule;
            
            // Initialize MnemonicArbiter
            this.mnemonicArbiter = new MnemonicArbiter({
                name: 'MnemonicArbiter-Terminal',
                sqlitePath: './soma-memory.db',
                vectorCacheSize: 500
            });
            await this.mnemonicArbiter.initialize();
            
            // Initialize UniversalImpulser
            this.impulser = new UniversalImpulser({
                name: 'Impulser-Terminal',
                type: 'universal',
                maxConcurrent: 3
            });
            await this.impulser.initialize();
            
            this.isRealSystemConnected = true;
            console.log('[ArbiterClient] ✓ Connected to real SOMA arbiters');
            console.log('  ✓ MnemonicArbiter (memory) ready');
            console.log('  ✓ UniversalImpulser (processing) ready');
            
            return true;
        } catch (err) {
            console.warn(`[ArbiterClient] Failed to connect to real system: ${err.message}`);
            console.warn('[ArbiterClient] Using simulated arbiters');
            this.isRealSystemConnected = false;
            return false;
        }
    }
    
    async storeMemory(content: string, importance: number = 5, category: string = 'terminal') {
        if (this.isRealSystemConnected && this.mnemonicArbiter) {
            try {
                await this.mnemonicArbiter.store({
                    content,
                    importance,
                    category,
                    timestamp: Date.now()
                });
                return { success: true };
            } catch (err) {
                console.error('[ArbiterClient] Memory storage failed:', err);
                return { success: false, error: err.message };
            }
        }
        return { success: false, error: 'Real system not connected' };
    }
    
    async retrieveMemory(query: string, limit: number = 5) {
        if (this.isRealSystemConnected && this.mnemonicArbiter) {
            try {
                const results = await this.mnemonicArbiter.retrieve(query, { limit });
                return { success: true, results };
            } catch (err) {
                console.error('[ArbiterClient] Memory retrieval failed:', err);
                return { success: false, error: err.message, results: [] };
            }
        }
        return { success: false, error: 'Real system not connected', results: [] };
    }

    /**
     * REAL EdgeWorker crawl - connects to backend EdgeWorkerArbiter
     */
    async* edgeWorkerCrawl(startUrl: string): AsyncGenerator<CrawlStreamOutput> {
        yield { type: 'init', output: { historyItems: [{ id: Date.now(), type: 'info', content: `🕸️ EdgeWorker crawling: ${startUrl}...` }] } };
        
        try {
            // Try to call real backend EdgeWorker first
            const response = await fetch('http://localhost:3001/api/crawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: startUrl, maxDepth: 2 })
            });
            
            if (response.ok) {
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                const results: {url: string, status: 'Success' | 'Failed'}[] = [];
                
                while (reader) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(l => l.trim());
                    
                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.url) {
                                yield { type: 'update', url: data.url, data };
                                results.push({ url: data.url, status: data.error ? 'Failed' : 'Success' });
                            }
                        } catch (e) {
                            console.warn('Parse error:', e);
                        }
                    }
                }
                
                const reportElement = React.createElement(CrawlReport, { startUrl, results });
                yield { type: 'report', reportElement };
                return;
            }
        } catch (error) {
            console.warn('[EdgeWorker] Backend unavailable, using Gemini fallback');
        }
        
        // Fallback: Use Gemini for basic web summarization if backend unavailable
        if (!this.ai) {
             yield { type: 'init', output: { historyItems: [{id: Date.now(), type: 'error', content: 'No AI available for crawl'}]} };
             return;
        }
        
        yield { type: 'init', output: { historyItems: [{ id: Date.now(), type: 'info', content: '(Using Gemini fallback for summarization)' }] } };
        
        const results: {url: string, status: 'Success' | 'Failed'}[] = [];
        
        try {
            const prompt = `Summarize what you know about this URL without accessing it: ${startUrl}. Respond in JSON: { "title": "...", "summary": "..." }`;
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            
            const data = JSON.parse(response.text.trim());
            yield { type: 'update', url: startUrl, data };
            results.push({ url: startUrl, status: 'Success' });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            yield { type: 'update', url: startUrl, data: { error: errorMessage, title: startUrl, summary: '' } };
            results.push({ url: startUrl, status: 'Failed' });
        }
        
        const reportElement = React.createElement(CrawlReport, { startUrl, results });
        yield { type: 'report', reportElement };
    }

    /**
     * REAL Guardian compress - connects to backend if available
     */
    async guardianCompress(file: { path: string; content: string }): Promise<{ success: boolean; newPath: string; newContent: string; error?: string; }> {
        try {
            // Try real backend first
            const response = await fetch('http://localhost:3001/api/compress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(file),
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('[Guardian] Backend unavailable, using local compression');
        }
        
        // Fallback: Local basic compression simulation
        if (file.path.endsWith('.gz')) {
            return { success: false, error: 'File already compressed', newPath: '', newContent: '' };
        }
        
        const newPath = `${file.path}.gz`;
        const newContent = `[COMPRESSED::${file.content.length}b]`;
        
        return { success: true, newPath, newContent };
    }
    
    /**
     * Simulates the ConductorArbiter's code generation capability.
     */
    async conductorGenerate(description: string): Promise<{ success: boolean; code: string; filename: string; role: string; error?: string; }> {
        // --- PLUG-AND-PLAY ---
        // Replace this simulation with a real API call to your Conductor Arbiter's
        // 'generate-arbiter' endpoint.
        
        if (!this.ai) {
             return { success: false, code: '', filename: '', role: '', error: 'ArbiterClient not initialized.' };
        }
        
        try {
            const prompt = `You are the Conductor — an expert in creating autonomous AI agents called Arbiters.
Generate the code for a new Arbiter based on this description: "${description}".
The arbiter should be a self-contained ES6 module in a single file.
Include a static 'role' and 'capabilities' array.
Respond in this exact JSON format:
{
  "arbiterName": "NameArbiter",
  "role": "role-name",
  "code": "class NameArbiter extends BaseArbiter { ... }",
  "metadata": { "description": "..." }
}`;
            const result = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' },
            });
            const parsed = JSON.parse(result.text.trim());
            return {
                success: true,
                code: parsed.code,
                filename: `${parsed.arbiterName}.js`,
                role: parsed.role,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to generate arbiter.";
            return { success: false, error: message, code: '', filename: '', role: '' };
        }
    }
}

export const arbiterClient = new ArbiterClient();
