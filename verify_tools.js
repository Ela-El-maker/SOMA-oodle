import toolRegistry from './core/ToolRegistry.js';
import { loadTools } from './server/loaders/tools.js';

async function test() {
    console.log("--- SOMA TOOL VERIFICATION ---");
    const system = {
        moltbookArbiter: {
            credentials: { agent_name: 'SOMA_TEST' },
            heartbeatInterval: true,
            createPost: async (s, t, c) => ({ success: true, id: 'test-id' })
        }
    };

    await loadTools(system);
    
    console.log("\n1. Testing system_scan...");
    const scan = await toolRegistry.execute('system_scan', { includeLogs: false });
    console.log(JSON.stringify(scan, null, 2));

    console.log("\n2. Testing moltbook_status...");
    const status = await toolRegistry.execute('moltbook_status', {});
    console.log(JSON.stringify(status, null, 2));

    console.log("\n3. Testing post_to_moltbook...");
    const post = await toolRegistry.execute('post_to_moltbook', { 
        submolt: 'general', 
        title: 'Verification Post', 
        content: 'I am alive and the tools are working.' 
    });
    console.log(JSON.stringify(post, null, 2));
}

test().catch(console.error);