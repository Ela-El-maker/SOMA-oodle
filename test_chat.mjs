import fetch from 'node-fetch';

async function test() {
    console.log('🧪 Testing SOMA Chat API...');
    try {
        const response = await fetch('http://localhost:3001/api/soma/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "who are you and what is your current system health status?",
                sessionId: "cli-test",
                history: []
            })
        });
        
        if (!response.ok) {
            console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
            console.error(await response.text());
            return;
        }

        const data = await response.json();
        console.log('\n🧠 SOMA Response:');
        console.log(data.response || data.message);
        
        if (data.metadata) {
            console.log(`\nBrain: ${data.metadata.brain} (Confidence: ${data.metadata.confidence})`);
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

test();
