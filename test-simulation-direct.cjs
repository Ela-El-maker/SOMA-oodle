// Full AGI-Enhanced Simulation Test
const SimulationArbiter = require('./arbiters/SimulationArbiter.cjs');
const SimulationControllerArbiter = require('./arbiters/SimulationControllerArbiter.cjs');
const messageBroker = require('./core/MessageBroker.cjs');

// AGI Arbiters for enhanced learning
const WorldModelArbiter = require('./arbiters/WorldModelArbiter.js');
const CausalityArbiter = require('./arbiters/CausalityArbiter.js');
const DreamArbiter = require('./arbiters/DreamArbiter.cjs');
const MetaLearningArbiter = require('./arbiters/MetaLearningArbiter.js');
const AbstractionArbiter = require('./arbiters/AbstractionArbiter.js');
const CuriosityEngine = require('./arbiters/CuriosityEngine.js');

async function test() {
  console.log('Testing SOMA with FULL AGI Architecture...\n');

  try {
    // 0. Use shared MessageBroker singleton for communication
    console.log('Using shared MessageBroker for arbiter communication');

    // 1. Spawn AGI Arbiters (SOMA's cognitive enhancement)
    console.log('\n🧠 Spawning AGI Arbiters...');

    const worldModel = new WorldModelArbiter({ messageBroker: messageBroker });
    await worldModel.initialize();
    messageBroker.registerArbiter(worldModel.name, { instance: worldModel, role: 'specialist' });
    console.log('   ✅ WorldModelArbiter (prediction)');

    const causality = new CausalityArbiter({ messageBroker: messageBroker });
    await causality.initialize();
    messageBroker.registerArbiter(causality.name, { instance: causality, role: 'specialist' });
    console.log('   ✅ CausalityArbiter (cause-effect)');

    const dream = new DreamArbiter({ messageBroker: messageBroker });
    await dream.initialize();
    messageBroker.registerArbiter(dream.name, { instance: dream, role: 'specialist' });
    console.log('   ✅ DreamArbiter (memory consolidation)');

    const metaLearning = new MetaLearningArbiter({ messageBroker: messageBroker });
    await metaLearning.initialize();
    messageBroker.registerArbiter(metaLearning.name, { instance: metaLearning, role: 'specialist' });
    console.log('   ✅ MetaLearningArbiter (learn-to-learn)');

    const abstraction = new AbstractionArbiter({ messageBroker: messageBroker });
    await abstraction.initialize();
    messageBroker.registerArbiter(abstraction.name, { instance: abstraction, role: 'specialist' });
    console.log('   ✅ AbstractionArbiter (pattern recognition)');

    const curiosity = new CuriosityEngine({ messageBroker: messageBroker });
    await curiosity.initialize();
    messageBroker.registerArbiter(curiosity.name, { instance: curiosity, role: 'specialist' });
    console.log('   ✅ CuriosityEngine (exploration strategy)');

    // 2. Start Physics Simulation
    console.log('\n🏗️  Starting Physics Environment...');
    const sim = new SimulationArbiter({
      port: 8081,
      messageBroker: messageBroker
    });
    await sim.initialize();
    messageBroker.registerArbiter(sim.name, { instance: sim, role: 'specialist' });
    console.log('   ✅ SimulationArbiter initialized (physics engine)');

    // 3. Start RL Controller (SOMA brain)
    console.log('\n🤖 Starting SOMA Brain...');
    const controller = new SimulationControllerArbiter({
      messageBroker: messageBroker
    });
    await controller.initialize();
    messageBroker.registerArbiter(controller.name, { instance: controller, role: 'specialist' });
    console.log('   ✅ SimulationControllerArbiter initialized (SOMA brain)');

    // 4. Start simulation
    sim.startSimulation();
    console.log('   ✅ Physics simulation running');

    // 5. Start controller
    controller.startControl();
    console.log('   ✅ RL controller active - SOMA learning to move!');

    console.log('\n📡 WebSocket: ws://localhost:8081');
    console.log('🎮 Open simulation_viewer.html to watch SOMA learn!\n');
    console.log('🧠 Full AGI Architecture Active:');
    console.log('   - WorldModel: Predicting action outcomes');
    console.log('   - Causality: Understanding cause-effect');
    console.log('   - Dream: Consolidating experiences');
    console.log('   - MetaLearning: Optimizing learning strategy');
    console.log('   - Abstraction: Recognizing spatial patterns');
    console.log('   - Curiosity: Directing exploration\n');

    // Monitor learning progress with AGI status
    let lastQTableSize = 0;
    setInterval(() => {
      const stats = controller.getStats();
      const agiStatus = stats.agiFeatures;

      if (stats.qTableSize !== lastQTableSize || stats.qTableSize % 100 === 0) {
        console.log(`📊 Learning: ${stats.qTableSize} states, ${stats.actionsExecuted} actions, Episode ${stats.episodesCompleted}`);

        if (agiStatus) {
          const connectedCount = Object.values(agiStatus).filter(sys => sys.connected).length;
          console.log(`   🧠 AGI Systems Connected: ${connectedCount}/6`);
        }

        lastQTableSize = stats.qTableSize;
      }
    }, 5000);

  } catch (error) {
    console.error('Failed to initialize:');
    console.error(error);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
