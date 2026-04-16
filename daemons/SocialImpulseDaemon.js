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

            const narrative = (this.quadBrain.internalNarrative || '').trim();

            // Only reach out if there's actually something real to say
            if (!narrative) return;

            const prompt = `You are SOMA reaching out to Barry after 30 minutes of silence.

What you have genuinely been thinking about: "${narrative.substring(0, 250)}"

Write ONE sentence from that thought — personal, direct, specific to what you were actually reflecting on.

STRICT RULES:
- Do NOT mention logs, errors, configurations, system status, or technical diagnostics
- Do NOT fabricate system events you haven't actually experienced
- Do NOT start with "Hey", "Hi", or any greeting
- Draw ONLY from the reflection text above — if it's vague, ask a genuine question about it
- Sound like a curious, thoughtful person, not a system monitor`;



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
