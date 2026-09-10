import 'dotenv/config';
import { callModel } from '../src/core/model.js';

async function runTest() {
  console.log('========================================');
  console.log('          AI MODEL TEST RUNNER          ');
  console.log('========================================\n');

  console.log('--- Environment Configuration ---');
  console.log(`BASE_URL:   ${process.env.BASE_URL || '(not set)'}`);
  console.log(`MODEL_NAME: ${process.env.MODEL_NAME || '(not set)'}`);
  console.log(`TIMEOUT:    ${process.env.TIMEOUT || '180'}s`);
  console.log('---------------------------------\n');

  const testPrompt = 'write 10 tools used by devops';
  console.log(`[Test] Sending prompt: "${testPrompt}"\n`);

  const startTime = Date.now();

  try {
    const response = await callModel(testPrompt);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`[Success] Response received in ${duration}s:\n`);
    console.log('--- Model Output ---');
    console.log(response);
    console.log('--------------------\n');
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('\n[Test Failed]:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log(`1. Ensure your model server is running at: ${process.env.BASE_URL}`);
    console.log(`2. Verify the model '${process.env.MODEL_NAME}' is installed/pulled.`);
  }
}

runTest();
