#!/usr/bin/env node
/**
 * Test Script for Hybrid Search System
 * Tests the complete Phase 1 implementation
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

// Sample medical research papers
const samplePapers = [
    {
        id: 'paper-001',
        content: `Basal cell carcinoma (BCC) is the most common type of skin cancer.
        This study examines treatment outcomes across 500 patients over 5 years.
        Surgical excision showed a 95% success rate with minimal recurrence.
        Median survival time was 12.3 years. The study was conducted at Johns Hopkins
        from 2015-2020.`,
        metadata: {
            title: 'Surgical Treatment Outcomes for Basal Cell Carcinoma',
            authors: 'Smith J, Johnson K, Williams R',
            year: 2020,
            journal: 'Journal of Dermatology',
            specialty: 'oncology',
            hasOutcomeData: true,
            tags: ['basal-cell-carcinoma', 'surgery', 'treatment-outcomes'],
            citations: 45
        }
    },
    {
        id: 'paper-002',
        content: `Radiation therapy for basal cell carcinoma in elderly patients.
        A retrospective analysis of 200 patients aged 65+. Achieved 92% complete remission
        with 8% recurrence rate over 3 years. Mean survival time was 9.8 years.
        Radiation is an effective alternative for patients unsuitable for surgery.`,
        metadata: {
            title: 'Radiation Therapy for BCC in Elderly Patients',
            authors: 'Chen L, Park M, Davis A',
            year: 2019,
            journal: 'Clinical Oncology',
            specialty: 'oncology',
            hasOutcomeData: true,
            tags: ['basal-cell-carcinoma', 'radiation', 'elderly', 'treatment-outcomes'],
            citations: 32
        }
    },
    {
        id: 'paper-003',
        content: `Immunotherapy with pembrolizumab for advanced basal cell carcinoma.
        Phase 2 trial with 120 patients. Overall response rate of 78%, with 34% achieving
        complete remission. Median progression-free survival was 18 months.
        Novel treatment option for cases resistant to standard therapy.`,
        metadata: {
            title: 'Pembrolizumab for Advanced BCC: Phase 2 Trial',
            authors: 'Rodriguez M, Thompson E, Lee S',
            year: 2023,
            journal: 'New England Journal of Medicine',
            specialty: 'oncology',
            hasOutcomeData: true,
            tags: ['basal-cell-carcinoma', 'immunotherapy', 'pembrolizumab', 'clinical-trial'],
            citations: 89
        }
    },
    {
        id: 'paper-004',
        content: `Comparison of treatment modalities for basal cell carcinoma.
        Meta-analysis of 50 studies involving 10,000+ patients. Surgical excision: 95% success,
        Mohs surgery: 98% success, Radiation: 92% success, Topical therapy: 85% success.
        Study highlights importance of patient-specific treatment selection.`,
        metadata: {
            title: 'Comparative Effectiveness of BCC Treatment Modalities',
            authors: 'Brown T, Wilson J, Martinez C',
            year: 2021,
            journal: 'Lancet',
            specialty: 'oncology',
            hasOutcomeData: true,
            tags: ['basal-cell-carcinoma', 'meta-analysis', 'comparative-study'],
            citations: 156
        }
    },
    {
        id: 'paper-005',
        content: `Long-term follow-up of basal cell carcinoma patients.
        Cohort study tracking 1,000 patients for 15 years. Overall 10-year survival rate: 96%.
        Recurrence occurred in 12% of cases, primarily within first 5 years.
        Early detection and treatment are key to positive outcomes.`,
        metadata: {
            title: 'Long-term Outcomes and Recurrence Patterns in BCC',
            authors: 'Anderson P, Garcia R, White M',
            year: 2022,
            journal: 'Journal of the American Medical Association',
            specialty: 'oncology',
            hasOutcomeData: true,
            tags: ['basal-cell-carcinoma', 'long-term-study', 'recurrence'],
            citations: 72
        }
    }
];

async function waitForSOMA() {
    console.log('Waiting for SOMA to be ready...');
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`${BASE_URL}/health`);
            if (response.ok) {
                console.log('✅ SOMA is ready!');
                return true;
            }
        } catch (err) {
            // SOMA not ready yet
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.error('❌ SOMA failed to start within 30 seconds');
    return false;
}

async function testIngest() {
    console.log('\n📥 Testing document ingestion...');

    try {
        const response = await fetch(`${BASE_URL}/api/research/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documents: samplePapers,
                options: { batchSize: 2 }
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log(`✅ Ingested ${result.results.successful}/${result.results.total} documents`);
            if (result.results.failed > 0) {
                console.log(`⚠️  ${result.results.failed} documents failed`);
                console.log('Errors:', result.results.errors);
            }
            return true;
        } else {
            console.error('❌ Ingestion failed:', result.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Ingestion error:', error.message);
        return false;
    }
}

async function testQuery(query, filters = {}) {
    console.log(`\n🔍 Testing query: "${query}"`);
    if (Object.keys(filters).length > 0) {
        console.log('   Filters:', JSON.stringify(filters, null, 2));
    }

    try {
        const response = await fetch(`${BASE_URL}/api/research/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                filters,
                options: { topK: 5 }
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log(`✅ Found ${result.count} results in ${result.searchTime}ms`);
            console.log(`   Stats: ${result.stats.vectorResults} vector, ${result.stats.textResults} text`);

            result.results.slice(0, 3).forEach((r, i) => {
                console.log(`\n   Result ${i + 1}:`);
                console.log(`     Title: ${r.metadata?.title || 'Unknown'}`);
                console.log(`     Score: ${r.finalScore.toFixed(4)} (vector: ${r.vectorScore.toFixed(2)}, bm25: ${r.bm25Score.toFixed(2)})`);
                console.log(`     Year: ${r.metadata?.year}, Citations: ${r.metadata?.citations}`);
            });

            return true;
        } else {
            console.error('❌ Query failed:', result.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Query error:', error.message);
        return false;
    }
}

async function testStats() {
    console.log('\n📊 Testing stats endpoint...');

    try {
        const response = await fetch(`${BASE_URL}/api/research/stats`);
        const result = await response.json();

        if (result.success) {
            console.log('✅ Stats retrieved:');
            console.log('   Total searches:', result.stats.stats.totalSearches);
            console.log('   Avg search time:', result.stats.stats.avgSearchTime.toFixed(2) + 'ms');
            console.log('   Cache hit rate:', result.stats.stats.cache.hitRate);
            console.log('   ACORN vectors:', result.stats.stats.acorn.totalVectors);
            console.log('   BM25 docs:', result.stats.stats.bm25.totalDocuments);
            return true;
        } else {
            console.error('❌ Stats failed:', result.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Stats error:', error.message);
        return false;
    }
}

async function testTags() {
    console.log('\n🏷️  Testing tags endpoint...');

    try {
        const response = await fetch(`${BASE_URL}/api/research/tags?prefix=basal`);
        const result = await response.json();

        if (result.success) {
            console.log(`✅ Found ${result.tags.length} tags:`);
            result.tags.slice(0, 5).forEach(t => {
                console.log(`   - ${t.tag} (${t.count} documents)`);
            });
            return true;
        } else {
            console.error('❌ Tags failed:', result.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Tags error:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   SOMA Hybrid Search System - Test Suite');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Wait for SOMA
    const ready = await waitForSOMA();
    if (!ready) {
        process.exit(1);
    }

    let passed = 0;
    let total = 0;

    // Test 1: Ingest documents
    total++;
    if (await testIngest()) passed++;

    // Give indexing a moment to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Simple query
    total++;
    if (await testQuery('basal cell carcinoma treatment outcomes')) passed++;

    // Test 3: Query with filters (year range)
    total++;
    if (await testQuery('basal cell carcinoma', {
        year: { $gte: 2020, $lte: 2023 }
    })) passed++;

    // Test 4: Query with multiple filters
    total++;
    if (await testQuery('immunotherapy pembrolizumab', {
        hasOutcomeData: true,
        specialty: 'oncology',
        year: { $gte: 2020 }
    })) passed++;

    // Test 5: Stats
    total++;
    if (await testStats()) passed++;

    // Test 6: Tags
    total++;
    if (await testTags()) passed++;

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`   Test Results: ${passed}/${total} passed`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (passed === total) {
        console.log('🎉 ALL TESTS PASSED! Phase 1 implementation is working!\n');
        process.exit(0);
    } else {
        console.log(`⚠️  ${total - passed} test(s) failed. Check logs above.\n`);
        process.exit(1);
    }
}

// Run tests
runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
