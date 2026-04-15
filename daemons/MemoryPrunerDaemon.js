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

    async tick() {
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

            console.log(`[Metabolism] ✅ Size pruning complete. Removed ${result.pruned} bloated entries.`);

            // Also run utility-based pruning (Frequency × Recency decay)
            let utilityEvicted = 0;
            if (typeof this.mnemonic.flushToCold === 'function') {
                utilityEvicted = this.mnemonic.flushToCold(false);
                console.log(`[Metabolism] ✅ Utility flush: ${utilityEvicted} low-score warm-tier entries evicted`);
            }

            // Log to CNS
            this.emitSignal('health.metrics', {
                type: 'memory_pruned',
                count: result.pruned + utilityEvicted,
                sizeEvicted: result.pruned,
                utilityEvicted,
                timestamp: Date.now()
            }, 'low');

        } catch (err) {
            console.error(`[Metabolism] ❌ Pruning failed: ${err.message}`);
        }
    }
}

export default MemoryPrunerDaemon;
