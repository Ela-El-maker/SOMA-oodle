/**
 * Quick diagnostic test for /api/reason endpoint
 */

async function testReasonEndpoint() {
  console.log('🧪 Testing /api/reason endpoint...\n');

  try {
    const response = await fetch('http://localhost:3001/api/reason', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Hello, can you hear me?',
        context: {}
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ SUCCESS!');
      console.log('Response:', data.response?.substring(0, 100) + '...');
      console.log('Confidence:', data.metadata?.confidence);
    } else {
      const errorText = await response.text();
      console.log('\n❌ FAILED');
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.log('\nIs the backend running? Try:');
    console.log('  cd cognitive-terminal/server');
    console.log('  npm run dev');
  }
}

testReasonEndpoint();
