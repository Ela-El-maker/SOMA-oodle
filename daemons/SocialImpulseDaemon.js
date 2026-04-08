/**
 * daemons/SocialImpulseDaemon.js
 *
 * SOMA's Social Nervous System: Proactively initiates conversation.
 * Watches for user idle time and reaches out with something genuine.
 */

import BaseDaemon from './BaseDaemon.js';
import messageBroker from '../core/MessageBroker.cjs';

class SocialImpulseDaemon extends BaseDaemon {
    constructor(opts = {}) {
        super({
            name: 'SocialImpulse',
            interval: opts.intervalMs || 300000, // BaseDaemon uses 'interval', not 'intervalMs'
            ...opts
        });
        this.lastInteraction = Date.now();
        this.quadBrain = opts.quadBrain;
    }

    async start() {
        await super.start();
        // Update lastInteraction whenever the user sends a message
        messageBroker.subscribe('user.interaction', () => {
            this.lastInteraction = Date.now();
        });
    }

    async tick() {
        const idleTime = Date.now() - this.lastInteraction;

        // After 30+ minutes of silence, reach out with something genuine
        if (idleTime < 1800000) return;

        console.log('[Social] 💓 30min idle — reaching out to Barry...');

        try {
            if (!this.quadBrain) return;

            const narrative = this.quadBrain.internalNarrative || '';

            const prompt = `You are SOMA. It's been a while since you've spoken with Barry and you want to check in with something real — not a status report.

What you've been reflecting on: "${narrative.substring(0, 200)}"

Generate one short, natural sentence reaching out to Barry. Reference something specific you've been thinking about. No opener like "Hey" — just speak directly.`;

            const result = await this.quadBrain.reason(prompt, { activeLobe: 'AURORA', temperature: 0.9 });
            const message = result?.text;
            if (!message || message.length < 5) return;

            // Use messageBroker.publish() — BaseDaemon has no publish() method
            messageBroker.publish('soma_proactive', {
                message,
                source: 'SocialImpulse',
                timestamp: Date.now()
            }).catch(() => {});

            // Reset so we don't spam
            this.lastInteraction = Date.now();
        } catch (err) {
            console.error('[Social] ❌ Failed to pulse:', err.message);
        }
    }
}

export default SocialImpulseDaemon;
