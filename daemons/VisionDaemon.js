/**
 * daemons/VisionDaemon.js
 *
 * SOMA Perception Layer: Vision Watchdog
 * Provides persistent "Computer Use" perception by capturing the desktop/webcam 
 * frames at a steady interval, analyzing them with CLIP (VisionProcessingArbiter),
 * and emitting 'vision.perceived' signals.
 *
 * Features:
 * - Delta Hashing: Only runs expensive CLIP analysis when the screen content changes.
 * - Multi-Channel: Can switch between Desktop and Webcam perception.
 * - Persistence: Independent of UI tab state — SOMA is always looking if active.
 * - Adaptive Polling: Adjusts frequency based on user/system activity.
 * - Hand-Eye Verification: Checks visual state after computer actions to ensure intent succeeded.
 */

import BaseDaemon from './BaseDaemon.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export class VisionDaemon extends BaseDaemon {
    constructor(opts = {}) {
        super({
            name: 'VisionDaemon',
            interval: opts.intervalMs || 10000, // Start in idle mode 10s
            ...opts
        });

        // Dependencies
        this.computerControl = opts.computerControl || null;
        this.visionProcessing = opts.visionProcessing || null;
        
        // State
        this.channel = opts.channel || 'desktop'; // 'desktop' | 'webcam'
        this.lastHash = null;
        this.lastPerception = null;
        this.perceptionCount = 0;
        this.ghostCursor = null; // { x, y, action, timestamp }
        this.lastActionMs = Date.now();
        this.isExecutingGoal = false;
        
        // Metrics
        this.metrics = {
            framesCaptured: 0,
            analysisCount: 0,
            deltasDetected: 0,
            lastAnalysisMs: 0
        };

        this.logger.info(`[VisionDaemon] 👁️  Initialized. Mode: ${this.channel}`);

        // Subscribe to computer actions for ghost cursor, adaptive polling, and verification
        if (opts.messageBroker) {
            opts.messageBroker.subscribe('computer.action', (signal) => {
                const { action, x, y } = signal.payload || {};
                this.lastActionMs = Date.now();
                if (x !== undefined && y !== undefined) {
                    this.ghostCursor = { x, y, action, timestamp: this.lastActionMs };
                }
                
                // Trigger Hand-Eye Verification for active interactions
                if (action === 'click' || action === 'type' || action === 'doubleClick' || action === 'rightClick') {
                    this._verifyAction(signal.payload).catch(e => this.logger.error(`[VisionDaemon] Verification failed: ${e.message}`));
                }
            });

            opts.messageBroker.subscribe('goal.execution.started', () => {
                this.isExecutingGoal = true;
                this.lastActionMs = Date.now();
            });

            opts.messageBroker.subscribe('goal.execution.completed', () => {
                this.isExecutingGoal = false;
                this.lastActionMs = Date.now();
            });
            
            opts.messageBroker.subscribe('goal.execution.failed', () => {
                this.isExecutingGoal = false;
                this.lastActionMs = Date.now();
            });
        }
    }

    setProviders(computerControl, visionProcessing) {
        this.computerControl = computerControl;
        this.visionProcessing = visionProcessing;
    }

    setChannel(channel) {
        if (channel === this.channel) return;
        this.channel = channel;
        this.lastHash = null; 
        this.logger.info(`[VisionDaemon] Switched channel to: ${channel}`);
    }

    async tick() {
        if (!this.computerControl) return;

        // Adaptive Polling Logic
        const timeSinceAction = Date.now() - this.lastActionMs;
        if (this.isExecutingGoal) {
            this.interval = 500; // SURGICAL mode
        } else if (timeSinceAction < 30000) {
            this.interval = 3000; // ACTIVE mode
        } else {
            this.interval = 10000; // IDLE mode
        }

        try {
            // 1. Capture Frame
            const capture = await this.computerControl.captureScreen({ format: 'png' });
            if (!capture.success) {
                this.logger.warn(`[VisionDaemon] Capture failed: ${capture.error}`);
                return;
            }

            this.metrics.framesCaptured++;
            const imagePath = capture.imagePath;

            // 2. Hash to detect visual delta
            const hash = await this._hashImage(imagePath);
            if (hash === this.lastHash) {
                return; // No change
            }

            this.metrics.deltasDetected++;
            this.lastHash = hash;

            // 3. Process with Brain (CLIP)
            if (this.visionProcessing) {
                const t0 = Date.now();
                const analysis = await this.visionProcessing.detectObjects(imagePath);
                
                if (analysis.success) {
                    this.metrics.analysisCount++;
                    this.metrics.lastAnalysisMs = Date.now() - t0;
                    // Include imagePath in lastPerception so perceptionRoutes /vision/last exposes it
                    this.lastPerception = { ...analysis, imagePath, channel: this.channel };
                    this.perceptionCount++;

                    // 4. Emit Perception Signal
                    this.emitSignal('vision.perceived', {
                        channel: this.channel,
                        imagePath,
                        analysis,
                        ghostCursor: this.ghostCursor,
                        count: this.perceptionCount,
                        timestamp: Date.now()
                    }, 'normal');

                    this.logger.info(`[VisionDaemon] 🧠 Perceived: ${analysis.objects[0]?.label || 'Nothing specific'} (${this.metrics.lastAnalysisMs}ms)`);
                }
            } else {
                this.emitSignal('vision.delta', {
                    channel: this.channel,
                    imagePath,
                    timestamp: Date.now()
                }, 'low');
            }

        } catch (err) {
            this.logger.error(`[VisionDaemon] Error during tick: ${err.message}`);
        }
    }

    /**
     * Hand-Eye Verification: Confirmation Pulse
     * Validates that a physical action resulted in a visual change.
     */
    async _verifyAction(actionPayload) {
        if (!this.computerControl) return;

        // 1. Check at T+250ms: Did anything change?
        await this.sleep(250);
        let capture = await this.computerControl.captureScreen({ format: 'png' });
        if (!capture.success) return;
        
        let hash250 = await this._hashImage(capture.imagePath);
        const changedAt250 = (hash250 !== this.lastHash);

        // 2. Check at T+800ms: Did it stabilize?
        await this.sleep(550); // Total 800ms
        capture = await this.computerControl.captureScreen({ format: 'png' });
        if (!capture.success) return;

        let hash800 = await this._hashImage(capture.imagePath);
        const changedAt800 = (hash800 !== this.lastHash);

        // Update baseline hash to prevent duplicate tick() processing
        this.lastHash = hash800;

        if (!changedAt250 && !changedAt800) {
            this.logger.warn(`[VisionDaemon] ⚠️ Hand-Eye Verification FAILED: Screen identical after ${actionPayload.action}.`);
            this.emitSignal('vision.action.unverified', {
                action: actionPayload,
                reason: 'No visual change detected after 800ms',
                timestamp: Date.now()
            }, 'high');
            return;
        }

        // It changed, run semantic check if possible
        if (this.visionProcessing) {
            const t0 = Date.now();
            const analysis = await this.visionProcessing.detectObjects(capture.imagePath);
            
            if (analysis.success) {
                this.metrics.analysisCount++;
                this.metrics.lastAnalysisMs = Date.now() - t0;
                this.lastPerception = { ...analysis, imagePath: capture.imagePath, channel: this.channel };
                this.perceptionCount++;

                this.emitSignal('vision.action.verified', {
                    action: actionPayload,
                    analysis,
                    timestamp: Date.now()
                }, 'normal');

                this.emitSignal('vision.perceived', {
                    channel: this.channel,
                    imagePath: capture.imagePath,
                    analysis,
                    ghostCursor: this.ghostCursor,
                    count: this.perceptionCount,
                    timestamp: Date.now()
                }, 'normal');
                
                this.logger.info(`[VisionDaemon] ✅ Action Verified: ${analysis.objects[0]?.label || 'Screen changed'}`);
            }
        } else {
            this.emitSignal('vision.action.verified', {
                action: actionPayload,
                reason: 'Visual delta detected',
                timestamp: Date.now()
            }, 'normal');
        }
    }

    async _hashImage(filePath) {
        try {
            const data = await fs.readFile(filePath);
            return crypto.createHash('md5').update(data).digest('hex');
        } catch (e) {
            return null;
        }
    }

    health() {
        return {
            ...super.health(),
            channel: this.channel,
            metrics: this.metrics,
            hasBrain: !!this.visionProcessing,
            hasHands: !!this.computerControl
        };
    }
}

export default VisionDaemon;
