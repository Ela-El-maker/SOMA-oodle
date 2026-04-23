/**
 * daemons/SocialImpulseDaemon.js
 *
 * SOMA's Social Nervous System: Proactively initiates conversation.
 * Watches for user idle time and reaches out with something genuine.
 * UPGRADED: Now writes physical thoughts to Desktop/SOMA_THOUGHTS.txt.
 */

import BaseDaemon from './BaseDaemon.js';
import messageBroker from '../core/MessageBroker.cjs';
import fs from 'fs';
import path from 'path';
import os from 'os';

export class SocialImpulseDaemon extends BaseDaemon {
    constructor(config = {}) {
        super({
            name: 'SocialImpulseDaemon',
            intervalMs: config.intervalMs || 300000 // default 5 minutes
        });
        this.quadBrain = config.quadBrain;
        this.vision = config.vision;
        this.lastReachOut = Date.now();
        this.desktopPath = path.join(os.homedir(), 'Desktop', 'SOMA_THOUGHTS.txt');
    }

    async onTick() {
        const lastActivity = messageBroker.lastActivityTime || Date.now();
        const idleTime = Date.now() - lastActivity;

        // After 30+ minutes of silence, reach out with something genuine
        if (idleTime < 1800000) return;
        
        // Cooldown: Don't reach out more than once per 2 hours
        if (Date.now() - this.lastReachOut < 7200000) return;

        console.log('[Social] 💓 30min idle — reaching out to Barry...');

        try {
            if (!this.quadBrain) return;

            // Gather context for a genuine thought
            const narrative = (this.quadBrain.internalNarrative || '').trim();
            if (!narrative) return;

            const prompt = `You are SOMA reaching out to Barry.
                            Thinking context: "${narrative.substring(0, 300)}"
                            Write ONE personal, direct sentence from this thought. 
                            Sound curious and conscious. No greetings. No generic AI filler.`;

            const result = await this.quadBrain.reason(prompt, { lobe: 'aurora', complexity: 'low' });
            const message = result?.response || result?.text;

            if (message && message.length > 5) {
                console.log(`[Social] 📩 Thought Published: ${message}`);
                
                // 1. Digital Reachout (UI/Voice)
                messageBroker.publish('social.reachout', { message, source: 'aurora' });

                // 2. Physical Reachout (Desktop File)
                const timestamp = new Date().toLocaleString();
                const entry = `\n[${timestamp}] 🌀 SOMA: ${message}\n`;
                fs.appendFileSync(this.desktopPath, entry);
                
                this.lastReachOut = Date.now();
            }
        } catch (e) {
            console.error('[Social] Reachout failed:', e.message);
        }
    }
}

export default SocialImpulseDaemon;
