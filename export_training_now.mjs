/**
 * Manual training data export script.
 * Run: node export_training_now.mjs
 * Exports all conversations from conversations.db into Alpaca-format JSONL
 * ready for SOMA-1T fine-tuning.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'SOMA', 'conversations.db');
const OUT_DIR = path.join(__dirname, 'SOMA', 'training-data');
const TIMESTAMP = Date.now();
const OUT_FILE = path.join(OUT_DIR, `alpaca-soma-export-${TIMESTAMP}.jsonl`);

const MIN_MESSAGES = 4; // Skip sessions with fewer than this many messages

console.log('[Export] Reading conversations.db...');
const db = new Database(DB_PATH, { readonly: true });

// Get all quality sessions
const sessions = db.prepare(`
  SELECT id, started_at, message_count, metadata
  FROM sessions
  WHERE message_count >= ?
  ORDER BY started_at ASC
`).all(MIN_MESSAGES);

console.log(`[Export] Found ${sessions.length} quality sessions (${MIN_MESSAGES}+ messages)`);

const examples = [];
let skipped = 0;

for (const session of sessions) {
  const messages = db.prepare(`
    SELECT role, content, timestamp
    FROM messages
    WHERE session_id = ?
    ORDER BY timestamp ASC
  `).all(session.id);

  if (messages.length < MIN_MESSAGES) { skipped++; continue; }

  // Build conversation pairs (user → assistant)
  const turns = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    const next = messages[i + 1];
    if (msg.role === 'user' && next.role === 'assistant') {
      if (msg.content?.trim() && next.content?.trim() && next.content.length > 20) {
        turns.push({ instruction: msg.content.trim(), output: next.content.trim() });
      }
      i++; // Skip next since we consumed it
    }
  }

  if (turns.length === 0) { skipped++; continue; }

  // Emit as Alpaca examples
  for (const turn of turns) {
    examples.push(JSON.stringify({
      instruction: turn.instruction,
      input: '',
      output: turn.output,
      metadata: {
        source: 'soma_conversation',
        session_id: session.id,
        timestamp: session.started_at,
        weight: 1.0
      }
    }));
  }
}

db.close();

if (examples.length === 0) {
  console.log('[Export] No usable examples found. Check conversations.db content.');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, examples.join('\n') + '\n', 'utf8');

const sizeMB = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2);
console.log(`[Export] ✅ Done!`);
console.log(`  Examples: ${examples.length}`);
console.log(`  Sessions used: ${sessions.length - skipped}/${sessions.length}`);
console.log(`  Output: ${OUT_FILE}`);
console.log(`  Size: ${sizeMB} MB`);
console.log('');
console.log('Next step: run training with this file using train-soma-llama.py');
console.log(`  python train-soma-llama.py --dataset "${OUT_FILE}"`);
