const { BaseArbiter } = require('./core/BaseArbiter.cjs');

try {
  console.log('Testing BaseArbiter instantiation...');
  const arbiter = new BaseArbiter({ name: 'TestArbiter' });
  console.log('Success:', arbiter.name);
} catch (error) {
  console.error('Caught error:', error);
}
