import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), '.soma', 'storage', 'soma_knowledge.db');

async function digitalDetox() {
    console.log('🧪 Starting SOMA Digital Detox...');
    console.log(`📂 Target: ${DB_PATH}`);

    const statsInitial = fs.statSync(DB_PATH);
    console.log(`📊 Initial Size: ${(statsInitial.size / (1024 * 1024 * 1024)).toFixed(2)} GB`);

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    try {
        // 1. Identify Hoarding Patterns
        console.log('\n🔍 Identifying junk patterns...');
        
        // Count massive JSON blobs
        const massiveCount = db.prepare(`
            SELECT count(*) as c FROM chunks 
            WHERE length(content) > 50000
        `).get().c;
        console.log(`🗑️ Found ${massiveCount} massive chunks (>50KB)`);

        // Count old system reports (older than 7 days)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const oldReportsCount = db.prepare(`
            SELECT count(*) as c FROM documents 
            WHERE (type = 'code-observation' OR type = 'system-audit' OR type = 'health-check')
            AND indexed_at < ?
        `).get(sevenDaysAgo).c;
        console.log(`🗑️ Found ${oldReportsCount} stale system reports (>7 days old)`);

        // 2. The Purge
        console.log('\n🔥 Executing The Purge...');
        
        // Delete massive chunks
        const delChunks = db.prepare(`DELETE FROM chunks WHERE length(content) > 50000`).run();
        console.log(`✅ Deleted ${delChunks.changes} massive chunks.`);

        // Delete stale system reports and their orphaned chunks
        const delDocs = db.prepare(`
            DELETE FROM documents 
            WHERE (type = 'code-observation' OR type = 'system-audit' OR type = 'health-check')
            AND indexed_at < ?
        `).run(sevenDaysAgo);
        console.log(`✅ Deleted ${delDocs.changes} stale documents.`);

        // Clean up orphaned chunks (those whose documents were deleted)
        const delOrphans = db.prepare(`
            DELETE FROM chunks WHERE doc_id NOT IN (SELECT id FROM documents)
        `).run();
        console.log(`✅ Cleaned up ${delOrphans.changes} orphaned chunks.`);

        // 3. Reclaim Space (The most important part)
        console.log('\n⏳ Reclaiming physical disk space (VACUUM)...');
        console.log('   (This may take a few minutes for a 4GB file)');
        db.exec('VACUUM;');
        console.log('✨ Vacuum complete.');

        const statsFinal = fs.statSync(DB_PATH);
        console.log(`\n📊 Final Size: ${(statsFinal.size / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`🎉 Space Saved: ${((statsInitial.size - statsFinal.size) / (1024 * 1024 * 1024)).toFixed(2)} GB`);

    } catch (error) {
        console.error('❌ Detox failed:', error.message);
    } finally {
        db.close();
    }
}

digitalDetox();
