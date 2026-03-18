
import MnemonicArbiter from './arbiters/MnemonicArbiter.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testMemory() {
    console.log("Starting Memory Test...");
    
    // Create instance
    const memory = new MnemonicArbiter({
        dbPath: path.join(__dirname, 'test_memory.db'),
        vectorDbPath: path.join(__dirname, 'test_vectors.json'),
        enableAutoCleanup: false
    });

    try {
        // Initialize
        await memory.initialize();
        console.log("Initialization complete.");
        
        // Store
        console.log("Storing fact...");
        const storeResult = await memory.remember("My name is Barry", { type: 'fact', importance: 1.0 });
        console.log("Store result:", storeResult);

        // Recall
        console.log("Recalling fact...");
        const recallResult = await memory.recall("What is my name?");
        console.log("Recall result:", JSON.stringify(recallResult, null, 2));

        if (recallResult.results && recallResult.results.length > 0) {
            console.log("SUCCESS: Memory recalled.");
        } else {
            console.error("FAILURE: Memory not recalled.");
        }

    } catch (error) {
        console.error("TEST FAILED with error:", error);
    } finally {
        await memory.shutdown();
    }
}

testMemory();
