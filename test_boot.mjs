import { ThalamusArbiter } from './arbiters/ThalamusArbiter.js';
import { GMNConnectivityArbiter } from './arbiters/GMNConnectivityArbiter.js';
import messageBroker from './core/MessageBroker.js';

async function test() {
    console.log('Testing Arbiters...');
    try {
        const thalamus = new ThalamusArbiter({ name: 'TestThalamus' });
        console.log('Thalamus created');
        const connectivity = new GMNConnectivityArbiter({ name: 'TestConn', port: 7779, discoveryPort: 7780 });
        console.log('Connectivity created');
        
        await thalamus.initialize();
        console.log('Thalamus initialized');
        await connectivity.initialize();
        console.log('Connectivity initialized');
        
        console.log('Test PASSED');
        process.exit(0);
    } catch (e) {
        console.error('Test FAILED');
        console.error(e);
        process.exit(1);
    }
}

test();
