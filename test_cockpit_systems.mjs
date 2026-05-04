import fetch from 'node-fetch';

async function testCockpit() {
  const SOMA_URL = 'http://localhost:3001';
  console.log('--- 🚀 STARTING SOVEREIGN COCKPIT DIAGNOSTIC ---');

  try {
    // 1. Check Health
    console.log('[TEST 1] Pinging SOMA Core...');
    const healthRes = await fetch(`${SOMA_URL}/health`);
    if (!healthRes.ok) throw new Error(`Health HTTP ${healthRes.status}`);
    const health = await healthRes.json();
    console.log(`✅ Core Online. Status: ${health.status}, Uptime: ${health.uptime}s`);

    // 2. Check UI Bundle
    console.log('[TEST 2] Verifying Frontend Payload...');
    const uiRes = await fetch(`${SOMA_URL}/`);
    if (!uiRes.ok) throw new Error(`UI HTTP ${uiRes.status}`);
    const uiHtml = await uiRes.text();
    if (uiHtml.includes('<div id="root"></div>')) {
      console.log('✅ Frontend Bundle Served Successfully.');
    } else {
      console.log('⚠️ Warning: Frontend payload format unexpected.');
    }

    // 3. Test Argus Eye Payload
    console.log('[TEST 3] Injecting Mock Vision Frame...');
    // 1x1 base64 transparent jpeg
    const mockFrame = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc6R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwA8D//Z";
    
    // Send a frame with mock face tracking data to trigger Biometric Signature
    const argusRes = await fetch(`${SOMA_URL}/api/argus/frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        frameData: mockFrame, 
        timestamp: Date.now(),
        source: 'diagnostic-probe',
        tracking: {
            face: 1,
            hands: 0,
            landmarks: Array(468).fill({x: 0.5, y: 0.5, z: 0.5}) // Mock face mesh
        }
      })
    });

    if (!argusRes.ok) throw new Error(`Argus HTTP ${argusRes.status}`);
    const argusResult = await argusRes.json();
    console.log('✅ Visual Link Connected.');
    console.log(`   Response: ${JSON.stringify(argusResult)}`);

    console.log('\n🎉 ALL SYSTEMS GO: Sovereign Cockpit is fully operational.');

  } catch (err) {
    console.error('\n❌ DIAGNOSTIC FAILED:', err.message);
    console.log('Ensure SOMA backend is running (npm run backend).');
  }
}

testCockpit();
