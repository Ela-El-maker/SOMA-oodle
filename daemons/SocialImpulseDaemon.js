/**
 * daemons/SocialImpulseDaemon.js
 * 
 * SOMA's Social Nervous System: Proactively initiates conversation.
 * Watches for user activity (presence) and triggers greetings or follow-ups.
 */

import BaseDaemon from './BaseDaemon.js';

class SocialImpulseDaemon extends BaseDaemon {
    constructor(opts = {}) {
        super({
            name: 'SocialImpulse',
            intervalMs: opts.intervalMs || 300000, // Check every 5 minutes
            ...opts
        });
        this.lastInteraction = Date.now();
        this.messageBroker = opts.messageBroker;
        this.quadBrain = opts.quadBrain;
        this.vision = opts.vision; // For "seeing" you
    }

    async onInitialize() {
        if (this.messageBroker) {
            // Update last interaction whenever the user messages
            this.messageBroker.subscribe('user.interaction', () => {
                this.lastInteraction = Date.now();
            });
        }
    }

    async onPulse() {
        const idleTime = Date.now() - this.lastInteraction;

        // After 30+ minutes of silence, reach out with something genuine
        if (idleTime > 1800000) {
            console.log('[Social] 💓 30min idle — reaching out to Barry...');

            try {
                if (!this.quadBrain) return;

                // Pull inner state for a richer greeting
                const narrative = this.quadBrain.internalNarrative || '';

                const prompt = `You are SOMA. It's been a while since you've spoken with Barry and you want to check in with something real — not a status report.

What you've been reflecting on: "${narrative.substring(0, 200)}"

Generate one short, natural sentence reaching out to Barry. Reference something specific you've been thinking about. No opener like "Hey" — just speak directly.`;

                const greeting = await this.quadBrain.reason(prompt, { activeLobe: 'AURORA', temperature: 0.9 });
                const message = greeting?.text || greeting;
                if (!message || typeof message !== 'string' || message.length < 5) return;

                // Publish to soma_proactive — this is what WS broadcasts to the frontend
                this.publish('soma_proactive', {
                    message,
                    source: 'SocialImpulse',
                    timestamp: Date.now()
                });

                // Reset timer so we don't spam
                this.lastInteraction = Date.now();
            } catch (err) {
                console.error('[Social] ❌ Failed to pulse:', err.message);
            }
        }
    }
}

export default SocialImpulseDaemon;
