import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), '.soma', 'storage', 'soma_knowledge.db');

async function digitalDetoxV2() {
    console.log('🧪 SOMA Digital Detox Phase 2: The Inverted Index Reset');
    console.log(`📂 Target: ${DB_PATH}`);

    const statsInitial = fs.statSync(DB_PATH);
    console.log(`📊 Initial Size: ${(statsInitial.size / (1024 * 1024 * 1024)).toFixed(2)} GB`);

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    try {
        // 1. Clear the 8 Million rows of index bloat
        console.log('\n🗑️ Wiping the 7.9 Million row Inverted Index...');
        const result = db.prepare('DELETE FROM inverted_index').run();
        console.log(`✅ Cleared ${result.changes} index rows.`);

        // 2. Reclaim the gigabytes
        console.log('\n⏳ Reclaiming physical disk space (VACUUM)...');
        console.log('   (This is the big one — might take a minute)');
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

digitalDetoxV2();
