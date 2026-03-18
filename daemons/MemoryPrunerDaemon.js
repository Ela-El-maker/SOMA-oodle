/**
 * daemons/MemoryPrunerDaemon.js
 * 
 * SOMA Metabolism: Proactively prevents "Digital Constipation" (Database Bloat).
 * Periodically scans the memory database and prunes large state dumps or recursive logs.
 */

import BaseDaemon from './BaseDaemon.js';

class MemoryPrunerDaemon extends BaseDaemon {
    constructor(opts = {}) {
        super({
            name: 'MemoryPruner',
            intervalMs: opts.intervalMs || 43200000, // Default: Every 12 hours
            ...opts
        });
        this.mnemonic = opts.mnemonic || null;
        this.sizeThresholdKB = opts.sizeThresholdKB || 100;
    }

    async onPulse() {
        console.log('[Metabolism] 🚽 Starting Memory Pruning Cycle...');
        
        try {
            if (!this.mnemonic) {
                console.warn('[Metabolism] MnemonicArbiter not available for pruning.');
                return;
            }

            // Execute the deep cleanup
            const result = await this.mnemonic.deepCleanup?.({
                maxSizeKB: this.sizeThresholdKB,
                patterns: ['state', 'snapshot', 'experience_dump', 'node_modules']
            }) || { pruned: 0 };

            console.log(`[Metabolism] ✅ Pruning Complete. Removed ${result.pruned} bloated entries.`);
            
            // Log to CNS
            this.publish('health.metrics', {
                type: 'memory_pruned',
                count: result.pruned,
                timestamp: Date.now()
            });

        } catch (err) {
            console.error(`[Metabolism] ❌ Pruning failed: ${err.message}`);
        }
    }
}

export default MemoryPrunerDaemon;
