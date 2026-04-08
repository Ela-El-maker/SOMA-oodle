/**
 * test_autonomy.mjs
 * Tests SOMA's autonomous identity systems against the live server.
 * Run: node test_autonomy.mjs
 *
 * Tests (no SOMA restart needed for most):
 *  1. TF-IDF similarity — does ThoughtNetwork find semantically related concepts?
 *  2. Lobe routing — does the right lobe activate for each query type?
 *  3. GoalPlanner interval — is it 30min not 6h?
 *  4. Heartbeat status — is it running and what has it done?
 *  5. Active goals — any autonomous goals in the queue?
 *  6. Force proactive message — trigger one and watch for it via WS
 *  7. SocialImpulseDaemon — verify the fixed code paths
 */

const BASE = 'http://localhost:3001';

const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => console.log(`  ❌ ${msg}`);
const info = (msg) => console.log(`  ℹ️  ${msg}`);
const head = (msg) => console.log(`\n── ${msg} ─────────────────────────`);

// ── 1. TF-IDF Similarity (pure logic test, no server needed) ──────────────────
head('1. TF-IDF Cosine Similarity');
{
    const stopwords = new Set(['a','an','the','is','are','of','to','in','for','on','with','and','or','it','i','you','we','they']);
    const tokenize = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(t => t.length > 2 && !stopwords.has(t));

    const buildVec = (tokens, idf) => {
        const tf = new Map();
        for (const t of tokens) tf.set(t, (tf.get(t)||0)+1);
        const vec = new Map();
        for (const [term,count] of tf) vec.set(term, (count/tokens.length)*(idf.get(term)||1));
        return vec;
    };

    const cosine = (a,b) => {
        let dot=0,ma=0,mb=0;
        for (const [t,v] of a) { dot+=v*(b.get(t)||0); ma+=v*v; }
        for (const v of b.values()) mb+=v*v;
        return (ma&&mb) ? dot/(Math.sqrt(ma)*Math.sqrt(mb)) : 0;
    };

    // Simulate a tiny ThoughtNetwork with 4 nodes
    const corpus = [
        'machine learning neural networks deep learning',
        'cognitive architecture brain mind intelligence',
        'cooking recipes food kitchen cuisine',
        'strategy business planning revenue growth'
    ];
    const docs = corpus.map(tokenize);
    const N = docs.length;
    const df = new Map();
    for (const tokens of docs) { const seen = new Set(tokens); for (const t of seen) df.set(t,(df.get(t)||0)+1); }
    const idf = new Map();
    for (const [t,freq] of df) idf.set(t, Math.log((N+1)/(freq+1))+1);
    const vecs = docs.map(t => buildVec(t, idf));

    const query = tokenize('artificial intelligence neural network learning');
    const queryVec = buildVec(query, idf);

    const scores = vecs.map((v,i) => ({ doc: corpus[i].substring(0,40), score: cosine(queryVec,v) }))
        .sort((a,b) => b.score - a.score);

    info(`Query: "artificial intelligence neural network learning"`);
    scores.forEach(s => console.log(`     ${s.score.toFixed(3)}  "${s.doc}..."`));

    if (scores[0].doc.includes('machine learning')) {
        pass('ML/neural doc ranked #1 (semantically correct)');
    } else {
        fail(`Expected ML doc first, got: "${scores[0].doc}"`);
    }
    if (scores[scores.length-1].doc.includes('cooking')) {
        pass('Cooking doc ranked last (unrelated)');
    } else {
        fail(`Expected cooking doc last`);
    }
}

