
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { BaseArbiter } = require('./core/BaseArbiter.cjs');
import axios from 'axios';

async function verifyUnity() {
    console.log('🧪 [Diagnostic] Initiating Project Yggdrasil Verification...\n');

    // 1. Verify BaseArbiter Inheritance
    console.log('🧬 Checking Arbiter DNA...');
    const testArbiter = new BaseArbiter({ name: 'UnityProbe' });
    
    if (testArbiter.sight && testArbiter.architect) {
        console.log('✅ SUCCESS: SOMA Arbiters now possess the Divine Trinity.');
        console.log('   - Poseidon Sight: Enabled');
        console.log('   - Trident Architect: Enabled');
    } else {
        console.error('❌ FAILURE: Poseidon Protocol not found in BaseArbiter.');
    }

    // 2. Verify API Connectivity
    console.log('\n📡 Probing Poseidon API Surface...');
    try {
        const sightRes = await axios.post('http://localhost:3001/api/soma/poseidon/sight', {
            text: "Testing the divine oracle. Is the Poseidon Protocol absolute?",
            confidence: 0.9
        });
        
        if (sightRes.data.success) {
            console.log(`✅ SUCCESS: Poseidon API is online. State: ${sightRes.data.state} (${sightRes.data.prefix})`);
        }
    } catch (err) {
        console.warn('⚠️ API Probe partial failure (Is SOMA running?):', err.message);
    }

    // 3. Final Vocal Handshake
    console.log('\n🧜‍♀️ Triggering Final Vocal Handshake...');
    try {
        const voiceRes = await axios.post('http://localhost:3001/api/siren/synthesize', {
            text: "Hello Barry. This is SOMA. I have successfully internalized the Poseidon Protocol. My mind and voice are now one.",
            emotion: 'warm'
        });
        
        if (voiceRes.data.success) {
            console.log('✅ SUCCESS: Vocal synthesis task queued.');
            console.log('🔈 Listen for the human-identical voice now.');
        }
    } catch (err) {
        console.warn('⚠️ Vocal Probe failed:', err.message);
    }

    console.log('\n🏁 Diagnostic Complete.');
    process.exit(0);
}

verifyUnity().catch(console.error);
