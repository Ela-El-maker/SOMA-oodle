// Quick test for Gemini connectivity
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split(/\r?\n/);

let GEMINI_API_KEY = '';
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('GEMINI_API_KEY=')) {
    GEMINI_API_KEY = trimmed.substring('GEMINI_API_KEY='.length).trim();
  }
}

console.log(`Testing Gemini API with key: ${GEMINI_API_KEY.substring(0, 15)}...`);

// First list available models
async function listModels() {
  const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
  const response = await fetch(listUrl);
  const data = await response.json();
  console.log('\nAvailable models:');
  data.models?.forEach(m => {
    if (m.supportedGenerationMethods?.includes('generateContent')) {
      console.log(`  - ${m.name}`);
    }
  });
  return data.models?.find(m => m.supportedGenerationMethods?.includes('generateContent'));
}

async function testGemini() {
  const model = await listModels();
  if (!model) {
    console.error('No models found!');
    return;
  }
  
  const modelName = model.name.replace('models/', '');
  console.log(`\nTesting with: ${modelName}`);
  
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  const url = `${endpoint}?key=${GEMINI_API_KEY}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Hello, just testing. Say "OK" if you work.'
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 50
        }
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Success!');
    console.log('Response:', JSON.stringify(data, null, 2));
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('\nExtracted text:', text);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testGemini();
