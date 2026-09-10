import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { fileURLToPath, pathToFileURL } from 'url';
import 'dotenv/config';
import { callModel } from './model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(SRC_DIR, '..');

/**
 * Loads the pipeline configuration.
 * 
 * @param {string} [configPath] - Custom path to config file.
 * @returns {Object}
 */
export function loadPipelineConfig(configPath = path.join(SRC_DIR, 'config', 'pipeline.json')) {
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`[Pipeline] Warning reading config at ${configPath}:`, err.message);
  }

  return {
    skills: ['research_user_prompt', 'ui-design-plan', 'ui-code-generator'],
    tools: ['web_search'],
    settings: {
      interactive: true,
      sequentialStages: true,
      saveHtmlOutput: true,
      outputDir: 'output',
      maxToolSteps: 3,
    },
  };
}

/**
 * Loads a single skill prompt from src/skills/.
 * 
 * @param {string} skillName - Name of the skill file.
 * @returns {string} Skill markdown content.
 */
export function loadSkill(skillName) {
  const skillsDir = path.join(SRC_DIR, 'skills');
  const cleanName = skillName.replace(/\.md$/, '');
  const candidates = [
    path.join(skillsDir, `${cleanName}.md`),
    path.join(skillsDir, cleanName, 'SKILL.md'),
    path.join(skillsDir, `${cleanName}.txt`),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return fs.readFileSync(filePath, 'utf8').trim();
    }
  }

  console.warn(`  ⚠️ Skill "${cleanName}" not found in ${skillsDir}`);
  return '';
}

/**
 * Loads and concatenates multiple skills if needed.
 * 
 * @param {Array<string>} skillNames 
 * @returns {string}
 */
export function loadSkills(skillNames = []) {
  return skillNames
    .map((name) => {
      const content = loadSkill(name);
      return content ? `<!-- SKILL: ${name} -->\n${content}` : '';
    })
    .filter(Boolean)
    .join('\n\n---\n\n');
}

/**
 * Dynamically imports tools from src/tools/.
 * 
 * @param {Array<string>} toolNames 
 * @returns {Promise<Object>} Map of tool name to module.
 */
export async function loadTools(toolNames = []) {
  const loadedTools = {};
  const toolsDir = path.join(SRC_DIR, 'tools');

  for (const name of toolNames) {
    const cleanName = name.replace(/\.js$/, '');
    const toolFilePath = path.join(toolsDir, `${cleanName}.js`);

    if (fs.existsSync(toolFilePath)) {
      try {
        const moduleUrl = pathToFileURL(toolFilePath).href;
        const toolModule = await import(moduleUrl);
        loadedTools[cleanName] = toolModule;
        console.log(`  ✓ Loaded tool: ${cleanName}`);
      } catch (err) {
        console.error(`  ⚠️ Failed to load tool "${cleanName}":`, err.message);
      }
    } else {
      console.warn(`  ⚠️ Tool "${cleanName}" not found at ${toolFilePath}`);
    }
  }

  return loadedTools;
}

/**
 * Builds dynamic system tool calling instructions from loaded tools.
 * 
 * @param {Object} tools - Map of loaded tool modules.
 * @returns {string} Markdown tool documentation for the model.
 */
export function generateToolPrompt(tools = {}) {
  const definitions = [];

  for (const [toolModuleName, toolModule] of Object.entries(tools)) {
    if (toolModule.toolDefinitions && Array.isArray(toolModule.toolDefinitions)) {
      for (const def of toolModule.toolDefinitions) {
        definitions.push(`- \`${def.name}\`: ${def.description}\n  Usage format: \`${def.usage}\``);
      }
    } else {
      definitions.push(`- \`${toolModuleName}\`: Executes ${toolModuleName} utility.`);
    }
  }

  if (definitions.length === 0) return '';

  return `
---
## 🛠️ Available Tools for You to Use
You have access to the following tools when you need to research real-time information, competitor designs, or web pages:
${definitions.join('\n')}

### How to Trigger a Tool:
- If you need external information before completing your task, output ONLY a tool call block like this:
\`\`\`tool_call
{"tool": "web_search", "query": "your search query"}
\`\`\`
or
\`\`\`tool_call
{"tool": "scrape_page", "url": "https://example.com"}
\`\`\`
- The system will execute your tool request, retrieve live data from the web, and provide the results back to you.
- **IMPORTANT**: If you do NOT need external tools (e.g. asking the user questions or generating design specs), respond directly to the user WITHOUT outputting a tool_call block.
---
`;
}

