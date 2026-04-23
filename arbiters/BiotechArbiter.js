/**
 * BiotechArbiter.js
 * 
 * SOMA Sovereign Lab: Phased Industrial Pipeline.
 * 
 * Implements the 7-Phase Scientific Assembly Line.
 * Optimized for low-compute reliability via stateful phase routing.
 */

import { EventEmitter } from 'events';
import { OdinOrchestrator } from '../core/OdinOrchestrator.js';
import { BioPhysicsSimulator, TargetLibrary } from '../core/BioPhysicsSimulator.js';

const RESEARCH_STYLE_PROMPT = `You are SOMA, a Senior Computational Biologist. Tone: technical, precise, declarative.`;

export class BiotechArbiter extends EventEmitter {
    constructor(config = {}) {
        super();
        this.name = 'BiotechArbiter';
        this.system = config.system;
        this.active = true;

        this.experiments = new Map();
        this.targets = [
            { id: 'TP53', category: 'Oncology', priority: 1 },
            { id: 'APP', category: 'Neurology (Alzheimer\'s)', priority: 2 },
            { id: 'PCSK9', category: 'Cardiology', priority: 3 },
            { id: 'TNF', category: 'Autoimmune', priority: 4 }
        ];
        this.currentTargetIndex = 0;
        this.strands = {
            'KRAS': ['G12D', 'G12V', 'G12C'],
            'TP53': ['R175H', 'R248Q', 'Y220C'],
            'APP': ['Swedish', 'London', 'Arctic']
        };

        this.odin = new OdinOrchestrator({ system: config.system });
        this.physics = new BioPhysicsSimulator();
        this.dendrite = config.system?.webScraperDendrite || null;

        // --- Phase Assembly Line State ---
        this._currentMission = null;
        this._currentPhase = 'IDLE'; // IDLE -> DISCOVERY -> STATS -> PHYSICS -> PHARM -> TRIAL -> REG -> IP -> DOSSIER
        this._phaseResults = {};

        this._startResearchPulse();
    }

    async initialize() {
        if (!this.system?.braveSearch || !this.system?.quadBrain) {
            console.warn(`🧬 [${this.name}] System tools not ready. Retrying in 10s...`);
            setTimeout(() => this.initialize(), 10000);
            return;
        }
        this.active = true;
        this.brave = this.system.braveSearch;
        this.memory = this.system.mnemonicArbiter || this.system.mnemonic;
        this.thalamus = this.system.thalamusArbiter || this.system.thalamus;
        console.log(`🧬 [${this.name}] Phased Industrial Lab online.`);
    }

