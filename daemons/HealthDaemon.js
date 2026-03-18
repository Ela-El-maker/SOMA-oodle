/**
 * daemons/HealthDaemon.js
 * 
 * Sensory neuron that monitors SOMA's physical and digital health.
 */

import BaseDaemon from './BaseDaemon.js';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

export class HealthDaemon extends BaseDaemon {
    constructor(config = {}) {
        super({
            ...config,
            interval: config.intervalMs || 30000 // 30 seconds default
        });
        this.dbPath = path.join(process.cwd(), 'soma-memory.db');
    }

    async tick() {
        const metrics = await this._getMetrics();
        
        // Emit normal metrics signal
        this.emitSignal('health.metrics', metrics, 'low');

        // Check for critical health issues
        if (metrics.dbSizeGB > 1.5) {
            this.emitSignal('health.warning', {
                issue: 'DATABASE_BLOATED',
                details: `Memory database is ${metrics.dbSizeGB.toFixed(2)}GB`,
                suggestion: 'Run deep_memory_cleanup'
            }, 'high');
        }

        if (metrics.cpuUsage > 90) {
            this.emitSignal('health.warning', {
                issue: 'HIGH_CPU_LOAD',
                details: `CPU usage is at ${metrics.cpuUsage}%`
            }, 'normal');
        }
    }

    async _getMetrics() {
        const cpuLoad = os.loadavg();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        
        let dbSize = 0;
        try {
            const stats = await fs.stat(this.dbPath);
            dbSize = stats.size;
        } catch (e) {}

        return {
            cpuUsage: (cpuLoad[0] * 100 / os.cpus().length).toFixed(1),
            ramUsage: ((totalMem - freeMem) * 100 / totalMem).toFixed(1),
            dbSizeGB: dbSize / (1024 * 1024 * 1024),
            uptime: process.uptime()
        };
    }
}

export default HealthDaemon;