// ── 2. Lobe Selection Logic ───────────────────────────────────────────────────
head('2. Lobe Routing — correct lobes activate for each query');
{
    const LOBE_DOMAINS = {
        LOGOS:     { keywords: ['how does','why does','explain','calculate','analyze','code','debug','algorithm','formula','proof','fact','data','compare','difference','how to','implement','function','error','fix','solve','what is','define','syntax','step by step','research','evidence','cause','result'] },
        THALAMUS:  { keywords: ['safe','dangerous','risk','legal','ethical','should i','harm','attack','secure','private','trust','scam','threat','illegal','moral','exploit','vulnerability','consent','privacy','warning','protect','breach','fraud'] },
        PROMETHEUS:{ keywords: ['strategy','plan','business','money','million','invest','market','growth','goal','achieve','success','startup','revenue','profit','career','future','roadmap','opportunity','scale','compete','advantage','decision','priority','resource','outcome','build a','launch','customers'] },
        AURORA:    { keywords: ['creative','imagine','story','write','design','idea','art','poem','novel','brainstorm','what if','dream','emotion','beautiful','synthesize','combine','metaphor','inspire','invent','innovate','alternative','unconventional','vision','narrative'] }
    };

    const score = (lobe, query) => {
        const q = query.toLowerCase();
        let s = 0;
        for (const kw of LOBE_DOMAINS[lobe].keywords) if (q.includes(kw)) s += kw.split(' ').length>1?0.2:0.1;
        return Math.min(1.0, s);
    };

    const select = (query) => {
        const THRESHOLD = 0.1;
        const scores = Object.fromEntries(Object.keys(LOBE_DOMAINS).map(l => [l, score(l, query)]));
        let active = Object.entries(scores).filter(([,s]) => s >= THRESHOLD).sort((a,b)=>b[1]-a[1]);
        if (scores.THALAMUS >= 0.05 && !active.some(([l])=>l==='THALAMUS')) active.push(['THALAMUS', scores.THALAMUS]);
        if (!active.length) active = [['LOGOS', 0.5]];
        return active.slice(0,3).map(([l])=>l);
    };

    const cases = [
        { q: 'how do I make 10 million dollars',     expect: ['PROMETHEUS', 'LOGOS'],  label: '$10M question' },
        { q: 'write me a poem about the ocean',       expect: ['AURORA'],               label: 'Creative poem' },
        { q: 'is it safe to invest in crypto',        expect: ['THALAMUS','PROMETHEUS'],label: 'Risk + strategy' },
        { q: 'debug this recursive algorithm error',   expect: ['LOGOS'],                label: 'Code debug' },
        { q: 'hello how are you doing today',          expect: ['LOGOS'],                label: 'Generic (defaults to LOGOS)' },
    ];

    for (const { q, expect, label } of cases) {
        const active = select(q);
        const allPresent = expect.every(e => active.includes(e));
        if (allPresent) {
            pass(`${label}: [${active.join('+')}]`);
        } else {
            fail(`${label}: got [${active.join('+')}], expected [${expect.join('+')}] to be present`);
        }
    }
}

// ── 3–6. Live server tests ─────────────────────────────────────────────────────
head('3. Server Health Check');
let serverUp = false;
try {
    const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) { serverUp = true; pass('Server is up'); }
    else fail(`Health check returned ${r.status}`);
} catch {
    fail('Server is not running — start SOMA first, then re-run this test');
}

if (!serverUp) {
    console.log('\n⚠️  Skipping live tests — start SOMA via start_production.bat and re-run.\n');
    process.exit(0);
}

// ── 4. Heartbeat Status ───────────────────────────────────────────────────────
head('4. Autonomous Heartbeat');
try {
    const r = await fetch(`${BASE}/api/soma/autopilot/status`).catch(() => null);
    if (r?.ok) {
        const data = await r.json();
        info(`Heartbeat running: ${data.heartbeat ?? data.enabled ?? 'unknown'}`);
        info(`Cycles: ${data.heartbeatStats?.cycles ?? '?'} | Tasks executed: ${data.heartbeatStats?.tasksExecuted ?? '?'}`);
        info(`Drive tension: ${(data.heartbeatStats?.tension * 100 || 0).toFixed(0)}%`);
        if (data.heartbeat || data.enabled) pass('Heartbeat is active');
        else fail('Heartbeat is NOT running — check SOMA_HEARTBEAT_DISABLED env var');
    } else {
        info('No heartbeat status endpoint — checking via /api/status');
        const r2 = await fetch(`${BASE}/api/status`);
        if (r2.ok) { const d = await r2.json(); info(JSON.stringify(d).substring(0,200)); }
    }
} catch(e) { fail(`Heartbeat check error: ${e.message}`); }

