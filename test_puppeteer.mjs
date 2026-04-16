import fetch from 'node-fetch';

async function testMinimize() {
    console.log('🚀 Mission: SOMA Puppeteer - Minimize Window...');
    try {
        // Alt+Space, then n is the Windows shortcut to minimize the active window.
        // In PowerShell SendKeys: % is Alt, " " is Space, "n" is n.
        const response = await fetch('http://localhost:3001/api/tools/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: "computer_control",
                args: { 
                    actionType: "type", 
                    params: { text: "% n" } 
                }
            })
        });

        const data = await response.json();
        console.log('\n🎮 Action Result:');
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ Action failed:', err.message);
    }
}

testMinimize();
