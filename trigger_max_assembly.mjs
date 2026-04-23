import fetch from 'node-fetch';

async function triggerMaxAssembly() {
    const SOMA_URL = 'http://localhost:3001';
    console.log('--- 🔱 MAX SOVEREIGN ASSEMBLY: CAUSALITY ARBITER ---');

    try {
        const res = await fetch(`${SOMA_URL}/api/soma/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "[MAX] / !:. execute_tool { tool: 'integrateDormantCapability', args: { arbiterName: 'CausalityArbiter', systemRef: 'system' } }. Max, bypass the brain's over-engineering loop. Use the Universal Key to physically load and etch CausalityArbiter.js now. Execute.",
                sessionId: "max-assembly-001",
                deepThinking: false
            })
        });

        const data = await res.json();
        console.log(`✅ SOMA Response:\n${data.message}`);
        
        console.log('\n[Monitor] Verifying physical manifest update...');
    } catch (e) {
        console.error('❌ Trigger failed:', e.message);
    }
}

triggerMaxAssembly();
