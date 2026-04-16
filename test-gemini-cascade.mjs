/**
 * test-gemini-cascade.mjs
 * Verifies all models in the new Gemini cascade are accessible.
 * Run: node test-gemini-cascade.mjs
 */

import 'dotenv/config';

const API_KEY = process.env.GEMINI_API_KEY;
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const MODELS = [
  'gemini-3-flash-preview',   // LOGOS/AURORA primary
  'gemini-3-pro-preview',     // cascade #5
  'gemini-3.1-pro-preview',   // PROMETHEUS + last Gemini resort
  'gemini-2.5-flash',         // THALAMUS + cascade #2
  'gemini-2.5-pro',           // cascade #6
  'gemini-2.0-flash',         // cascade #3
];

// Use 2048 tokens — Gemini 3 thinking models need room for internal reasoning
const PROMPT = 'Reply with exactly two words: "cascade ok"';

async function testModel(model) {
  const url = `${BASE}/${model}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 2048 }
  };

  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000)
    });

    const ms = Date.now() - start;

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '(empty)';
      console.log(`✅  ${model.padEnd(30)} ${ms}ms  → "${text}"`);
      return { model, ok: true, ms };
    } else {
      const err = await res.text();
      const short = err.substring(0, 120).replace(/\n/g, ' ');
      console.log(`❌  ${model.padEnd(30)} HTTP ${res.status}  → ${short}`);
      return { model, ok: false, status: res.status, error: short };
    }
  } catch (e) {
    const ms = Date.now() - start;
    console.log(`💥  ${model.padEnd(30)} ${ms}ms  → ${e.message}`);
    return { model, ok: false, error: e.message };
  }
}

console.log(`\n🧪 Testing Gemini model cascade (${MODELS.length} models)...\n`);

// Test sequentially to avoid rate limits
const results = [];
for (const model of MODELS) {
  results.push(await testModel(model));
  await new Promise(r => setTimeout(r, 500)); // small gap between requests
}

console.log('\n─────────────────────────────────────────');
const ok = results.filter(r => r.ok);
const fail = results.filter(r => !r.ok);
console.log(`\n✅ Working: ${ok.length}/${MODELS.length}`);
if (ok.length) console.log('   ' + ok.map(r => r.model).join('\n   '));
if (fail.length) {
  console.log(`\n❌ Failed: ${fail.length}/${MODELS.length}`);
  console.log('   ' + fail.map(r => `${r.model} (${r.status || 'timeout'})`).join('\n   '));
}

const rate429 = fail.filter(r => r.status === 429);
if (rate429.length) {
  console.log(`\n⚠️  ${rate429.length} model(s) returned 429 — quota limit hit, cascade will skip these`);
}

console.log('\n');
