/**
 * Node capability detection for SOMA cluster
 */

const os = require('os');
const child_process = require('child_process');

function detectGpu() {
  try {
    // Windows: try nvidia-smi
    child_process.execSync('nvidia-smi -L', { stdio: 'ignore' });
    return { vendor: 'NVIDIA', api: 'CUDA' };
  } catch (_) {}
  
  try {
    // Try DirectML presence via dxdiag (best-effort)
    child_process.execSync('dxdiag /t %TEMP%\\dxdiag.txt', { stdio: 'ignore' });
    return { vendor: 'Microsoft', api: 'DirectML' };
  } catch (_) {}
  
  return null;
}

function detectRole(hostname) {
  const h = hostname.toLowerCase();
  if (h.includes('gaming') || h.includes('rtx') || h.includes('xbox')) return 'compute';
  if (h.includes('macbook') || h.includes('laptop')) return 'cache';
  if (h.includes('imac') || h.includes('server') || h.includes('nas')) return 'overflow';
  return 'worker';
}

function getNodeInfo() {
  const hostname = os.hostname();
  const gpu = detectGpu();
  const role = detectRole(hostname);
  return {
    nodeId: hostname,
    capabilities: {
      cpuCores: os.cpus().length,
      ramTotal: os.totalmem(),
      ramFree: os.freemem(),
      gpu: gpu || undefined,
      role
    }
  };
}

module.exports = { getNodeInfo };
