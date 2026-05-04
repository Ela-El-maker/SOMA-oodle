import fetch from 'node-fetch';

async function runLiveMission() {
    const SOMA_URL = 'http://localhost:3001';
    console.log('--- 🔱 STARTING SOMA LIVE MISSION TEST ---');

    try {
        // 1. Send the directive to architect a new tool
        console.log('[Phase 1] Sending Directive: Build File Integrity Scanner...');
        const chatRes = await fetch(`${SOMA_URL}/api/soma/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "Architect and initiate a Poseidon voyage to build a 'FileIntegrityScanner' tool. Use Trident to break it down and Odyssey to start the voyage.",
                sessionId: "live-mission-test",
                deepThinking: true
            })
        });

        if (!chatRes.ok) throw new Error(`Chat API failed: ${chatRes.status}`);
        const chatData = await chatRes.json();
        console.log('✅ SOMA Response Received.');
        console.log(`   Message: ${chatData.message.substring(0, 100)}...`);

        // 2. Check for the physical voyage file
        console.log('\n[Phase 2] Verifying Physical Persistence...');
        // We'll wait a few seconds for her to write the file
        await new Promise(r => setTimeout(r, 10000));

        // Use shell to check directory
        console.log('--- 📊 MISSION VAULT STATUS ---');
    } catch (err) {
        console.error('❌ LIVE MISSION FAILED:', err.message);
    }
}

runLiveMission();
