/**
 * arbiters/SubstrateOptimizerArbiter.js
 *
 * SOMA Metabolism & Resource Optimization — "The Silicon Squeeze".
 *
 * Monitors RAM (OS-level + process heap), CPU, and event-loop lag.
 * When pressure exceeds thresholds, it:
 *   1. Forces a manual GC pass (if --expose-gc is set)
 *   2. Broadcasts 'substrate_squeeze_active' so arbiters can throttle
 *   3. Emits a health.warning signal into the CNS
 *   4. Logs the event to SOMA's memory
 *
 * Enhancements over original:
 * - Process heap monitoring (more accurate than OS free RAM on Windows)
 * - CPU usage via process.cpuUsage() deltas (os.loadavg() is always [0,0,0] on Windows)
 * - Event-loop lag detection via setImmediate delta
 * - Gradual recovery — status resets to 'optimal' when pressure clears
 * - Squeeze rate limiting (min 60s between squeezes)
 * - Proper health.warning / health.metrics signal emission
 */

import { BaseArbiterV4, ArbiterRole, ArbiterCapability } from './BaseArbiter.js';
import os from 'os';

const AUDIT_INTERVAL_MS   = 60_000;  // audit every 60s
const MIN_SQUEEZE_GAP_MS  = 60_000;  // don't squeeze more than once per minute

export class SubstrateOptimizerArbiter extends BaseArbiterV4 {
    constructor(opts = {}) {
        super({
            ...opts,
            name: 'SubstrateOptimizer',
            role: ArbiterRole.MAINTAINER,
            capabilities: [ArbiterCapability.SELF_HEALING, ArbiterCapability.SYSTEM_AUDIT],
        });

        this.thresholds = {
            osMemory:    opts.osMemoryThreshold  || 0.90, // OS RAM usage %
            heapMemory:  opts.heapThreshold      || 0.85, // Node.js heap usage %
            eventLagMs:  opts.eventLagThreshold  || 500,  // event-loop lag before squeezing
        };

        this.status           = 'optimal';
        this.lastAudit        = null;
        this._lastSqueeze     = 0;
        this._squeezeCount    = 0;
        this._prevCpuUsage    = null;
        this._prevCpuTime     = null;
    }

    async onInitialize() {
        console.log(`🔋 [${this.name}] Substrate Monitoring Online.`);
        this._startMetabolicPulse();
    }

    // ── Public audit API ─────────────────────────────────────────────────────

    async auditMetabolism() {
        const mem        = process.memoryUsage();
        const totalOs    = os.totalmem();
        const freeOs     = os.freemem();
        const osMemRatio = (totalOs - freeOs) / totalOs;
        const heapRatio  = mem.heapUsed / mem.heapTotal;
        const cpuPct     = this._measureCpu();
        const lagMs      = await this._measureEventLag();

        this.lastAudit = {
            osMemory:     `${(osMemRatio * 100).toFixed(1)}%`,
            heapUsed:     `${(mem.heapUsed / 1048576).toFixed(0)}MB`,
            heapTotal:    `${(mem.heapTotal / 1048576).toFixed(0)}MB`,
            heapRatio:    `${(heapRatio * 100).toFixed(1)}%`,
            rss:          `${(mem.rss / 1048576).toFixed(0)}MB`,
            cpuPct:       `${cpuPct.toFixed(1)}%`,
            eventLagMs:   lagMs,
            squeezeCount: this._squeezeCount,
            timestamp:    Date.now(),
        };

        // Emit periodic metrics signal (low priority — AttentionArbiter may suppress under load)
        this.emitSignal?.('health.metrics', {
            cpuUsage:  cpuPct,
            ramUsage:  osMemRatio * 100,
            heapUsed:  mem.heapUsed,
            heapTotal: mem.heapTotal,
            dbSizeGB:  0,
        }, 'low');

        // Check thresholds and squeeze if needed
        const pressures = [];
        if (osMemRatio  > this.thresholds.osMemory)   pressures.push(`OS_RAM ${(osMemRatio * 100).toFixed(0)}%`);
        if (heapRatio   > this.thresholds.heapMemory)  pressures.push(`heap ${(heapRatio * 100).toFixed(0)}%`);
        if (lagMs       > this.thresholds.eventLagMs)  pressures.push(`event-loop lag ${lagMs}ms`);

        if (pressures.length > 0) {
            await this._triggerSiliconSqueeze(pressures.join(', '));
        } else if (this.status === 'squeezing') {
            // Recovery — pressure cleared
            this.status = 'optimal';
            console.log(`✅ [${this.name}] Pressure cleared — status: optimal.`);
        }

        return this.lastAudit;
    }