/**
 * Extracts tool call JSON from model response if present.
 * 
 * @param {string} response - Raw model response.
 * @returns {{ tool: string, [key: string]: any } | null}
 */
export function extractToolCall(response) {
  if (!response || typeof response !== 'string') return null;

  // Pattern 1: ```tool_call ... ```
  const blockMatch = response.match(/```(?:tool_call|json)?\s*(\{\s*"tool"[\s\S]*?\})\s*```/i);
  if (blockMatch) {
    try {
      return JSON.parse(blockMatch[1]);
    } catch (e) {
      // JSON parse fallback
    }
  }

  // Pattern 2: Raw {"tool": "..."} in response
  const rawMatch = response.match(/(\{\s*"tool"\s*:\s*"[^"]+"[\s\S]*?\})/i);
  if (rawMatch) {
    try {
      return JSON.parse(rawMatch[1]);
    } catch (e) {
      // JSON parse fallback
    }
  }

  return null;
}

/**
 * Executes a tool requested by the model.
 */
export async function executeRequestedTool(tools, toolCall) {
  const toolName = toolCall.tool;

  for (const toolModule of Object.values(tools)) {
    if (typeof toolModule.executeTool === 'function') {
      try {
        const result = await toolModule.executeTool(toolName, toolCall);
        return result;
      } catch (err) {
        // Try other modules if any
      }
    }
    if (typeof toolModule[toolName] === 'function') {
      try {
        const param = toolCall.query || toolCall.url || toolCall;
        const result = await toolModule[toolName](param);
        return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      } catch (err) {
        // Fallback
      }
    }
  }

  return `Tool "${toolName}" not found or failed to execute.`;
}

/**
 * Executes an Agentic turn where the model receives the prompt first and calls tools when needed.
 * Streams output live to the console and optional frontend callbacks.
 * 
 * @param {string} prompt - Input prompt for this stage.
 * @param {string} baseSystemPrompt - The skill prompt.
 * @param {Object} tools - Loaded tools.
 * @param {Object} [options={}] - Options ({ onToken, onStatus, maxSteps }).
 * @returns {Promise<string>} Final model response.
 */
export async function runAgenticTurn(prompt, baseSystemPrompt, tools, options = {}) {
  const maxSteps = options.maxSteps || 3;
  const onToken = options.onToken;
  const onStatus = options.onStatus;

  const toolInstructions = generateToolPrompt(tools);
  const fullSystemPrompt = `${baseSystemPrompt}\n${toolInstructions}`;

  let currentPrompt = prompt;
  let conversationHistory = `User Prompt:\n${prompt}\n`;

  for (let step = 0; step < maxSteps; step++) {
    console.log(`\n🧠 [Pipeline] Generating response (streaming live)...\n`);
    if (onStatus) {
      onStatus({ type: 'status', message: 'Model is thinking and generating...' });
    }

    // Capture model tokens
    let stepTokens = '';
    const modelResponse = await callModel(
      currentPrompt,
      process.env.BASE_URL,
      process.env.MODEL_NAME,
      fullSystemPrompt,
      {
        streamToConsole: true,
        onToken: (token) => {
          stepTokens += token;
          if (onToken) onToken(token);
        },
      }
    );

    const toolCall = extractToolCall(modelResponse);

    // If the model did NOT call a tool, it has produced its final answer
    if (!toolCall) {
      return modelResponse;
    }

    // The model decided to call a tool!
    console.log(`\n🔧 [Model Tool Call] Model requested: "${toolCall.tool}" with query/url: "${toolCall.query || toolCall.url}"`);
    if (onStatus) {
      onStatus({
        type: 'tool',
        tool: toolCall.tool,
        query: toolCall.query || toolCall.url,
        message: `Searching web via Chromium for "${toolCall.query || toolCall.url}"...`,
      });
    }

    console.log(`🌐 [Tool Executing] Running ${toolCall.tool} via Headless Chromium...`);
    const toolResult = await executeRequestedTool(tools, toolCall);
    console.log(`  ✓ Tool returned results successfully.\n`);

    if (onStatus) {
      onStatus({ type: 'tool_done', tool: toolCall.tool, message: 'Web research retrieved. Analyzing data...' });
    }

    // Feed tool output back to the model
    conversationHistory += `\n[Your Tool Call]: ${JSON.stringify(toolCall)}\n[Tool Result]:\n${toolResult}\n`;
    currentPrompt = `${conversationHistory}\n\nPlease analyze the above tool results and proceed with your response:`;
  }

  // If reached max steps, do a final call
  if (onStatus) {
    onStatus({ type: 'status', message: 'Synthesizing final response...' });
  }

  return await callModel(
    `${conversationHistory}\n\nPlease provide your final response now:`,
    process.env.BASE_URL,
    process.env.MODEL_NAME,
    fullSystemPrompt,
    {
      streamToConsole: true,
      onToken: onToken,
    }
  );
}

/**
 * Helper to extract HTML code block from model output and save to file.
 */
function extractAndSaveHtml(rawOutput, outputDir = 'output') {
  const htmlMatch = rawOutput.match(/```html\s*([\s\S]*?)\s*```/i);
  const htmlContent = htmlMatch ? htmlMatch[1] : (rawOutput.includes('<!DOCTYPE html>') ? rawOutput : null);

  if (htmlContent) {
    const targetDir = path.join(ROOT_DIR, outputDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const outputPath = path.join(targetDir, 'index.html');
    fs.writeFileSync(outputPath, htmlContent.trim(), 'utf8');
    console.log(`\n💾 [Pipeline] Saved generated webpage to: ${outputPath}`);
    return outputPath;
  }
  return null;
}

function getStageLabel(skillName) {
  if (skillName.includes('research')) return 'Stage 1: Discovery & Market Research';
  if (skillName.includes('plan')) return 'Stage 2: Web UI Design Plan';
  if (skillName.includes('code')) return 'Stage 3: HTML5/Tailwind Code Generator';
  return skillName;
}

/**
 * Executes a stage with interactive review and feedback loops.
 */
async function executeStageWithFeedbackLoop({
  stageNum,
  totalStages,
  skillName,
  skillPrompt,
  initialInput,
  userPrompt,
  tools,
  isInteractive,
  rl,
}) {
  const stageLabel = getStageLabel(skillName);
  console.log(`\n======================================================`);
  console.log(`▶️ [Stage ${stageNum}/${totalStages}] ${stageLabel}`);
  console.log(`======================================================`);

  let currentOutput = await runAgenticTurn(initialInput, skillPrompt, tools);

  if (!isInteractive || !rl) {
    return currentOutput;
  }

  // Interactive review loop
  while (true) {
    console.log(`\n------------------------------------------------------`);
    const answer = await rl.question(
      `👉 Accept ${stageLabel} and proceed? ([y]es / [r]equest changes): `
    );

    const trimmed = answer.trim().toLowerCase();
    if (trimmed === 'y' || trimmed === 'yes' || trimmed === 'accept' || trimmed === 'ok' || trimmed === '') {
      console.log(`\n✅ ${stageLabel} accepted! Moving forward...\n`);
      return currentOutput;
    }

    let feedback = '';
    if (trimmed === 'n' || trimmed === 'no' || trimmed === 'r' || trimmed === 'change') {
      feedback = await rl.question(`\n📝 What changes would you like to make to this stage? `);
    } else {
      feedback = answer.trim();
    }

    if (!feedback || !feedback.trim()) {
      console.log('ℹ️ No changes specified. Keeping current output.');
      return currentOutput;
    }

    console.log(`\n🔄 [Pipeline] Refining ${stageLabel} with your feedback...`);
    const refinementPrompt = `Original User Request: "${userPrompt}"\n\nCurrent Stage Draft:\n${currentOutput}\n\nUser Requested Changes/Feedback:\n"${feedback}"\n\nPlease revise and improve the output strictly addressing the user's feedback.`;

    currentOutput = await runAgenticTurn(refinementPrompt, skillPrompt, tools);
  }
}

/**
 * Executes the full model-driven agentic pipeline.
 * 
 * @param {string} userPrompt - User prompt or idea.
 * @param {Object} [options={}] - Custom overrides.
 * @returns {Promise<string>}
 */
export async function runPipeline(userPrompt, options = {}) {
  if (!userPrompt || !userPrompt.trim()) {
    throw new Error('User prompt is required.');
  }

  const config = loadPipelineConfig(options.configPath);
  const activeSkillNames = options.skills || config.skills || [];
  const activeToolNames = options.tools || config.tools || [];
  const settings = { ...(config.settings || {}), ...(options.settings || {}) };

  const isInteractive = options.interactive !== undefined ? options.interactive : (settings.interactive !== false);
  const rl = isInteractive ? readline.createInterface({ input, output }) : null;

  console.log('\n========================================');
  console.log('       🚀 AI UI STUDIO PIPELINE         ');
  console.log('========================================');

  console.log('\n🔧 [Pipeline] Loading configured tools...');
  const tools = await loadTools(activeToolNames);

  let finalOutput = '';

  try {
    if (settings.sequentialStages && activeSkillNames.length > 1) {
      console.log(`\n📋 [Pipeline] Multi-Stage Execution (${activeSkillNames.length} stages)`);
      let currentContext = userPrompt;

      for (let i = 0; i < activeSkillNames.length; i++) {
        const skillName = activeSkillNames[i];
        const stageNum = i + 1;
        const skillPrompt = loadSkill(skillName);
        if (!skillPrompt) continue;

        let stageInput = '';
        if (i === 0) {
          stageInput = userPrompt;
        } else if (i === 1) {
          stageInput = `User Request:\n"${userPrompt}"\n\nAccepted Discovery & Research Findings:\n${currentContext}\n\nPlease formulate the custom Web UI Design Plan.`;
        } else {
          stageInput = `User Request:\n"${userPrompt}"\n\nAccepted Web UI Design Plan:\n${currentContext}\n\nPlease generate the full HTML5 + Tailwind CSS + Google Fonts & Icons code implementation.`;
        }

        const stageOutput = await executeStageWithFeedbackLoop({
          stageNum,
          totalStages: activeSkillNames.length,
          skillName,
          skillPrompt,
          initialInput: stageInput,
          userPrompt,
          tools,
          isInteractive,
          rl,
        });

        currentContext = stageOutput;
        finalOutput = stageOutput;
      }
    } else {
      // Single stage execution
      const combinedSkill = loadSkill(activeSkillNames[0] || 'research_user_prompt');
      finalOutput = await runAgenticTurn(userPrompt, combinedSkill, tools);
    }

    if (settings.saveHtmlOutput) {
      extractAndSaveHtml(finalOutput, settings.outputDir);
    }
  } finally {
    if (rl) {
      rl.close();
    }
    if (tools.web_search && typeof tools.web_search.closeBrowser === 'function') {
      await tools.web_search.closeBrowser();
    }
  }

  return finalOutput;
}

// CLI runner if executed directly
if (process.argv[1] && process.argv[1].endsWith('pipeline.js')) {
  (async () => {
    const prompt = process.argv.slice(2).join(' ') || 'I want to build a modern landing page for an AI code reviewer called CodePulse';

    try {
      const result = await runPipeline(prompt);
      console.log('\n================ FINAL RESULT ================\n');
      console.log(result);
      console.log('\n==============================================\n');
    } catch (error) {
      console.error('\n❌ [Pipeline Error]:', error.message);
    }
  })();
}

export default {
  runPipeline,
  loadSkill,
  loadSkills,
  loadTools,
  loadPipelineConfig,
};
