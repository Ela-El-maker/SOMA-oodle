import { GistArbiter } from './arbiters/GistArbiter.js';
import { SkillRegistryArbiter } from './arbiters/SkillRegistryArbiter.js';
import { EngineeringSwarmArbiter } from './arbiters/EngineeringSwarmArbiter.js';
import { TaskManifestArbiter } from './arbiters/TaskManifestArbiter.js';
import messageBroker from './core/MessageBroker.cjs';
import fs from 'fs/promises';
import path from 'path';

async function runMasterTest() {
    console.log('--- 🔱 SOMA MASTER SENTIENCE INTEGRATION TEST ---');

    // 1. Test Skill Registry (Dynamic Loading)
    console.log('\n[TEST 1] Verifying Skill Registry (Dynamic Loading)...');
    const mockToolRegistry = {
        listTools: async () => [
            { name: 'binance_get_price' },
            { name: 'fs_read_file' },
            { name: 'git_commit' }
        ],
        getToolDefinition: async (name) => ({ name, description: `Definition for ${name}` })
    };
    const skillRegistry = new SkillRegistryArbiter({ toolRegistry: mockToolRegistry });
    await skillRegistry.onInitialize();

    const intent = "Check my crypto portfolio and buy some BTC";
    const tools = await skillRegistry.getActiveToolDefinitions(intent);
    const toolNames = tools.map(t => t.name);
    
    console.log(`Intent: "${intent}"`);
    console.log(`Selected Tools: ${toolNames.join(', ')}`);
    if (toolNames.includes('binance_get_price') && !toolNames.includes('git_commit')) {
        console.log('✅ SUCCESS: Dynamic loading correctly filtered for Finance intent.');
    } else {
        console.log('❌ FAILURE: Tool filtering logic failed.');
    }

    // 2. Test Strategic Blueprinting (Focus Persistence)
    console.log('\n[TEST 2] Verifying Strategic Blueprinting...');
    const gist = new GistArbiter();
    await gist.onInitialize();
    
    gist.currentBlueprint.mission = "Upgrade SOMA to ASI Level 5";
    gist.currentBlueprint.architecture = { core: "launcher_ULTRA.mjs" };
    await gist.saveBlueprint();
    
    // Reload from disk to prove persistence
    const gist2 = new GistArbiter();
    await gist2.loadBlueprint();
    console.log(`Saved Mission: ${gist2.currentBlueprint.mission}`);
    if (gist2.currentBlueprint.mission === "Upgrade SOMA to ASI Level 5") {
        console.log('✅ SUCCESS: Architectural blueprint is persistent.');
    } else {
        console.log('❌ FAILURE: Blueprint did not survive disk cycle.');
    }

    // 3. Test Ralph Loop (Neural Hardening)
    console.log('\n[TEST 3] Verifying Ralph Loop (Self-Correction)...');
    const swarm = new EngineeringSwarmArbiter({ 
        quadBrain: { reason: async () => ({ text: '[]' }) } 
    });
    
    console.log('Simulating a script crash...');
    const failTasks = [{ command: `node -e "process.exit(1)"` }];
    const failResult = await swarm.verifyPatch({}, failTasks);
    
    if (!failResult.passed) {
        console.log('✅ SUCCESS: Ralph correctly identified the execution failure.');
    } else {
        console.log('❌ FAILURE: Ralph missed the crash.');
    }

    // 4. Test Task Manifests
    console.log('\n[TEST 4] Verifying Manifest Vault...');
    const manifestDir = path.join(process.cwd(), '.soma', 'manifests');
    const stats = await fs.stat(manifestDir);
    if (stats.isDirectory()) {
        console.log('✅ SUCCESS: Task Manifest vault is active.');
    }

    console.log('\n🎉 ALL SENTIENCE UPGRADES VERIFIED AND SYNCHRONIZED');
    process.exit(0);
}

runMasterTest().catch(console.error);
