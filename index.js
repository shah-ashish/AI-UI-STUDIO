import { runPipeline, loadSkills, loadTools, loadPipelineConfig } from './src/core/pipeline.js';
import { callModel } from './src/core/model.js';

// CLI entry point: node index.js "your prompt here"
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  const userPrompt = process.argv.slice(2).join(' ') || 'I want to build a portfolio for a freelance UI/UX designer named Ashish Shah';

  (async () => {
    try {
      const result = await runPipeline(userPrompt);
      console.log('\n================ FINAL OUTPUT ================\n');
      console.log(result);
      console.log('\n==============================================\n');
    } catch (error) {
      console.error('\n❌ [Execution Error]:', error.message);
      process.exit(1);
    }
  })();
}

// Module exports
export {
  runPipeline,
  loadSkills,
  loadTools,
  loadPipelineConfig,
  callModel,
};

export default {
  runPipeline,
  loadSkills,
  loadTools,
  loadPipelineConfig,
  callModel,
};
