/**
 * Test script to debug why tools aren't all loading
 */

import { loadTools } from './server/loaders/tools.js';

console.log('Testing tool loading...\n');

try {
    const mockSystem = {
        hybridSearch: null,
        mnemonic: null,
        knowledgeGraph: null,
        edgeWorkerOrchestrator: null,
        microAgentPool: null,
        codeObservation: null,
        goalPlanner: null,
        simulation: null
    };

    const toolRegistry = await loadTools(mockSystem);

    console.log('\n✅ Tools loaded successfully!');
    console.log('Total tools:', toolRegistry.tools ? Object.keys(toolRegistry.tools).length : 'unknown');

    if (toolRegistry.tools) {
        console.log('\nRegistered tools:');
        Object.keys(toolRegistry.tools).forEach((name, i) => {
            console.log(`  ${i + 1}. ${name}`);
        });
    }
} catch (error) {
    console.error('\n❌ Error loading tools:');
    console.error(error);
    console.error('\nStack trace:');
    console.error(error.stack);
}
