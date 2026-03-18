/**
 * Verification script for Deep Thinking Mode
 * Tests if the backend correctly handles the deepThinking flag and triggers Society of Mind.
 */

async function testDeepThinking() {
    console.log('🧪 Testing /api/chat with deepThinking: true...\n');

    try {
        const response = await fetch('http://localhost:3001/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Should I buy a house or rent in 2026 given current economic trends?', // Complex query to justify deep thinking
                context: {
                    deepThinking: true,
                    userId: 'test_verifier'
                }
            }),
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const data = await response.json();

            const isDeepThinking = data.response && data.response.includes('[DEEP THINKING]');
            const isSocietyOfMind = data.brain === 'SOCIETY_OF_MIND';

            if (isDeepThinking && isSocietyOfMind) {
                console.log('\n✅ SUCCESS: Deep Thinking Mode triggered!');
                console.log('Brain:', data.brain);
                console.log('Response Preview:', data.response.substring(0, 200) + '...');
            } else {
                console.log('\n❌ FAILED: Deep Thinking expectation not met.');
                console.log('Brain Used:', data.brain);
                console.log('Is "[DEEP THINKING]" in response?', isDeepThinking);
                console.log('Full Response:', data.response?.substring(0, 100));
            }

        } else {
            const errorText = await response.text();
            console.log('\n❌ FAILED: API Error');
            console.log('Error response:', errorText);
        }

    } catch (error) {
        console.error('❌ Connection error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('Backend is likely offline. This test requires the server to be running.');
        }
    }
}

testDeepThinking();
