/**
 * MaterialsScienceArbiter.js
 * 
 * SOMA Multi-domain scientific research engine — Phased Edition.
 * 
 * Research programs: photonics, batteries, robotics, advanced_alloys.
 */

import { BaseArbiterV4, ArbiterRole, ArbiterCapability } from './BaseArbiter.js';
import { EventEmitter } from 'events';

export class MaterialsScienceArbiter extends BaseArbiterV4 {
    constructor(opts = {}) {
        super({
            ...opts,
            name: 'MaterialsScience',
            role: ArbiterRole.MAINTAINER,
            capabilities: [ArbiterCapability.KNOWLEDGE_SYNTHESIS, ArbiterCapability.SYSTEM_AUDIT]
        });

        this.active = true;
        this.discoveries = new Map();

        // --- Phased Assembly Line State ---
        this._currentPhase = 'IDLE'; 
        this._phaseResults = {};
        this._currentMission = null;

        this._startResearchPulse();
    }

    async initialize() {
        this.brave = this.system?.braveSearch;
        this.memory = this.system?.mnemonicArbiter || this.system?.mnemonic;
        console.log(`🔬 [${this.name}] Phased Materials Lab online.`);
    }

    async _metabolicPause() {
        await new Promise(r => setTimeout(r, 2000));
    }

    async conductResearch(program) {
        if (!this.active || !this.brave) return;
        this._currentMission = { target: program, category: 'Materials' };

        try {
            // PHASE 1: SOURCING
            this._currentPhase = 'SOURCING';
            console.log(`🔬 [${this.name}] [1/3] Phase: SOURCING [Program: ${program}]`);
            const query = `latest 2025 2026 ${program} breakthrough research confluences site:nature.com OR site:arxiv.org`;
            const results = await this.brave.search(query);
            this._phaseResults.sources = results;
            await this._metabolicPause();

            // PHASE 2: SYNTHESIS (ODIN)
            this._currentPhase = 'SYNTHESIS';
            console.log(`🔬 [${this.name}] [2/3] Phase: SYNTHESIS`);
            const prompt = `You are a Materials Scientist. Analyze these confluences for ${program}:\n${results.map(s => s.snippet).join('\n')}\nIdentify ONE unconventional link.`;
            const discovery = await this.system.quadBrain.reason(prompt, { lobe: 'logos', complexity: 'high' });
            this._phaseResults.discovery = discovery.response;
            await this._metabolicPause();

            // PHASE 3: PUBLICATION
            this._currentPhase = 'PUBLICATION';
            console.log(`🔬 [${this.name}] [3/3] Phase: PUBLICATION`);
            await this._publishReport(program, this._phaseResults.discovery);
            
            this._currentPhase = 'IDLE';
            console.log(`✅ [${this.name}] Research Complete: ${program}`);

        } catch (e) {
            console.error(`🔬 [${this.name}] Research stalled:`, e.message);
            this._currentPhase = 'IDLE';
        }
    }

    async _publishReport(program, synthesis) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const os = await import('os');
        const desktopPath = path.join(os.homedir(), 'Desktop', 'SOMA_RESEARCH');
        await fs.mkdir(desktopPath, { recursive: true });
        
        const filename = `SOMA_MATERIALS_${program}_${Date.now()}.md`;
        const filePath = path.join(desktopPath, filename);
        const content = `# SOMA MATERIALS SCIENCE REPORT\n## Program: ${program}\n\n${synthesis}`;
        
        await fs.writeFile(filePath, content);
        console.log(`🔬 [${this.name}] 📄 MATERIALS DOSSIER PUBLISHED: ${filePath}`);
    }

    _startResearchPulse() {
        // Run first mission immediately
        setTimeout(() => this.conductResearch('photonic_computing'), 30000);
    }

    getStatus() {
        return {
            name: this.name,
            active: this.active,
            currentPhase: this._currentPhase,
            target: this._currentMission?.target || 'Ready',
            experimentsCount: this.discoveries.size
        };
    }
}

export default MaterialsScienceArbiter;
