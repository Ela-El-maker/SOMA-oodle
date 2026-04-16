/**
 * arbiters/AttentionArbiter.js
 * 
 * The Gatekeeper of SOMA's consciousness.
 * Sits between the CNS and Decision Arbiters to manage focus and noise.
 */

import { BaseArbiterV4, ArbiterRole, ArbiterCapability } from './BaseArbiter.js';
import messageBroker from '../core/MessageBroker.cjs';

export class AttentionArbiter extends BaseArbiterV4 {
    constructor(opts = {}) {
        super({
            ...opts,
            name: opts.name || 'AttentionArbiter',
            role: ArbiterRole.SUPERVISOR,
            capabilities: [ArbiterCapability.MONITOR_HEALTH]
        });

        this.focusTopic = 'general';
        this.focusExpiry = null;
        this.loadThreshold = opts.loadThreshold || 80; // CPU load to start dropping low-priority signals
        this.systemHealth = { cpuUsage: 0, ramUsage: 0 };
    }

    async onInitialize() {
        // Subscribe to all health metrics to adjust attention filters
        messageBroker.subscribe('health.metrics', (signal) => {
            this.systemHealth = signal.payload;
        });

        // Subscribe to global signals to manage "Focus"
        messageBroker.subscribe('ui.navigate', (signal) => {
            this.setFocus(signal.payload.module, 60000); // 1 minute focus on new tab
        });

        this.auditLogger.info('AttentionArbiter initialized');
    }

    /**
     * Set the system's global focus topic
     */
    setFocus(topic, durationMs = 0) {
        this.focusTopic = topic;
        this.focusExpiry = durationMs ? Date.now() + durationMs : null;
        this.auditLogger.info(`[Attention] Focus shifted to: ${topic}`);
        
        // Broadcast focus shift to the CNS
        messageBroker.publish('system.focus.shifted', { topic, durationMs });
    }

    /**
     * The Amygdala Gate: Decide if a signal should be noticed by decision arbiters.
     * Logic:
     * 1. 'emergency' or 'high' priority always pass.
     * 2. If load is > loadThreshold, drop 'low' priority unless they match focus.
     * 3. Signals matching focus get a priority boost.
     */
    shouldNotice(signal) {
        const { type, priority, payload } = signal;

        // 1. High-priority bypass
        if (priority === 'high' || priority === 'emergency') return true;

        // Check focus expiration
        if (this.focusExpiry && Date.now() > this.focusExpiry) {
            this.focusTopic = 'general';
            this.focusExpiry = null;
        }

        // 2. Focus match
        const matchesFocus = type.includes(this.focusTopic) || 
                            (payload && JSON.stringify(payload).includes(this.focusTopic));

        // 3. Load-based shedding
        if (this.systemHealth.cpuUsage > this.loadThreshold) {
            if (priority === 'low' && !matchesFocus) {
                return false; // Shed low-priority non-focus signal
            }
        }

        return true;
    }

    async handleMessage(message) {
        // Traditional message handling if needed
        return super.handleMessage(message);
    }
}

// Ensure compatibility with the loader which expects default export
export default AttentionArbiter;
