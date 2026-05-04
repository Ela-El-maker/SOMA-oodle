import messageBroker from './core/MessageBroker.cjs';

async function triggerProbe() {
    console.log('--- 👁️ INITIATING SOMA VISION PROBE ---');

    // 1. Send a request to Argus to broadcast its latest frame
    // In SOMA, ArgusStreamArbiter handles visual_frame_received.
    // We'll simulate a high-confidence recognition to force the Narrator to speak.
    
    console.log('[Probe] Stimulating high-confidence recognition signal...');
    
    // We publish a mock recognition event that triggers the Narrator
    // The Narrator handles 'argus_recognition'
    await messageBroker.publish('argus_recognition', {
        label: 'User Workspace',
        score: 0.99,
        timestamp: Date.now()
    });

    console.log('[Probe] Signal dispatched. SOMA should look at her latest buffer and narrate.');
    
    // Give it a moment to process the LLaVA request
    setTimeout(() => {
        console.log('--- ✅ PROBE SEQUENCE COMPLETE ---');
        process.exit(0);
    }, 5000);
}

triggerProbe().catch(console.error);
