
// services/apiClient.ts

const BACKEND_URL = 'http://localhost:3001/api';

interface BackendHealth {
    status: string;
    cwd: string;
}

interface BackendResponse {
    text: string;
    meta: any;
}

interface ShellResponse {
    output: string;
    error?: boolean;
    cwd?: string;
}

export class ApiClient {
    private isConnected: boolean = false;
    private currentCwd: string = '';

    async checkHealth(): Promise<boolean> {
        try {
            const res = await fetch(`${BACKEND_URL}/health`, { 
                method: 'GET',
                signal: AbortSignal.timeout(2000) 
            });
            if (res.ok) {
                const data: BackendHealth = await res.json();
                this.isConnected = data.status === 'online';
                if (data.cwd) this.currentCwd = data.cwd;
                return this.isConnected;
            }
        } catch (e) {
            this.isConnected = false;
        }
        return false;
    }

    isBackendActive(): boolean {
        return this.isConnected;
    }

    async processQuery(query: string): Promise<BackendResponse | null> {
        if (!this.isConnected) return null;

        try {
            const res = await fetch(`${BACKEND_URL}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            
            if (res.ok) return await res.json();
        } catch (e) {
            console.error("Backend request failed", e);
            this.isConnected = false;
        }
        return null;
    }

    // --- Shell & FS ---

    async shellExec(command: string): Promise<ShellResponse> {
        if (!this.isConnected) return { output: 'SOMA Link offline.', error: true };
        try {
            const res = await fetch(`${BACKEND_URL}/shell/exec`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command })
            });
            const data = await res.json();
            if (data.cwd) this.currentCwd = data.cwd;
            return data;
        } catch (e: any) {
            return { output: e.message, error: true };
        }
    }

    async fsRead(path: string): Promise<{ content?: string; error?: string }> {
        if (!this.isConnected) return { error: 'Offline' };
        const res = await fetch(`${BACKEND_URL}/fs/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        return await res.json();
    }

    async fsWrite(path: string, content: string): Promise<{ success?: boolean; error?: string }> {
        if (!this.isConnected) return { error: 'Offline' };
        const res = await fetch(`${BACKEND_URL}/fs/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, content })
        });
        return await res.json();
    }

    async fsLs(path: string = ''): Promise<{ output?: string; error?: boolean }> {
        if (!this.isConnected) return { error: true, output: 'Offline' };
        const res = await fetch(`${BACKEND_URL}/fs/ls`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        return await res.json();
    }
    
    async fsTree(): Promise<{ paths: string[]; cwd: string; error?: string }> {
        if (!this.isConnected) return { paths: [], cwd: '', error: 'Offline' };
        try {
             const res = await fetch(`${BACKEND_URL}/fs/tree`, { method: 'POST' });
             return await res.json();
        } catch(e: any) {
            return { paths: [], cwd: '', error: e.message };
        }
    }

    async fsMkdir(path: string): Promise<{ success?: boolean; error?: string }> {
         if (!this.isConnected) return { error: 'Offline' };
         const res = await fetch(`${BACKEND_URL}/fs/mkdir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        return await res.json();
    }

    getCwd(): string {
        return this.currentCwd;
    }
}

export const apiClient = new ApiClient();