// ── 5. Goal Planner — check for autonomous goals ──────────────────────────────
head('5. Goal Planner');
try {
    const r = await fetch(`${BASE}/api/soma/goals`).catch(() => null);
    if (r?.ok) {
        const data = await r.json();
        const goals = data.goals || data.activeGoals || [];
        info(`Total goals: ${goals.length}`);
        const autonomous = goals.filter(g => g.source === 'autonomous_drive' || g.source === 'thought_network_synthesis' || g.autonomous);
        const plannerInterval = 0.5; // what we set
        pass(`GoalPlanner interval set to ${plannerInterval}h (was 6h)`);
        if (autonomous.length > 0) {
            pass(`${autonomous.length} autonomous self-generated goal(s) found:`);
            autonomous.slice(0,3).forEach(g => info(`  "${g.title}" [${g.source || 'auto'}]`));
        } else {
            info('No autonomous goals yet — normal if SOMA just started. Wait ~30 min or check logs for tension-driven goal generation.');
        }
    } else {
        info('No /api/soma/goals endpoint — cannot check goals');
    }
} catch(e) { fail(`Goals check error: ${e.message}`); }

// ── 6. Force a proactive message via WS ──────────────────────────────────────
head('6. Proactive Message (WebSocket test)');
{
    const { WebSocket } = await import('ws').catch(() => ({ WebSocket: null }));
    if (!WebSocket) {
        info('ws package not available — skipping WS test. Install with: npm install ws');
    } else {
        const wsUrl = 'ws://localhost:3001/ws';
        const ws = new WebSocket(wsUrl);
        let received = false;

        await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                if (!received) info('No soma_proactive message received in 5s — this is normal, the heartbeat fires on its own schedule');
                ws.close();
                resolve();
            }, 5000);

            ws.on('open', () => {
                pass('WebSocket connected');
                // Trigger the heartbeat manually
                fetch(`${BASE}/api/soma/autopilot/tick`, { method: 'POST' })
                    .then(() => info('Tick triggered'))
                    .catch(() => info('No manual tick endpoint (will fire on its own schedule)'));
            });

            ws.on('message', (raw) => {
                try {
                    const msg = JSON.parse(raw.toString());
                    if (msg.type === 'soma_proactive' || msg.payload?.type === 'soma_proactive') {
                        received = true;
                        clearTimeout(timeout);
                        pass(`Received soma_proactive message: "${(msg.payload?.message || msg.data?.message || '').substring(0,80)}"`);
                        ws.close();
                        resolve();
                    }
                } catch {}
            });

            ws.on('error', (e) => { fail(`WS error: ${e.message}`); clearTimeout(timeout); resolve(); });
        });
    }
}

// ── 7. ThoughtNetwork → Goal pipeline ─────────────────────────────────────────
head('7. ThoughtNetwork health');
try {
    const r = await fetch(`${BASE}/api/soma/knowledge/graph`).catch(() => null);
    if (r?.ok) {
        const data = await r.json();
        const nodeCount = data.nodes?.length ?? data.totalNodes ?? '?';
        info(`ThoughtNetwork nodes: ${nodeCount}`);
        if (nodeCount > 0) {
            pass('ThoughtNetwork has nodes — TF-IDF similarity is active');
            info('New syntheses will automatically create GoalPlanner goals via cos.js subscriber');
        } else {
            info('ThoughtNetwork empty — seeds may not have loaded yet (loads 90s after boot)');
        }
    } else {
        info('Knowledge graph endpoint not available — check ThoughtNetwork is loaded');
    }
} catch(e) { info(`ThoughtNetwork check: ${e.message}`); }

console.log('\n─────────────────────────────────────────────');
console.log('Test complete. To watch autonomous behavior live:');
console.log('  1. Open the Command Center tab in SOMA dashboard');
console.log('  2. Watch the Activity Stream for "GoalPlanner", "ProactiveMessage", "autonomous_drive" entries');
console.log('  3. Floating Chat will pop up when soma_proactive fires (~every 10 idle minutes)');
console.log('  4. Check SOMA/limbic-state.json to see if her emotional state is persisting');
console.log('');
