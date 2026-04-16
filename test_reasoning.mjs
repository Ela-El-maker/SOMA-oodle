import fetch from 'node-fetch';

async function test() {
    console.log('🧪 Testing SOMA Reasoning API...');
    try {
        const response = await fetch('http://localhost:3001/api/soma/reason', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: "who are you and what is your current system health status?",
                conversationId: "cli-test"
            })
        });
        
        if (!response.ok) {
            console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
            console.error(await response.text());
            return;
        }

        const data = await response.json();
        console.log('\n🧠 SOMA Response:');
        console.log(data.response);
        
        if (data.reasoningTree) {
            console.log('\n🌲 Reasoning Tree available.');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

test();
