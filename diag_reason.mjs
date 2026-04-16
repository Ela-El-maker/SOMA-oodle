import fetch from 'node-fetch';

async function diag() {
    console.log('🔍 Diagnostic: Fetching RAW reasoning result...');
    const res = await fetch('http://localhost:3001/api/soma/reason', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: "hello", conversationId: "diag" })
    });
    const data = await res.json();
    console.log('Result Object:', JSON.stringify(data, null, 2));
}

diag();
