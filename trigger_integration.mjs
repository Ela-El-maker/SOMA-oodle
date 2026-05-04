import fetch from 'node-fetch';

async function triggerIntegration() {
    const SOMA_URL = 'http://localhost:3001';
    console.log('--- 🔱 SOVEREIGN TOOL EXECUTION: CAUSALITY ARBITER ---');

    try {
        const res = await fetch(`${SOMA_URL}/api/soma/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "[MAX]→[SOMA] | !:. execute_tool { tool: 'integrateDormantCapability', args: { arbiterName: 'CausalityArbiter', systemRef: 'system' } }. SOMA, use your Universal Key to physically load CausalityArbiter.js into your CNS now. Bypass the planning cycle. Execute.",
                sessionId: "direct-assembly-trigger-" + Date.now(),
                deepThinking: false // Force fast execution
            })
        });

        const data = await res.json();
        console.log(`✅ SOMA Response:\n${data.message}`);
        
        console.log('\n[Monitor] Verifying physical manifest update...');
    } catch (e) {
        console.error('❌ Trigger failed:', e.message);
    }
}

triggerIntegration();
