/**
 * Test SOMA's proactive tool usage
 */

const testMessages = [
    "can you check the system status?",
    "what's in the arbiters folder?",
    "remember that I prefer concise responses"
];

async function testSoma(message) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: "${message}"`);
    console.log('='.repeat(60));

    try {
        const response = await fetch('http://localhost:3001/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, sessionId: 'test-session' })
        });

        const data = await response.json();

        console.log('\n📝 Response:', data.response?.substring(0, 300) + '...');
        console.log('\n🛠️  Tools Used:', data.toolsUsed || 'none');

        if (data.reasoning) {
            console.log('\n🧠 Reasoning:', data.reasoning.split('\n')[0].substring(0, 150) + '...');
        }

        return data;
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run tests
console.log('🧪 Testing SOMA\'s Proactive Tool Usage\n');

for (const msg of testMessages) {
    await testSoma(msg);
    await new Promise(r => setTimeout(r, 2000)); // Wait between tests
}

console.log('\n✅ Tests complete!');
