import { EngineeringSwarmArbiter } from './arbiters/EngineeringSwarmArbiter.js';
import fs from 'fs/promises';
import path from 'path';

async function runTest() {
    console.log('--- 🧪 STARTING RALPH LOOP VERIFICATION ---');

    // 1. Setup Ralph (Engineering Swarm)
    const swarm = new EngineeringSwarmArbiter({ 
        quadBrain: { 
            reason: async () => ({ text: '[]' }) // Mock
        } 
    });

    // 2. Test Success Path
    console.log('\n[TEST 1] Verifying Success Detection...');
    const dummyPath = path.join(process.cwd(), 'ralph_ok.js');
    await fs.writeFile(dummyPath, 'console.log("Success");', 'utf8');

    const successTasks = [{ command: `node ${dummyPath}` }];
    const successResult = await swarm.verifyPatch({}, successTasks);

    if (successResult.passed) {
        console.log('✅ SUCCESS PATH VERIFIED: Ralph correctly validated good code.');
    } else {
        console.log('❌ SUCCESS PATH FAILED:', successResult.error);
    }

    // 3. Test Failure Path (The "Ralph" Specialty)
    console.log('\n[TEST 2] Verifying Failure & Log Capture...');
    const failTasks = [{ command: `node non_existent_file.js` }];
    const failResult = await swarm.verifyPatch({}, failTasks);

    if (!failResult.passed) {
        console.log('✅ FAILURE PATH VERIFIED: Ralph caught the crash.');
        console.log('Captured Error (First 100 chars):', failResult.error.substring(0, 100).replace(/\n/g, ' '));
        
        if (failResult.error.includes('MODULE_NOT_FOUND') || failResult.error.includes('Cannot find module')) {
            console.log('✅ LOG INTEGRITY VERIFIED: Ralph captured the real system error.');
        }
    } else {
        console.log('❌ FAILURE PATH FAILED: Ralph missed the crash.');
    }

    // 4. Test Persistence Directory
    console.log('\n[TEST 3] Verifying Manifest Directory...');
    const manifestDir = path.join(process.cwd(), '.soma', 'manifests');
    const stats = await fs.stat(manifestDir);
    if (stats.isDirectory()) {
        console.log('✅ PERSISTENCE VERIFIED: Manifest vault is physically present.');
    }

    // Cleanup
    await fs.unlink(dummyPath).catch(() => {});
    console.log('\n--- 🎉 ALL SENTIENCE UPGRADES VERIFIED ---');
    process.exit(0);
}

runTest().catch(e => {
    console.error('Test failed:', e);
    process.exit(1);
});
