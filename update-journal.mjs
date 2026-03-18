
import Database from 'better-sqlite3';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * update-journal.mjs
 * 
 * Compiles SOMA's background activity into a beautiful HTML Dashboard.
 * Run this to see what SOMA has been up to!
 */

export async function updateJournal() {
    console.log('📊 SOMA Journal Generator: Compiling latest intelligence...');

    const root = process.cwd();
    const somaDir = path.join(root, 'SOMA'); // Or .soma depending on structure, usually SOMA is project root in some contexts but here likely C:\Users\barry\Desktop\SOMA
    // Adjusting paths based on observed structure
    const memoryDbPath = path.join(root, 'SOMA', 'soma-memory.db'); 
    const guardianDbPath = path.join(root, 'SOMA', 'polymer-storage', 'guardian.db');
    const trainingDataPath = path.join(root, 'SOMA', 'training', 'data', 'distilled-dataset.jsonl');
    const dreamStateDir = path.join(root, '.soma', 'dream_state');

    let gists = [];
    let healingEvents = [];
    let trainingCount = 0;
    let dreamStats = { proposals: 0, quality: 0 };

    // 1. Fetch Dream Reports (Primary Source for Wisdom)
    try {
        const files = await fs.readdir(dreamStateDir);
        const reportFiles = files.filter(f => f.startsWith('dream_report_') && f.endsWith('.json'));
        
        if (reportFiles.length > 0) {
            // Sort by time descending
            reportFiles.sort().reverse();
            const latestReportPath = path.join(dreamStateDir, reportFiles[0]);
            const reportData = JSON.parse(await fs.readFile(latestReportPath, 'utf8'));
            
            if (reportData.summary) {
                dreamStats.proposals = reportData.summary.proposals_count;
                dreamStats.quality = reportData.summary.dream_quality;
            }

            // Extract "Wisdom" from proposals or distilled principles
            // Look for proposals of type 'refine' or 'distillation'
            if (reportData.details && reportData.details.proposals) {
                const wisdom = reportData.details.proposals
                    .filter(p => p.score > 0.6)
                    .slice(0, 5)
                    .map(p => ({
                        text: p.proposal_text,
                        time: new Date(reportData.summary.ts).toLocaleString(),
                        type: p.type
                    }));
                gists.push(...wisdom);
            }
        }
    } catch (e) {
        // console.warn('⚠️ Could not read Dream State:', e.message);
    }

    // 2. Fetch Gists from Mnemonic Memory (Fallback/Supplementary)
    if (gists.length < 5) {
        try {
            const db = new Database(memoryDbPath);
            // Find memories that look like Gists or have high importance
            const rows = db.prepare("SELECT content, created_at FROM memories WHERE content LIKE '%WISDOM GIST%' OR importance > 0.8 ORDER BY created_at DESC LIMIT 5").all();
            const memoryGists = rows.map(r => ({
                text: r.content.replace('WISDOM GIST: ', ''),
                time: new Date(r.created_at).toLocaleString(),
                type: 'memory'
            }));
            gists.push(...memoryGists);
            db.close();
        } catch (e) {
            // console.warn('⚠️ Could not read Mnemonic DB:', e.message);
        }
    }
    
    // Deduplicate and limit
    gists = gists.filter((v,i,a)=>a.findIndex(t=>(t.text === v.text))===i).slice(0, 5);

    // 3. Fetch Healing Events from Guardian
    try {
        const gdb = new Database(guardianDbPath);
        const rows = gdb.prepare("SELECT filename, createdAt, tags FROM results ORDER BY createdAt DESC LIMIT 5").all();
        healingEvents = rows.map(r => ({
            file: r.filename,
            time: new Date(r.createdAt).toLocaleString(),
            tags: JSON.parse(r.tags)
        }));
        gdb.close();
    } catch (e) {
        // console.warn('⚠️ Could not read Guardian DB:', e.message);
    }

    // 4. Check Training Progress
    try {
        const content = await fs.readFile(trainingDataPath, 'utf8');
        trainingCount = content.split('\n').filter(line => line.trim()).length;
    } catch (e) {
        // Might not exist yet
    }

    // 5. Generate HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SOMA Intelligence Journal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #050505; color: #e0e0e0; font-family: 'Inter', sans-serif; }
        .glow-cyan { text-shadow: 0 0 10px #00f2ff, 0 0 20px #00f2ff; color: #00f2ff; }
        .card { background: rgba(20, 20, 20, 0.8); border: 1px solid #333; border-radius: 8px; }
        .border-accent { border-color: #bc00ff; }
        .text-accent { color: #bc00ff; }
    </style>
</head>
<body class="p-8">
    <div class="max-w-4xl mx-auto">
        <header class="mb-12 border-b border-gray-800 pb-6">
            <h1 class="text-4xl font-bold glow-cyan mb-2">SOMA DREAM JOURNAL</h1>
            <p class="text-gray-500 italic">Synthetic Intelligence Evolution Log | Updated: ${new Date().toLocaleString()}</p>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <!-- Training Stats -->
            <div class="card p-6 border-l-4 border-cyan-500">
                <h2 class="text-xl font-semibold mb-4 flex items-center">
                    <span class="mr-2">🧠</span> GEMMA-3 Private Brain
                </h2>
                <div class="text-3xl font-bold mb-1">${trainingCount} / 100</div>
                <p class="text-sm text-gray-400">Distillation Samples Prepared</p>
                <div class="w-full bg-gray-800 h-2 mt-4 rounded-full overflow-hidden">
                    <div class="bg-cyan-500 h-full" style="width: ${Math.min(trainingCount, 100)}%"></div>
                </div>
            </div>

            <!-- Dream Status -->
            <div class="card p-6 border-l-4 border-purple-500">
                <h2 class="text-xl font-semibold mb-4 flex items-center">
                    <span class="mr-2">🌙</span> Lucid Dream State
                </h2>
                <div class="text-3xl font-bold text-purple-400 mb-1">${dreamStats.quality ? (dreamStats.quality * 100).toFixed(0) + '%' : 'N/A'}</div>
                <p class="text-sm text-gray-400">Dream Quality Score</p>
                <p class="text-xs mt-2 text-gray-500">Proposals Generated: ${dreamStats.proposals}</p>
            </div>
        </div>

        <section class="mb-12">
            <h2 class="text-2xl font-bold mb-6 flex items-center">
                <span class="text-accent mr-3">✨</span> Latest Wisdom Gists
            </h2>
            <div class="space-y-4">
                ${gists.length ? gists.map(g => `
                    <div class="card p-4 hover:border-gray-600 transition-colors">
                        <div class="flex justify-between mb-1">
                            <div class="text-xs text-cyan-500">${g.time}</div>
                            <div class="text-[10px] text-gray-500 uppercase tracking-wider">${g.type || 'insight'}</div>
                        </div>
                        <p class="text-gray-300 leading-relaxed">${g.text}</p>
                    </div>
                `).join('') : '<p class="text-gray-600 italic">No wisdom distilled yet. SOMA needs more conversation turns.</p>'}
            </div>
        </section>

        <section>
            <h2 class="text-2xl font-bold mb-6 flex items-center">
                <span class="text-accent mr-3">🔧</span> Recent Healing & Audits
            </h2>
            <div class="space-y-4">
                ${healingEvents.length ? healingEvents.map(h => `
                    <div class="card p-4 flex justify-between items-center">
                        <div>
                            <div class="font-medium text-gray-200">${h.file}</div>
                            <div class="text-xs text-gray-500">${h.time}</div>
                        </div>
                        <div class="flex gap-2">
                            ${h.tags.map(t => `<span class="px-2 py-1 bg-gray-800 text-gray-400 text-[10px] rounded uppercase">${t}</span>`).join('')}
                        </div>
                    </div>
                `).join('') : '<p class="text-gray-600 italic">No healing events recorded. System health is optimal.</p>'}
            </div>
        </section>

        <footer class="mt-20 text-center text-gray-600 text-xs uppercase tracking-widest">
            Level 5 Self-Organizing Cognitive Architecture
        </footer>
    </div>
</body>
</html>
    `;

    await fs.writeFile(path.join(root, 'DREAM_JOURNAL.html'), html);
    console.log('✅ Journal generated: DREAM_JOURNAL.html');
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
    updateJournal().catch(console.error);
}
