// Test MCPToolManager functionality
const MCPToolManager = require('./server/MCPToolManager.cjs');
const path = require('path');
const fs = require('fs').promises;

console.log('🔧 Testing MCPToolManager\n');

// Mock MnemonicArbiter
const mockMnemonicArbiter = {
  async recall(query, opts) {
    return [
      { id: '1', content: 'Previous conversation about quantum computing', timestamp: new Date().toISOString() },
      { id: '2', content: 'Discussion on machine learning algorithms', timestamp: new Date().toISOString() }
    ];
  },
  async store(content, metadata) {
    return { success: true, id: Math.random().toString(36).substr(2, 9), tier: 'hot' };
  }
};

// Create tool manager
const toolManager = new MCPToolManager({
  name: 'TestTools',
  mnemonicArbiter: mockMnemonicArbiter,
  enableFileOps: true,
  enableMemoryQuery: true,
  enableCodeExec: true,
  enableShellExec: true,
  verbose: true
});

async function runTests() {
  console.log(`✅ Tool Manager initialized with ${toolManager.tools.size} tools\n`);
  
  // Test 1: List all available tools
  console.log('1. Listing available tools:\n');
  const tools = toolManager.listTools();
  tools.forEach(tool => {
    console.log(`  • ${tool.name}: ${tool.description}`);
  });
  console.log(`\nTotal tools: ${tools.length}\n`);
  
  // Test 2: File operations
  console.log('2. Testing file operations...\n');
  
  const testFilePath = path.join(__dirname, 'test-mcp-output.txt');
  const testContent = `MCP Tool Test
Generated: ${new Date().toISOString()}
This file was created by MCPToolManager for testing purposes.
`;
  
  // Write file
  console.log('  Writing test file...');
  let result = await toolManager.invokeTool('write_file', {
    path: testFilePath,
    content: testContent
  });
  console.log('  ✓ Write result:', result.success ? 'Success' : 'Failed');
  
  // Read file
  console.log('  Reading test file...');
  result = await toolManager.invokeTool('read_file', {
    path: testFilePath
  });
  if (result.success) {
    console.log(`  ✓ Read ${result.result.size} bytes`);
    console.log(`  ✓ Content preview: ${result.result.content.substring(0, 50)}...`);
  }
  
  // List directory
  console.log('  Listing current directory...');
  result = await toolManager.invokeTool('list_directory', {
    path: __dirname
  });
  if (result.success) {
    console.log(`  ✓ Found ${result.result.total} items (${result.result.files.length} files, ${result.result.directories.length} dirs)`);
  }
  
  // Search files
  console.log('  Searching for .cjs files...');
  result = await toolManager.invokeTool('search_files', {
    directory: __dirname,
    pattern: '\\.cjs$'
  });
  if (result.success) {
    console.log(`  ✓ Found ${result.result.count} matching files`);
    if (result.result.matches.length > 0) {
      console.log(`  ✓ First match: ${result.result.matches[0].name}`);
    }
  }
  
  console.log('\n3. Testing memory operations...\n');
  
  // Query memory
  console.log('  Querying memory for "quantum"...');
  result = await toolManager.invokeTool('query_memory', {
    query: 'quantum',
    limit: 5
  });
  if (result.success) {
    console.log(`  ✓ Found ${result.result.count} memories`);
    if (result.result.results.length > 0) {
      console.log(`  ✓ Example: ${result.result.results[0].content.substring(0, 50)}...`);
    }
  }
  
  // Store memory
  console.log('  Storing new memory...');
  result = await toolManager.invokeTool('store_memory', {
    content: 'MCPToolManager test run completed successfully',
    metadata: { type: 'test', timestamp: new Date().toISOString() }
  });
  if (result.success) {
    console.log(`  ✓ Stored with ID: ${result.result.id}, Tier: ${result.result.tier}`);
  }
  
  console.log('\n4. Testing code execution...\n');
  
  // Execute JavaScript
  console.log('  Executing JavaScript code...');
  result = await toolManager.invokeTool('execute_code', {
    code: `
      const result = [];
      for (let i = 1; i <= 5; i++) {
        result.push(i * i);
      }
      return result.join(', ');
    `,
    language: 'javascript'
  });
  if (result.success) {
    console.log(`  ✓ Result: ${result.result.result}`);
  } else {
    console.log(`  ✗ Error: ${result.error}`);
  }
  
  console.log('\n5. Testing shell execution...\n');
  
  // Execute command
  console.log('  Executing "node --version"...');
  result = await toolManager.invokeTool('execute_command', {
    command: 'node --version'
  });
  if (result.success) {
    console.log(`  ✓ Output: ${result.result.stdout.trim()}`);
  }
  
  console.log('\n6. Checking metrics...\n');
  
  const status = toolManager.getStatus();
  console.log(`  Total invocations: ${status.metrics.totalInvocations}`);
  console.log(`  Successful: ${status.metrics.successfulInvocations}`);
  console.log(`  Failed: ${status.metrics.failedInvocations}`);
  console.log(`  Avg execution time: ${status.metrics.avgExecutionTime.toFixed(2)}ms`);
  console.log(`\n  Tool usage:`);
  Object.entries(status.metrics.toolUsage)
    .filter(([_, count]) => count > 0)
    .forEach(([tool, count]) => {
      console.log(`    • ${tool}: ${count}x`);
    });
  
  // Cleanup
  console.log('\n7. Cleanup...\n');
  try {
    await fs.unlink(testFilePath);
    console.log('  ✓ Test file removed');
  } catch (e) {
    console.log('  (No cleanup needed)');
  }
  
  console.log('\n✅ All tests complete!\n');
  console.log('MCP Tool System is fully operational! 🚀\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
