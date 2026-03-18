import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const MCPToolManager = require('./cognitive-terminal/server/MCPToolManager.cjs');

async function main() {
  console.log('👁️  SOMA Omniscient Reader Test...');
  
  // Initialize Tool Manager
  const tools = new MCPToolManager({
    name: 'BrowserTester',
    enableWebSearch: true,
    verbose: true
  });
  
  // Test Target: A JS-heavy site (e.g., a documentation SPA)
  const targetUrl = 'https://react.dev/learn'; 
  
  console.log(`\n🌍 Visiting: ${targetUrl}`);
  console.log('   (Rendering JavaScript with Puppeteer...)');
  
  try {
    const result = await tools.invokeTool('browse_url', {
      url: targetUrl,
      wait: 3000 // Wait 3s for hydration
    });
    
    if (result.success) {
        console.log('\n✅ BROWSE SUCCESS!');
        console.log('----------------------------------------');
        console.log(`Title: ${result.result.title}`);
        console.log(`Content Length: ${result.result.content.length} chars`);
        console.log('----------------------------------------');
        console.log('Preview:');
        console.log(result.result.content.substring(0, 500) + '...');
        
        // Verify we got actual content
        if (result.result.content.length > 1000) {
            console.log('\n🚀 SUCCESS: SOMA successfully rendered and read the dynamic page.');
        } else {
            console.warn('\n⚠️  WARNING: Content seems short. Rendering might have been partial.');
        }
    } else {
        console.error('\n❌ Browse Failed:', result.error);
    }
    
  } catch (err) {
      console.error('\nFatal Error:', err);
  }
}

main();