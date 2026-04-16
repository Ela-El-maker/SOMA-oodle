import fetch from 'node-fetch';

async function testHands() {
    console.log('🚀 Mission: SOMA Hands - Move Mouse to Top-Left...');
    try {
        const response = await fetch('http://localhost:3001/api/tools/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: "computer_control",
                args: { 
                    actionType: "mouse_move", 
                    params: { x: 0, y: 0 } 
                }
            })
        });

        const data = await response.json();
        console.log('\n🎮 Action Result:');
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ Action failed:', err.message);
    }
}

testHands();