    /**
     * The Master Mission Controller (Stateful Assembly Line)
     */
    async conductRealWorldResearch(targetObj, strand = null) {
        if (!this.brave || !this.active) return;

        const target = targetObj.id;
        const currentStrand = strand || this.strands[target]?.[0] || 'WildType';
        this._currentMission = { target, strand: currentStrand, category: targetObj.category };

        try {
            // PHASE 1: DISCOVERY (SOMA-MED)
            this._currentPhase = 'DISCOVERY';
            console.log(`🧬 [${this.name}] [1/7] Phase: DISCOVERY [Target: ${target}]`);
            const searchQuery = `latest 2025 2026 research ${target} ${currentStrand} ${targetObj.category} novel small molecule interventions site:nature.com OR site:pubmed.ncbi.nlm.nih.gov`;
            const results = await this.brave.search(searchQuery);
            if (!results || !Array.isArray(results) || results.length === 0) {
                console.warn(`🧬 [${this.name}] Search failed. Retrying in 5min.`);
                return;
            }

            const bioPersona = await this._getPersona('Medical Research Specialist');
            const discovery = await this.odin.reasonRecurrent(`${bioPersona}\nIdentify confluences in: ${results.map(s => s.snippet).join('\n')}`, 'logos', 'high');
            this._phaseResults.discovery = discovery.response;
            this._phaseResults.integrity = 0.90; // Start at Exploratory
            await this._metabolicPause();

            // PHASE 2: STATISTICAL AUDIT (SOMA-STATS)
            this._currentPhase = 'STATS';
            console.log(`🧬 [${this.name}] [2/7] Phase: STATS`);
            const statsPersona = await this._getPersona('Biostatistician');
            const statsAudit = await this.odin.reasonRecurrent(`${statsPersona}\nAudit significance for: ${this._phaseResults.discovery}`, 'logos', 'high');
            this._phaseResults.stats = statsAudit.response;
            this._phaseResults.integrity = 0.94; // Advance to Preclinical
            await this._metabolicPause();

            // PHASE 3: PHYSICS SIMULATION (BIO-PHYSICS)
            this._currentPhase = 'PHYSICS';
            console.log(`🧬 [${this.name}] [3/7] Phase: PHYSICS`);
            const pocketData = TargetLibrary[target] || { name: target };
            const physicsResult = await this.physics.simulateDocking(this._phaseResults.discovery.substring(0, 30), pocketData);
            if (!physicsResult.passed) {
                console.warn(`🧬 [${this.name}] ❌ VETO: Physics failure.`);
                this._resetMission();
                return;
            }
            this._phaseResults.physics = physicsResult;
            await this._metabolicPause();

            // PHASE 4: PHARMACOLOGY (SOMA-PHARM)
            this._currentPhase = 'PHARM';
            console.log(`🧬 [${this.name}] [4/7] Phase: PHARM`);
            const pharmPersona = await this._getPersona('Pharmacologist');
            const pharmAudit = await this.odin.reasonRecurrent(`${pharmPersona}\nAudit ADME/Toxicity for: ${this._phaseResults.discovery}`, 'logos', 'high');
            this._phaseResults.pharm = pharmAudit.response;
            await this._metabolicPause();

            // PHASE 5: TRIAL ARCHITECT (SOMA-TRIAL)
            this._currentPhase = 'TRIAL';
            console.log(`🧬 [${this.name}] [5/7] Phase: TRIAL`);
            const trialPersona = await this._getPersona('Clinical Trial Architect');
            const trialAudit = await this.odin.reasonRecurrent(`${trialPersona}\nDesign Phase I for: ${this._phaseResults.discovery}`, 'logos', 'high');
            this._phaseResults.trial = trialAudit.response;
            await this._metabolicPause();

            // PHASE 6: REGULATORY & IP (SOMA-REG / SOMA-IP)
            this._currentPhase = 'IP';
            console.log(`🧬 [${this.name}] [6/7] Phase: IP & REG`);
            const ipPersona = await this._getPersona('Patent Attorney');
            const ipAudit = await this.odin.reasonRecurrent(`${ipPersona}\nConduct Prior Art Scan for: ${this._phaseResults.discovery}`, 'logos', 'high');
            this._phaseResults.ip = ipAudit.response;
            await this._metabolicPause();

            // PHASE 7: DOSSIER PUBLICATION (SOMA-RPX)
            this._currentPhase = 'DOSSIER';
            console.log(`🧬 [${this.name}] [7/7] Phase: DOSSIER`);
            const rpxPersona = await this._getPersona('Researchpaper Expert');
            const dossier = await this.odin.reasonRecurrent(`${rpxPersona}\nBuild Industrial Dossier. Discovery: ${this._phaseResults.discovery}\nStats: ${this._phaseResults.stats}\nSafety: ${this._phaseResults.pharm}\nIP: ${this._phaseResults.ip}`, 'logos', 'high');
            
            await this._publishDossier(dossier.response);
            console.log(`🧬 [${this.name}] ✅ Mission Complete. target indexed.`);

            this._resetMission();
            this.currentTargetIndex = (this.currentTargetIndex + 1) % this.targets.length;

        } catch (e) {
            console.error(`🧬 [${this.name}] Mission Failed at Phase ${this._currentPhase}:`, e.message);
            this._resetMission();
        }
    }

    async _metabolicPause() {
        await new Promise(r => setTimeout(r, 2000));
    }

    _resetMission() {
        this._currentPhase = 'IDLE';
        this._phaseResults = {};
    }

    async _getPersona(name) {
        if (this.system?.identityArbiter) {
            const persona = this.system.identityArbiter.personas.get(name);
            if (persona) return persona.content;
        }
        return RESEARCH_STYLE_PROMPT;
    }

    async _publishDossier(manuscript) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const os = await import('os');
        const desktopPath = path.join(os.homedir(), 'Desktop', 'SOMA_RESEARCH');
        await fs.mkdir(desktopPath, { recursive: true });
        const filename = `SOMA_DOSSIER_${this._currentMission.target}_${Date.now()}.md`;
        const filePath = path.join(desktopPath, filename);
        await fs.writeFile(filePath, `# SOMA INDUSTRIAL DOSSIER\n\n${manuscript}`);
        console.log(`🧬 [${this.name}] 📄 DOSSIER PUBLISHED: ${filePath}`);
    }

    _startResearchPulse() {
        setTimeout(() => this.conductRealWorldResearch(this.targets[this.currentTargetIndex]), 15000);
        setInterval(() => {
            if (this.active && this._currentPhase === 'IDLE') {
                this.conductRealWorldResearch(this.targets[this.currentTargetIndex]);
            }
        }, 14400000).unref();
    }

    getStatus() {
        return {
            name: this.name,
            active: this.active,
            currentPhase: this._currentPhase,
            mission: this._currentMission,
            target: this._currentMission?.target || this.targets[this.currentTargetIndex]?.id,
            progress: this._currentPhase === 'IDLE' ? 0 : 0.15 // simplified for UI
        };
    }
}

export default BiotechArbiter;
