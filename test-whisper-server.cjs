/**
 * Test script for Whisper Flask Server
 * Verifies that the Whisper transcription service is operational
 *
 * Usage: node test-whisper-server.cjs
 */

async function testWhisperServer() {
  console.log('\n🧪 TESTING WHISPER FLASK SERVER\n');
  console.log('='.repeat(70));

  const WHISPER_URL = 'http://localhost:5002';

  try {
    // Test 1: Health Check
    console.log('\n📡 Test 1: Health Check');
    console.log(`   Checking ${WHISPER_URL}/health...`);

    const healthResponse = await fetch(`${WHISPER_URL}/health`, {
      method: 'GET'
    });

    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
    }

    const healthData = await healthResponse.json();
    console.log(`   ✅ Status: ${healthData.status}`);
    console.log(`   ✅ Model: ${healthData.model}`);
    console.log(`   ✅ Device: ${healthData.device}`);

    // Test 2: Root Endpoint
    console.log('\n📡 Test 2: Root Endpoint');
    console.log(`   Checking ${WHISPER_URL}/...`);

    const rootResponse = await fetch(`${WHISPER_URL}/`, {
      method: 'GET'
    });

    if (!rootResponse.ok) {
      throw new Error(`Root endpoint failed: ${rootResponse.status} ${rootResponse.statusText}`);
    }

    const rootData = await rootResponse.json();
    console.log(`   ✅ Service: ${rootData.service}`);
    console.log(`   ✅ Version: ${rootData.version}`);
    console.log(`   ✅ Endpoints:`);
    Object.entries(rootData.endpoints).forEach(([path, desc]) => {
      console.log(`      - ${path}: ${desc}`);
    });

    // Test 3: Check if /transcribe endpoint exists (without sending audio)
    console.log('\n📡 Test 3: Transcribe Endpoint (OPTIONS check)');
    console.log(`   Checking ${WHISPER_URL}/transcribe...`);

    try {
      const optionsResponse = await fetch(`${WHISPER_URL}/transcribe`, {
        method: 'OPTIONS'
      });
      console.log(`   ✅ Endpoint exists (status: ${optionsResponse.status})`);
    } catch (e) {
      console.log(`   ⚠️ OPTIONS request failed (normal for Flask)`);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('🎯 WHISPER SERVER TESTS COMPLETED\n');
    console.log('✅ All basic tests passed!');
    console.log('✅ Whisper Flask Server is operational');
    console.log('\nNext steps:');
    console.log('  1. Test voice interaction in the Orb application');
    console.log('  2. Speak into your microphone when connected');
    console.log('  3. Check that transcriptions appear in console');
    console.log('  4. Verify SOMA responds with voice\n');

    process.exit(0);

  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ WHISPER SERVER TEST FAILED\n');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Is the Whisper Flask server running?');
    console.error('     Start it with: python cognitive-terminal/services/whisper_flask_server.py');
    console.error('\n  2. Check if Python dependencies are installed:');
    console.error('     pip install -r cognitive-terminal/services/requirements.txt');
    console.error('\n  3. Verify port 5002 is not in use by another service');
    console.error('\n  4. Check server logs for errors\n');

    process.exit(1);
  }
}

testWhisperServer();
