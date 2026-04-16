import fetch from 'node-fetch';

async function test() {
    try {
        const res = await fetch('http://127.0.0.1:3001/api/knowledge/fragments');
        const data = await res.json();
        console.log(`Success: ${data.success}`);
        console.log(`Fragment count: ${data.fragments?.length}`);
        console.log(`Link count: ${data.links?.length}`);
        
        if (data.fragments && data.fragments.length > 0) {
            console.log(`Sample fragment: ${JSON.stringify(data.fragments[0])}`);
        }
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
}

test();
