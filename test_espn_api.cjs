
const fetch = require('node-fetch'); // Using require for standalone script if node-fetch is available, or use native fetch in newer node

async function testESPN() {
    const sports = [
        { sport: 'basketball', league: 'nba' },
        { sport: 'football', league: 'nfl' }
    ];

    for (const s of sports) {
        const url = `https://site.api.espn.com/apis/site/v2/sports/${s.sport}/${s.league}/scoreboard`;
        console.log(`Fetching ${url}...`);
        try {
            const res = await fetch(url);
            if (!res.ok) {
                console.error(`Failed: ${res.status}`);
                continue;
            }
            const data = await res.json();
            console.log(`Success for ${s.league.toUpperCase()}!`);
            
            if (data.events) {
                console.log(`Events found: ${data.events.length}`);
                if (data.events.length > 0) {
                    const firstEvent = data.events[0];
                    console.log('Sample Event Structure keys:', Object.keys(firstEvent));
                    console.log('Status:', firstEvent.status?.type?.state);
                    console.log('Competitors:', firstEvent.competitions?.[0]?.competitors?.length);
                }
            } else {
                console.warn('No "events" array found in response.');
            }
        } catch (e) {
            console.error('Error:', e.message);
        }
        console.log('---');
    }
}

testESPN();
