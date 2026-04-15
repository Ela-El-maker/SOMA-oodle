/**
 * core/BarryMindModel.js
 *
 * Barry's cognitive state model — not what he says, but what he KNOWS, WANTS, and DOESN'T KNOW.
 *
 * Tracks per topic:
 *  - demonstrated_knowledge: things Barry has clearly understood and applied
 *  - building_toward: consecutive questions suggesting a goal/project
 *  - confusion_signals: topics he keeps asking about (implies gap, not curiosity)
 *  - proactive_hints: things SOMA should mention before Barry has to ask
 *
 * Updated after every chat. Injected as [BARRY MIND MODEL] into every prompt.
 * Persists to .soma/barry-mind.json.
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE     = path.join(__dirname, '..', 'server', '.soma', 'barry-mind.json');
const MAX_TOPICS = 30;
const MAX_HINTS  = 5;

// How many times Barry asks about X before we flag it as a confusion signal
const CONFUSION_THRESHOLD = 3;
// How many consecutive turns on the same topic before flagging as "building toward"
const BUILD_THRESHOLD = 2;

function loadStore() {
    try {
        if (fs.existsSync(STORE)) return JSON.parse(fs.readFileSync(STORE, 'utf8'));
    } catch {}
    return { topics: {}, buildingToward: [], hints: [], lastUpdated: 0 };
}

function saveStore(data) {
    try {
        const dir = path.dirname(STORE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(STORE, JSON.stringify(data, null, 2));
    } catch {}
}

// Extract topic keywords from a message (coarse but cheap — no LLM)
function extractTopics(text) {
    const t = text.toLowerCase();
    const topics = [];

    const patterns = [
        // Tech
        [/\b(websocket|ws)\b/,          'WebSocket'],
        [/\b(deepseek|llm|model|brain)\b/, 'AI models'],
        [/\b(memory|mnemonic|recall)\b/, 'memory system'],
        [/\b(arbiter|orchestrat)\b/,     'arbiter architecture'],
        [/\b(message.?broker|signal|cns)\b/, 'signal routing'],
        [/\b(deploy|docker|server|prod)\b/, 'deployment'],
        [/\b(latency|perf|slow|fast|speed)\b/, 'performance'],
        [/\b(database|sqlite|db|query)\b/, 'database'],
        [/\b(react|jsx|component|frontend|ui)\b/, 'frontend'],
        [/\b(node|express|backend|api|route)\b/, 'backend'],
        [/\b(goal|plan|task|mission)\b/, 'goals'],
        [/\b(self.?mod|patch|autonom)\b/, 'self-modification'],
        [/\b(security|auth|token|key)\b/, 'security'],
        [/\b(trading|stock|finance|market)\b/, 'finance'],
        [/\b(git|commit|branch|pr|pull.?request)\b/, 'git workflow'],
        [/\b(error|bug|fix|crash|fail)\b/, 'debugging'],
        [/\b(train|fine.?tun|dataset|learn)\b/, 'machine learning'],
        [/\b(voice|tts|speech|audio)\b/, 'voice/audio'],
    ];

    for (const [re, label] of patterns) {
        if (re.test(t)) topics.push(label);
    }

    return [...new Set(topics)];
}

export class BarryMindModel {
    constructor() {
        this._data   = null;
        this._dirty  = false;
        this._recentTopicWindow = []; // rolling window for "building toward" detection
    }

    _load() {
        if (!this._data) this._data = loadStore();
    }

    /**
     * Update model after a chat turn.
     * @param {string} userMessage - What Barry said
     * @param {string} somaResponse - What SOMA replied
     * @param {boolean} userCorrected - Did Barry correct SOMA?
     */
    update(userMessage, somaResponse, userCorrected = false) {
        this._load();
        const topics = extractTopics(userMessage);
        const now = Date.now();

        for (const topic of topics) {
            if (!this._data.topics[topic]) {
                this._data.topics[topic] = {
                    askCount: 0,
                    correctionCount: 0,
                    firstSeen: now,
                    lastSeen: now,
                    knowledgeDemonstrated: false,
                };
            }
            const t = this._data.topics[topic];
            t.askCount++;
            t.lastSeen = now;
            if (userCorrected) t.correctionCount++;

            // If Barry provided a correction, he knows the topic well enough to judge
            if (userCorrected) t.knowledgeDemonstrated = true;

            // Long messages about a topic suggest engagement / building
            if (userMessage.length > 80) t.knowledgeDemonstrated = true;
        }

        // Rolling window for "building toward" detection
        this._recentTopicWindow.push(...topics);
        if (this._recentTopicWindow.length > 10) {
            this._recentTopicWindow = this._recentTopicWindow.slice(-10);
        }

        // Detect "building toward" — same topic appearing repeatedly in recent turns
        const topicCounts = {};
        for (const t of this._recentTopicWindow) topicCounts[t] = (topicCounts[t] || 0) + 1;
        const building = Object.entries(topicCounts)
            .filter(([, c]) => c >= BUILD_THRESHOLD)
            .map(([t]) => t);
        this._data.buildingToward = building.slice(0, 3);

        // Generate proactive hints: topics Barry asks about but where SOMA often gets corrected
        const hints = Object.entries(this._data.topics)
            .filter(([, v]) => v.correctionCount >= 2 && v.askCount >= CONFUSION_THRESHOLD)
            .sort((a, b) => b[1].correctionCount - a[1].correctionCount)
            .slice(0, MAX_HINTS)
            .map(([topic, v]) => `${topic} (asked ${v.askCount}x, corrected SOMA ${v.correctionCount}x)`);
        this._data.hints = hints;

        // Prune old topics (keep MAX_TOPICS most recent)
        const topicEntries = Object.entries(this._data.topics)
            .sort((a, b) => b[1].lastSeen - a[1].lastSeen)
            .slice(0, MAX_TOPICS);
        this._data.topics = Object.fromEntries(topicEntries);

        this._data.lastUpdated = now;
        this._dirty = true;

        // Debounced save — don't block the response
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            if (this._dirty) { saveStore(this._data); this._dirty = false; }
        }, 2000);
    }

    /**
     * Returns a concise natural-language summary for injection into the prompt.
     */
    getContextString() {
        this._load();
        const d = this._data;
        const parts = [];

        // What Barry is actively working on
        if (d.buildingToward?.length) {
            parts.push(`Currently building toward: ${d.buildingToward.join(', ')}`);
        }

        // Topics where SOMA has a track record of being wrong — be extra careful here
        if (d.hints?.length) {
            parts.push(`Topics where SOMA gets corrected often — double-check responses: ${d.hints.join('; ')}`);
        }

        // Topics Barry clearly knows well (adjust explanation depth)
        const expert = Object.entries(d.topics)
            .filter(([, v]) => v.knowledgeDemonstrated && v.askCount >= 3)
            .map(([t]) => t)
            .slice(0, 5);
        if (expert.length) {
            parts.push(`Barry has demonstrated expertise in: ${expert.join(', ')} — skip basics`);
        }

        if (!parts.length) return '';
        return `\n[BARRY MIND MODEL — inferred from ${Object.keys(d.topics).length} topics across sessions]\n${parts.join('\n')}\n[/BARRY MIND MODEL]\n`;
    }
}

// Singleton
export const barryMind = new BarryMindModel();
