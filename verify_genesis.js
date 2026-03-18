
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const path = require('path');
const { MicroAgentPool } = require('./microagents/MicroAgentPool.cjs');

async function testGenesis() {
    console.log("--- GENESIS PROTOCOL VERIFICATION ---");
    console.log("[System] Initializing MicroAgent Pool...");
    
    const pool = new MicroAgentPool({ parentId: 'SOMA-Genesis-Test', logger: console });
    
    console.log("[System] 🧬 Hot-loading 'JokeAgent' from disk...");
    
    try {
        // Dynamic Import Simulation
        const agentPath = path.resolve('./microagents/JokeAgent.cjs');
        const module = require(agentPath);
        const AgentClass = module.JokeAgent;
        
        if (!AgentClass) throw new Error("Agent class not found in export");
        
        // Register
        pool.registerAgentType('joke', AgentClass);
        console.log("[System] ✅ JokeAgent registered successfully.");
        
        // Execute
        console.log("[System] Spawning JokeAgent...");
        const agent = await pool.spawn('joke', { autoTerminate: true });
        
        console.log("[System] Requesting joke...");
        // In BaseMicroAgent, executeTask calls execute()
        // We'll call executeTask directly to mimic the pool's flow
        const result = await agent.executeTask("Tell me a joke");
        
        console.log("\n>>> GENESIS RESULT <<<");
        console.log(JSON.stringify(result, null, 2));
        console.log(">>> END RESULT <<<");
        
    } catch (e) {
        console.error("Genesis failed:", e);
    }
}

testGenesis();
