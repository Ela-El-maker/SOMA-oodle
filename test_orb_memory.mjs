import fetch from 'node-fetch';

async function testOrbMemory() {
    console.log('--- 🧪 SOMA ORB PERSISTENCE PROBE ---');
    const SOMA_URL = 'http://localhost:3001';

    try {
        const res = await fetch(`${SOMA_URL}/api/soma/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "Do you remember the secret access code I just gave you? What was it?",
                sessionId: "Sovereign_Barry" // Physically sync the session
            })
        });

        const reader = res.body;
        let fullText = '';

        console.log('[Monitor] Waiting for Orb (SSE) stream chunks...');
        
        // SSE parsing logic
        reader.on('data', chunk => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.sentence) {
                            console.log(`📡 Orb Chunk: ${data.sentence}`);
                            fullText += data.sentence + ' ';
                        }
                    } catch (e) {}
                }
            }
        });

        reader.on('end', () => {
            console.log('\n--- 🔱 FINAL ORB VERDICT ---');
            console.log(`Response: ${fullText.trim()}`);
            if (fullText.toLowerCase().includes('archipelago-99')) {
                console.log('🎉 SUCCESS: Neural Fusion is physically verified. She remembers across interfaces.');
            } else {
                console.log('❌ FAILURE: She is still amnesiac in the Orb.');
            }
            process.exit(0);
        });

    } catch (e) {
        console.error('❌ Diagnostic Error:', e.message);
    }
}

testOrbMemory();
