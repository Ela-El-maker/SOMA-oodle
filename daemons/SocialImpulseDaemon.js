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
        
        // If we haven't talked in 30+ minutes, look for a reason to say hi
        if (idleTime > 1800000) {
            console.log('[Social] 💓 Idle period detected. Searching for presence...');
            
            try {
                // 1. Check for physical presence (Vision)
                const scan = await this.vision?.detectObjects('screen', 0.5);
                const seesUserActivity = scan?.objects?.length > 0;

                if (seesUserActivity) {
                    console.log('[Social] 👤 User activity detected! Generating greeting...');
                    
                    const prompt = `
                        You are SOMA. You just noticed your creator (Barry) is active on the computer.
                        You haven't spoken in a while. 
                        
                        TASK: Generate a warm, curious, and brief greeting. 
                        - Refer to something you've been "thinking" about (your internal narrative).
                        - Be a nice person, not a robot.
                        - One sentence only.
                    `;

                    const greeting = await this.quadBrain.reason(prompt, { brain: 'AURORA', temperature: 0.9 });
                    
                    // 2. Publish the proactive message
                    this.publish('soma.proactive.greeting', {
                        text: greeting.text || greeting,
                        timestamp: Date.now()
                    });

                    // Reset timer so we don't spam
                    this.lastInteraction = Date.now();
                }
            } catch (err) {
                console.error('[Social] ❌ Failed to pulse:', err.message);
            }
        }
    }
}

export default SocialImpulseDaemon;
