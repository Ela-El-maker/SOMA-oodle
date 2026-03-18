import { execSync, spawn } from 'child_process';
import os from 'os';

async function main() {
    console.log('💀 Performing hard reset...');

    if (os.platform() === 'win32') {
        // Kill all node processes except this one
        try {
            const currentPid = process.pid;
            const output = execSync('wmic process where "name=\'node.exe\'" get ProcessId').toString();
            const pids = output.split('\n')
                .map(l => l.trim())
                .filter(l => l && !isNaN(l) && parseInt(l) !== currentPid);
            
            for (const pid of pids) {
                console.log(`- Killing PID ${pid}`);
                try { execSync(`taskkill /F /PID ${pid}`); } catch (e) {}
            }
        } catch (e) {
            console.log('No other node processes found.');
        }
    }

    console.log('🚀 Starting SOMA ULTRA...');
    const soma = spawn('node', ['launcher_ULTRA.mjs'], {
        detached: true,
        stdio: 'ignore'
    });
    soma.unref();

    console.log('Waiting for bootstrap (20s)...');
    await new Promise(r => setTimeout(r, 20000));
    console.log('Done.');
}

main();
