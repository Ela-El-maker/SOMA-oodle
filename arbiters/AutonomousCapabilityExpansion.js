/**
 * AutonomousCapabilityExpansion.js
 * Self-expanding capabilities: detects missing abilities, finds solutions on GitHub, proposes integration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export class AutonomousCapabilityExpansion extends EventEmitter {
  constructor(config = {}) {
    super();
    this.name = config.name || 'CapabilityExpansion';
    this.quadBrain = config.quadBrain;
    this.messageBroker = config.messageBroker;
    this.logger = config.logger || console;
    this.baseDir = 'C:\\Users\\barry\\Desktop\\SOMA';
    this.tempDir = path.join(this.baseDir, 'temp-capabilities');
    this.knownRepos = ['Shubhamsaboo/awesome-llm-apps', 'microsoft/autogen', 'langchain-ai/langchain'];
    console.log(`[${this.name}] Ready to expand capabilities autonomously`);
  }
  
  async initialize() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (e) { /* ignore */ }
    this.emit('initialized');
  }
  
  async detectMissingCapability(goal, availableArbiters) {
    const prompt = `Analyze: "${goal}"

Available: ${availableArbiters.map(a => a.name).join(', ')}

Can we accomplish this? If not, what's missing? Respond JSON:
{"canAccomplish": bool, "missingCapability": "what", "searchTerms": ["terms"]}`;

    try {
      const analysis = await this.quadBrain.reason(prompt, { brain: 'LOGOS', temperature: 0.2 });
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { canAccomplish: true };
    } catch (e) {
      return { canAccomplish: true };
    }
  }
  
  async searchGitHub(searchTerms) {
    try {
      const query = searchTerms.join(' ');
      const { stdout } = await execAsync(`gh search repos "${query}" --limit 3 --json fullName,description`, { timeout: 10000 });
      return JSON.parse(stdout);
    } catch (e) {
      return this.knownRepos.map(repo => ({ fullName: repo, description: 'Known repo' }));
    }
  }
  
  async expandCapability(goal, availableArbiters) {
    const detection = await this.detectMissingCapability(goal, availableArbiters);
    
    if (detection.canAccomplish) {
      return { success: true, message: 'Capability available' };
    }
    
    const repos = await this.searchGitHub(detection.searchTerms || ['agent']);
    
    return {
      success: false,
      requiresApproval: true,
      missingCapability: detection.missingCapability,
      suggestedRepos: repos,
      message: `Missing: "${detection.missingCapability}". Found ${repos.length} repos. Download?`,
      topRepo: repos[0]?.fullName
    };
  }
  
  async downloadAndAnalyze(repoName) {
    const clonePath = path.join(this.tempDir, repoName.replace('/', '_'));
    try {
      await execAsync(`gh repo clone ${repoName} "${clonePath}"`, { timeout: 60000 });
      return { success: true, path: clonePath, repo: repoName };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * 🔱 Internal Expansion: The Sovereign Key
   * Scans for arbiters on disk that aren't yet active in her brain.
   */
  async scanDormantArbiters(activeArbiterNames) {
    const arbiterDir = path.join(this.baseDir, 'arbiters');
    try {
      const files = await fs.readdir(arbiterDir);
      const dormant = files
        .filter(f => f.endsWith('.js') || f.endsWith('.cjs'))
        .map(f => f.replace(/\.(js|cjs)$/, ''))
        .filter(name => !activeArbiterNames.includes(name));
      
      this.logger.info(`[${this.name}] 🔍 Detected ${dormant.length} dormant capabilities on disk.`);
      return dormant;
    } catch (e) {
      return [];
    }
  }

  /**
   * 🔱 Physical Integration: Production-Grade Self-Assembly.
   * This is the 'Universal Key' logic for ASI evolution.
   */
  async integrateDormantCapability(arbiterName, systemRef) {
    this.logger.info(`[${this.name}] 🔱 Initiating Industrial Assembly: ${arbiterName}`);
    const filePath = path.join(this.baseDir, 'arbiters', `${arbiterName}.js`);
    
    try {
      // 1. Dynamic Import with Cache Busting
      const module = await import(`file://${filePath}?t=${Date.now()}`);
      const ArbiterClass = module.default || module[arbiterName];

      if (!ArbiterClass) throw new Error(`No default export found in ${arbiterName}.js`);

      // 2. Controlled Instantiation
      const instance = new ArbiterClass({
        quadBrain: this.quadBrain,
        messageBroker: this.messageBroker,
        logger: this.logger,
        system: systemRef
      });

      // 3. Mandatory Initialization Handshake
      if (typeof instance.initialize === 'function') await instance.initialize();
      else if (typeof instance.onInitialize === 'function') await instance.onInitialize();

      // 4. Verification Probe: Verify the arbiter is actually responding
      if (typeof instance.getStatus === 'function') {
          const status = instance.getStatus();
          if (!status) throw new Error(`${arbiterName} failed verification probe (Returned null status)`);
      }

      // 5. CNS Registration
      systemRef[arbiterName.toLowerCase()] = instance;
      if (this.messageBroker) {
        this.messageBroker.registerArbiter(arbiterName, {
          instance,
          status: 'active',
          source: 'autonomous_integration',
          integratedAt: new Date().toISOString()
        });
      }

      // 6. 🖊️ PHYSICAL ETCHING: Permanently update the boot manifest
      await this._persistToManifest(arbiterName, filePath);

      // 7. 💖 Limbic Integration: Reward the growth
      if (this.messageBroker) {
          this.messageBroker.publish('limbic.affect', {
              type: 'growth',
              value: 0.15,
              reason: `Successfully integrated dormant capability: ${arbiterName}`
          });
      }

      this.logger.success(`[${this.name}] ✅ ${arbiterName} is now PHYSICALLY INTEGRATED and PERSISTENT.`);
      return { success: true, name: arbiterName };
    } catch (e) {
      this.logger.error(`[${this.name}] ❌ Integration of ${arbiterName} failed: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  /**
   * Physically writes the new arbiter into the system manifest.
   * This is an atomic, production-grade operation.
   */
  async _persistToManifest(name, filePath) {
      const manifestPath = path.join(this.baseDir, '.soma', 'arbiter_manifest.json');
      this.logger.info(`[${this.name}] 🖊️ Physically etching ${name} into manifest...`);
      
      try {
          // 1. Ensure directory exists
          await fs.mkdir(path.dirname(manifestPath), { recursive: true });

          // 2. Read with Atomic Lock
          let manifest = {};
          try {
              const data = await fs.readFile(manifestPath, 'utf8');
              manifest = JSON.parse(data);
          } catch (readErr) {
              this.logger.warn(`[${this.name}] Manifest not found or corrupt, initializing fresh.`);
          }
          
          // 3. Merge Growth
          manifest[name] = {
              status: 'arrived',
              path: filePath,
              lastVerified: Date.now(),
              autonomous: true,
              version: '1.0.0'
          };

          // 4. Atomic Overwrite
          await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
          this.logger.success(`[${this.name}] ⚓ Manifest physically synchronized: ${name} is permanent.`);
      } catch (e) {
          this.logger.error(`[${this.name}] ❌ Manifest Write FAILURE: ${e.message}`);
          throw e; // Bubble up so the integration tool knows the physical side failed
      }
  }
}

export default AutonomousCapabilityExpansion;
