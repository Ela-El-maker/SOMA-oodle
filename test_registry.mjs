
import { ToolRegistry } from './core/ToolRegistry.js';

async function test() {
    console.log('🧪 Testing Upgraded ToolRegistry...');
    const registry = new ToolRegistry();

    // 1. Register tools with dependencies
    registry.registerTool({
        name: 'terminal',
        execute: async () => 'terminal'
    });

    registry.registerTool({
        name: 'git',
        dependencies: ['terminal'],
        execute: async () => 'git'
    });

    // 2. Validate
    try {
        registry.validateDependencies();
        console.log('✅ Dependency validation passed.');
    } catch (e) {
        console.error('❌ Validation failed:', e.message);
    }

    // 3. Check Order
    const order = registry.getExecutionOrder();
    console.log('Order:', order.join(' -> '));
    if (order[0] === 'terminal' && order[1] === 'git') {
        console.log('✅ Topological sort correct.');
    } else {
        console.error('❌ Sort failed.');
    }

    // 4. Test Circularity
    console.log('\nTesting Circularity Detection...');
    const circular = new ToolRegistry();
    circular.registerTool({ name: 'A', dependencies: ['B'], execute: async () => {} });
    circular.registerTool({ name: 'B', dependencies: ['A'], execute: async () => {} });
    
    try {
        circular.validateDependencies();
        console.error('❌ Failed to detect circularity!');
    } catch (e) {
        console.log('✅ Correctly caught circular dependency:', e.message);
    }
}

test();