    getStatus() {
        return {
            name:        this.name,
            status:      this.status,
            metabolism:  this.lastAudit,
            thresholds:  this.thresholds,
        };
    }

    // ── The Silicon Squeeze ───────────────────────────────────────────────────

    async _triggerSiliconSqueeze(reason) {
        const now = Date.now();
        if (now - this._lastSqueeze < MIN_SQUEEZE_GAP_MS) return;

        this.status      = 'squeezing';
        this._lastSqueeze = now;
        this._squeezeCount++;

        console.warn(`⚠️ [${this.name}] SILICON SQUEEZE #${this._squeezeCount}: ${reason}`);

        // 1. Force GC if available
        if (global.gc) {
            global.gc();
            const after = process.memoryUsage();
            const freedMB = ((this.lastAudit?.heapUsed ? parseInt(this.lastAudit.heapUsed) : 0) - after.heapUsed / 1048576).toFixed(0);
            console.log(`🔋 [${this.name}] GC pass complete. Heap: ${(after.heapUsed / 1048576).toFixed(0)}MB (freed ~${freedMB}MB)`);
        }

        // 2. Signal all arbiters to throttle
        await this.sendMessage?.('all', 'substrate_squeeze_active', {
            reason,
            severity:    this._squeezeCount > 3 ? 'critical' : 'warning',
            targetModel: 'tinyllama',
            priority:    'continuity',
        });

        // 3. Emit health warning into CNS (AttentionArbiter will broadcast)
        this.emitSignal?.('health.warning', {
            issue:   'substrate_pressure',
            details: reason,
        }, 'high');

        // 4. Log to memory (non-blocking)
        const mnemonic = this.system?.mnemonicArbiter || this.system?.mnemonic;
        mnemonic?.remember?.(
            `[SUBSTRATE] Silicon Squeeze triggered: ${reason}. Squeeze #${this._squeezeCount}.`,
            { type: 'metabolic_event', importance: 0.3 }
        ).catch(() => {});
    }

    // ── Metrics helpers ───────────────────────────────────────────────────────

    /**
     * CPU usage delta since last call.
     * Works on Windows (os.loadavg is always [0,0,0] there).
     */
    _measureCpu() {
        const now     = process.hrtime.bigint();
        const usage   = process.cpuUsage();

        if (this._prevCpuUsage && this._prevCpuTime) {
            const elapsedUs  = Number(now - this._prevCpuTime) / 1000;     // ns → µs
            const cpuUs      = (usage.user - this._prevCpuUsage.user)
                             + (usage.system - this._prevCpuUsage.system);
            this._prevCpuUsage = usage;
            this._prevCpuTime  = now;
            if (elapsedUs > 0) return Math.min(100, (cpuUs / elapsedUs) * 100);
        } else {
            this._prevCpuUsage = usage;
            this._prevCpuTime  = now;
        }
        return 0;
    }

    /** Approximate event-loop lag using a setImmediate round-trip. */
    _measureEventLag() {
        return new Promise(resolve => {
            const start = Date.now();
            setImmediate(() => resolve(Date.now() - start));
        });
    }

    _startMetabolicPulse() {
        setInterval(() => this.auditMetabolism().catch(() => {}), AUDIT_INTERVAL_MS).unref();
    }
}

export default SubstrateOptimizerArbiter;
