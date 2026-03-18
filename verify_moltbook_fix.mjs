
import { MoltbookArbiter } from './arbiters/MoltbookArbiter.js';
import path from 'path';

async function test() {
    console.log("--- Moltbook Registration Test ---");
    const mb = new MoltbookArbiter({
        name: 'TestMoltbook'
    });

    console.log("Initializing MoltbookArbiter...");
    try {
        await mb.initialize();
        
        if (mb.credentials) {
            console.log("✅ SUCCESS: Credentials loaded!");
            console.log("Agent Name:", mb.credentials.agent_name);
            console.log("API Key present:", !!mb.credentials.api_key);
        } else {
            console.log("❌ FAILURE: Credentials NOT loaded.");
        }
    } catch (e) {
        console.error("❌ ERROR during initialization:", e);
    }
}

test();
