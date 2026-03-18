import fetch from 'node-fetch';

async function runMission() {
    console.log('🚀 Triggering SOMA Vision Mission...');
    try {
        const response = await fetch('http://localhost:3001/api/tools/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: "vision_scan",
                args: { source: "screen", threshold: 0.1 }
            })
        });

        const data = await response.json();
        console.log('\n👁️ SOMA Vision Result:');
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ Mission failed:', err.message);
    }
}

runMission();
