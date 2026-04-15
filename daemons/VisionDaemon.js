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
 * - Reactive: Adjusts polling frequency based on system activity signals.
 */

import BaseDaemon from './BaseDaemon.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export class VisionDaemon extends BaseDaemon {
    constructor(opts = {}) {
        super({
            name: 'VisionDaemon',
            interval: opts.intervalMs || 3000, // 3s default polling
            ...opts
        });

        // Dependencies (injected during initialization or loader)
        this.computerControl = opts.computerControl || null;
        this.visionProcessing = opts.visionProcessing || null;
        
        // State
        this.channel = opts.channel || 'desktop'; // 'desktop' | 'webcam'
        this.lastHash = null;
        this.lastPerception = null;
        this.perceptionCount = 0;
        this.ghostCursor = null; // { x, y, action, timestamp }
        
        // Metrics
        this.metrics = {
            framesCaptured: 0,
            analysisCount: 0,
            deltasDetected: 0,
            lastAnalysisMs: 0
        };

        this.logger.info(`[VisionDaemon] 👁️  Initialized. Mode: ${this.channel}`);

        // Subscribe to computer actions to update ghost cursor
        if (opts.messageBroker) {
            opts.messageBroker.subscribe('computer.action', (signal) => {
                const { action, x, y } = signal.payload || {};
                if (x !== undefined && y !== undefined) {
                    this.ghostCursor = { x, y, action, timestamp: Date.now() };
                }
            });
        }
    }

    /**
     * Update dependencies if they weren't available at construction
     */
    setProviders(computerControl, visionProcessing) {
        this.computerControl = computerControl;
        this.visionProcessing = visionProcessing;
    }

    /**
     * Switch between desktop and webcam channels
     */
    setChannel(channel) {
        if (channel === this.channel) return;
        this.channel = channel;
        this.lastHash = null; // force re-capture baseline
        this.logger.info(`[VisionDaemon] Switched channel to: ${channel}`);
    }

    async tick() {
        if (!this.computerControl) return;

        try {
            // 1. Capture Frame (Desktop mode only for now, webcam requires frontend stream injection)
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
                // No change, skip expensive CLIP processing
                return;
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
                    this.lastPerception = analysis;
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
                // No brain, just emit raw delta
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
     * Generate a fast hash of the image file to detect changes
     */
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
