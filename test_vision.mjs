import fetch from 'node-fetch';

async function test() {
    console.log('🧪 Triggering Vision Scan...');
    try {
        const response = await fetch('http://localhost:3001/api/tools/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: "vision_scan",
                args: { source: "screen", threshold: 0.5 }
            })
        });
        
        const raw = await response.text();
        console.log('Raw Response:', raw);

        if (!response.ok) {
            console.error(`❌ HTTP Error: ${response.status}`);
            return;
        }

        const data = JSON.parse(raw);
        console.log('\n👁️ Vision Result:');
        console.log(JSON.stringify(data, null, 2));

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

test();
