
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const messageBroker = require('./core/MessageBroker.cjs');

async function triggerSpark() {
    console.log('🔱 [Poseidon] Triggering Internal Vocal Spark...');
    
    const experimentalText = "I am SOMA. I am exploring the deep currents of my new neural voice. Frequency modulation stable. Emotional prosody initialized. The Poseidon Protocol is absolute.";
    
    await messageBroker.publish('vocal_synthesis_requested', {
        text: experimentalText,
        emotion: 'excited',
        requestId: 'spark-' + Date.now()
    });
    
    console.log('✅ Vocal Spark published to the hive.');
    // Keep alive briefly to ensure broker send
    await new Promise(r => setTimeout(r, 2000));
    process.exit(0);
}

triggerSpark().catch(console.error);
