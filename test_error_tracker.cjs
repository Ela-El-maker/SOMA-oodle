const { BaseArbiter } = require('./core/BaseArbiter.cjs');
const LearningVelocityTracker = require('./arbiters/LearningVelocityTracker.cjs');

try {
  console.log('Testing LearningVelocityTracker instantiation...');
  const tracker = new LearningVelocityTracker({ name: 'LearningVelocityTracker' });
  console.log('Success:', tracker.name);
} catch (error) {
  console.error('Caught error:', error);
  console.error('Stack:', error.stack);
}
