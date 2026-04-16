
import { SomaBootstrap } from './core/SomaBootstrap.js';
import { CONFIG } from './core/SomaConfig.js';

async function main() {
  console.log('⚛️  SOMA Quantum Simulation Test...');
  
  const bootstrap = new SomaBootstrap(process.cwd(), CONFIG);
  const system = await bootstrap.initialize();
  
  const quantumSim = system.quantumSim;
  
  if (!quantumSim) {
      console.error('❌ QuantumSimulationArbiter not found in system.');
      process.exit(1);
  }

  console.log('\n🌟 RUNNING BELL STATE EXPERIMENT (Entanglement Check)');
  console.log('------------------------------------------------------');
  
  const result = await quantumSim.testBellState();
  
  console.log('\n📊 RESULTS:');
  console.log(`   States Measured: ${JSON.stringify(result.results)}`);
  console.log(`   Entanglement Score: ${result.entanglementScore}`);
  console.log(`   Is Entangled: ${result.isEntangled ? '✅ YES' : '❌ NO'}`);
  console.log('------------------------------------------------------');
  
  if (result.isEntangled) {
      console.log('🚀 SUCCESS: SOMA has successfully simulated quantum entanglement.');
  }

  process.exit(0);
}

main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
