import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import { callModel } from './core/model.js';
import { loadSkill, loadTools, runAgenticTurn } from './core/pipeline.js';
import {
  estimateTokens,
  checkTokenLimit,
  addTokens,
  getSessionUsage,
  resetSession,
} from './core/token_tracker.js';
import {
  listProjects,
  getProject,
  getProjectMessages,
  saveProjectResearch,
  saveProjectDesignPlan,
  saveProjectHtmlCode,
  syncProjectState,
  recordProjectFeedback,
  deleteProject,
} from './core/db.js';
import { handleChatTurn } from './core/chat_orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Loaded tools singleton
let tools = {};
loadTools(['web_search', 'url_scraper']).then((loaded) => {
  tools = loaded;
  console.log('🔧 [Server] Tools loaded successfully:', Object.keys(tools).join(', '));
});

// Helper: Setup SSE Headers
function setupSSE(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');
}

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Helper: Extract HTML code block
function extractHtml(rawText) {
  const match = rawText.match(/```html\s*([\s\S]*?)\s*```/i);
  if (match) return match[1].trim();
  if (rawText.includes('<!DOCTYPE html>')) {
    const start = rawText.indexOf('<!DOCTYPE html>');
    const end = rawText.lastIndexOf('</html>');
    if (end > start) {
      return rawText.slice(start, end + 7).trim();
    }
    return rawText.trim();
  }
  return rawText;
}

// -------------------------------------------------------------
// 1. Health & Config
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: process.env.MODEL_NAME,
    baseUrl: process.env.BASE_URL,
    timeout: process.env.TIMEOUT || '180',
  });
});

// -------------------------------------------------------------
// 2. Token Usage & Session Reset
// -------------------------------------------------------------
app.get('/api/session/:sessionId/usage', (req, res) => {
  const { sessionId } = req.params;
  const usage = getSessionUsage(sessionId || 'default');
  res.json({ usage });
});

app.post('/api/session/reset', (req, res) => {
  const { sessionId = 'default' } = req.body;
  resetSession(sessionId);
  res.json({ success: true, usage: getSessionUsage(sessionId) });
});

// -------------------------------------------------------------
// Projects Database Endpoints (SQLite Persistent Store)
// -------------------------------------------------------------
app.get('/api/projects', (req, res) => {
  try {
    const projects = listProjects();
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    const project = getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    deleteProject(req.params.id);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync project draft state to SQLite
app.post('/api/projects/:id/sync', (req, res) => {
  try {
    const { id } = req.params;
    const { prompt, research, designPlan, htmlCode, status, researchTokens, designTokens, codeTokens } = req.body;
    syncProjectState(id, {
      prompt,
      research,
      designPlan,
      htmlCode,
      status,
      researchTokens: researchTokens || 0,
      designTokens: designTokens || 0,
      codeTokens: codeTokens || 0,
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all chat messages for a project
app.get('/api/projects/:id/messages', (req, res) => {
  try {
    const messages = getProjectMessages(req.params.id);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Active chat controllers for cancellation/stop
const activeChatControllers = new Map();

// -------------------------------------------------------------
// CHAT WORKSPACE PIPELINE (SSE Streaming)
// Runs background stages, streams execution milestones & artifacts
// -------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
  const { sessionId = 'default', message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  // Disable socket timeouts for this long-running streaming response
  req.socket?.setTimeout(0);
  res.socket?.setTimeout(0);

  setupSSE(res);

  // Send keepalive comment every 5s so reverse proxies (Localtunnel, Pinggy) never 408 timeout
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (_) {}
  }, 5000);

  const abortController = new AbortController();
  activeChatControllers.set(sessionId, abortController);

  req.on('close', () => {
    clearInterval(heartbeat);
    abortController.abort();
    activeChatControllers.delete(sessionId);
  });

  try {
    await handleChatTurn({
      projectId: sessionId,
      message: message.trim(),
      tools,
      sendEvent: (data) => sendSSE(res, data),
      abortSignal: abortController.signal,
    });
    clearInterval(heartbeat);
    activeChatControllers.delete(sessionId);
    res.end();
  } catch (error) {
    clearInterval(heartbeat);
    activeChatControllers.delete(sessionId);
    if (abortController.signal.aborted) {
      console.log(`[Chat] Session ${sessionId} generation aborted by user.`);
    } else {
      console.error('Chat endpoint error:', error);
      sendSSE(res, { type: 'error', error: error.message });
    }
    res.end();
  }
});

// Explicit stop endpoint to cancel background model execution
app.post('/api/chat/stop', (req, res) => {
  const { sessionId = 'default' } = req.body;
  const controller = activeChatControllers.get(sessionId);
  if (controller) {
    controller.abort();
    activeChatControllers.delete(sessionId);
    console.log(`🛑 [Server] Aborted model execution for session: ${sessionId}`);
    return res.json({ success: true, message: 'Generation stopped' });
  }
  res.json({ success: true, message: 'No active generation found' });
});

// -------------------------------------------------------------
// 3. Stage 1: Discovery & Research (SSE Streaming)
// -------------------------------------------------------------
app.post('/api/research', async (req, res) => {
  const { prompt, sessionId = 'default' } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  // Token Limit Check for Research (10,000 max)
  const estimatedInputTokens = estimateTokens(prompt);
  const limitCheck = checkTokenLimit(sessionId, 'research', estimatedInputTokens);

  if (!limitCheck.allowed) {
    return res.status(403).json({
      error: `Research stage token limit exceeded (${limitCheck.current}/${limitCheck.max} tokens used).`,
      usage: getSessionUsage(sessionId),
    });
  }

  setupSSE(res);
  sendSSE(res, { type: 'status', message: 'Starting discovery analysis and web check...' });

  try {
    const skillPrompt = loadSkill('research_user_prompt');
    const result = await runAgenticTurn(prompt, skillPrompt, tools, {
      onToken: (token) => {
        sendSSE(res, { type: 'token', text: token });
      },
      onStatus: (statusData) => {
        sendSSE(res, statusData);
      },
    });

    const tokensUsed = estimateTokens(prompt) + estimateTokens(result);
    addTokens(sessionId, 'research', tokensUsed);

    saveProjectResearch(sessionId, {
      prompt,
      research: result,
      tokens: getSessionUsage(sessionId).research.used,
      status: 'research_ready',
    });

    sendSSE(res, {
      type: 'done',
      result,
      usage: getSessionUsage(sessionId),
      sessionId,
    });
    res.end();
  } catch (error) {
    console.error('Research API error:', error.message);
    sendSSE(res, { type: 'error', error: error.message });
    res.end();
  }
});

app.post('/api/research/refine', async (req, res) => {
  const { feedback, currentResearch, prompt, sessionId = 'default' } = req.body;

  if (!feedback) {
    return res.status(400).json({ error: 'Feedback is required.' });
  }

  const estimatedNew = estimateTokens(feedback) + estimateTokens(currentResearch);
  const limitCheck = checkTokenLimit(sessionId, 'research', estimatedNew);

  if (!limitCheck.allowed) {
    return res.status(403).json({
      error: `Research token limit exceeded (${limitCheck.current}/${limitCheck.max} tokens used).`,
      usage: getSessionUsage(sessionId),
    });
  }

  setupSSE(res);
  sendSSE(res, { type: 'status', message: 'Refining research with your feedback...' });

  try {
    const skillPrompt = loadSkill('research_user_prompt');
    const refinementPrompt = `Original Request: "${prompt}"\n\nCurrent Research Draft:\n${currentResearch}\n\nUser Requested Changes:\n"${feedback}"\n\nPlease refine the discovery research dossier strictly incorporating this feedback:`;

    const result = await runAgenticTurn(refinementPrompt, skillPrompt, tools, {
      onToken: (token) => {
        sendSSE(res, { type: 'token', text: token });
      },
      onStatus: (statusData) => {
        sendSSE(res, statusData);
      },
    });

    const tokensUsed = estimateTokens(refinementPrompt) + estimateTokens(result);
    addTokens(sessionId, 'research', tokensUsed);

    saveProjectResearch(sessionId, {
      prompt,
      research: result,
      tokens: getSessionUsage(sessionId).research.used,
      status: 'research_ready',
    });
    recordProjectFeedback(sessionId, 'research', feedback, result);

    sendSSE(res, {
      type: 'done',
      result,
      usage: getSessionUsage(sessionId),
      sessionId,
    });
    res.end();
  } catch (error) {
    console.error('Research refine error:', error.message);
    sendSSE(res, { type: 'error', error: error.message });
    res.end();
  }
});

// -------------------------------------------------------------
// 4. Stage 2: Web UI Design Plan (SSE Streaming)
// -------------------------------------------------------------
app.post('/api/design-plan', async (req, res) => {
  const { prompt, research, sessionId = 'default' } = req.body;

  if (!prompt || !research) {
    return res.status(400).json({ error: 'Prompt and accepted research findings are required.' });
  }

  const estimatedInputTokens = estimateTokens(prompt) + estimateTokens(research);
  const limitCheck = checkTokenLimit(sessionId, 'design', estimatedInputTokens);

  if (!limitCheck.allowed) {
    return res.status(403).json({
      error: `Design Plan token limit exceeded (${limitCheck.current}/${limitCheck.max} tokens used).`,
      usage: getSessionUsage(sessionId),
    });
  }

  setupSSE(res);
  sendSSE(res, { type: 'status', message: 'Formulating bespoke color palette, fonts & section layouts...' });

  // Mark project status as designing immediately
  saveProjectDesignPlan(sessionId, {
    prompt,
    research,
    designPlan: '',
    status: 'designing',
  });

  try {
    const skillPrompt = loadSkill('ui-design-plan');
    const stageInput = `User Request:\n"${prompt}"\n\nAccepted Discovery & Research Findings:\n${research}\n\nPlease formulate the custom Web UI Design Plan:`;

    const result = await runAgenticTurn(stageInput, skillPrompt, tools, {
      onToken: (token) => {
        sendSSE(res, { type: 'token', text: token });
      },
      onStatus: (statusData) => {
        sendSSE(res, statusData);
      },
    });

    const tokensUsed = estimateTokens(stageInput) + estimateTokens(result);
    addTokens(sessionId, 'design', tokensUsed);

    saveProjectDesignPlan(sessionId, {
      prompt,
      research,
      designPlan: result,
      tokens: getSessionUsage(sessionId).design.used,
      status: 'design_ready',
    });

    sendSSE(res, {
      type: 'done',
      result,
      usage: getSessionUsage(sessionId),
      sessionId,
    });
    res.end();
  } catch (error) {
    console.error('Design Plan error:', error.message);
    sendSSE(res, { type: 'error', error: error.message });
    res.end();
  }
});

app.post('/api/design-plan/refine', async (req, res) => {
  const { feedback, currentPlan, prompt, research, sessionId = 'default' } = req.body;

  if (!feedback) {
    return res.status(400).json({ error: 'Feedback is required.' });
  }

  const estimatedNew = estimateTokens(feedback) + estimateTokens(currentPlan);
  const limitCheck = checkTokenLimit(sessionId, 'design', estimatedNew);

  if (!limitCheck.allowed) {
    return res.status(403).json({
      error: `Design Plan token limit exceeded (${limitCheck.current}/${limitCheck.max} tokens used).`,
      usage: getSessionUsage(sessionId),
    });
  }

  setupSSE(res);
  sendSSE(res, { type: 'status', message: 'Updating design specifications with your changes...' });

  try {
    const skillPrompt = loadSkill('ui-design-plan');
    const refinementPrompt = `Original Request: "${prompt}"\n\nResearch Findings:\n${research}\n\nCurrent Design Plan Draft:\n${currentPlan}\n\nUser Requested Changes:\n"${feedback}"\n\nPlease revise the Web UI Design Plan incorporating the changes:`;

    const result = await runAgenticTurn(refinementPrompt, skillPrompt, tools, {
      onToken: (token) => {
        sendSSE(res, { type: 'token', text: token });
      },
      onStatus: (statusData) => {
        sendSSE(res, statusData);
      },
    });

    const tokensUsed = estimateTokens(refinementPrompt) + estimateTokens(result);
    addTokens(sessionId, 'design', tokensUsed);

    saveProjectDesignPlan(sessionId, {
      designPlan: result,
      tokens: getSessionUsage(sessionId).design.used,
      status: 'design_ready',
    });
    recordProjectFeedback(sessionId, 'design', feedback, result);

    sendSSE(res, {
      type: 'done',
      result,
      usage: getSessionUsage(sessionId),
      sessionId,
    });
    res.end();
  } catch (error) {
    console.error('Design Plan refine error:', error.message);
    sendSSE(res, { type: 'error', error: error.message });
    res.end();
  }
});

// -------------------------------------------------------------
// 5. Stage 3: HTML5/Tailwind Code Generator (SSE Streaming)
// -------------------------------------------------------------
app.post('/api/code-gen', async (req, res) => {
  const { prompt, designPlan, research, sessionId = 'default' } = req.body;

  if (!designPlan) {
    return res.status(400).json({ error: 'Design plan is required to generate code.' });
  }

  setupSSE(res);
  sendSSE(res, { type: 'status', message: 'Generating production-ready HTML5 + Tailwind CSS code...' });

  // Ensure design plan and research are committed to SQLite before generating code
  saveProjectDesignPlan(sessionId, {
    prompt,
    research,
    designPlan,
    tokens: getSessionUsage(sessionId).design.used,
    status: 'generating_code',
  });

  try {
    const skillPrompt = loadSkill('ui-code-generator');
    const stageInput = `User Request:\n"${prompt}"\n\nAccepted Web UI Design Plan:\n${designPlan}\n\nPlease generate the complete, standalone HTML5 + Tailwind CSS + Google Fonts/Icons code implementation:`;

    const rawOutput = await runAgenticTurn(stageInput, skillPrompt, tools, {
      onToken: (token) => {
        sendSSE(res, { type: 'token', text: token });
      },
      onStatus: (statusData) => {
        sendSSE(res, statusData);
      },
    });

    const html = extractHtml(rawOutput);

    // Save to output directory
    const outputFilePath = path.join(OUTPUT_DIR, `${sessionId}.html`);
    fs.writeFileSync(outputFilePath, html, 'utf8');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html, 'utf8');

    addTokens(sessionId, 'code', estimateTokens(stageInput) + estimateTokens(rawOutput));

    saveProjectHtmlCode(sessionId, {
      html,
      tokens: estimateTokens(stageInput) + estimateTokens(rawOutput),
      feedbackNote: 'Initial Code Generation',
      status: 'completed',
    });

    sendSSE(res, {
      type: 'done',
      html,
      previewUrl: `/api/preview/${sessionId}`,
      usage: getSessionUsage(sessionId),
      sessionId,
    });
    res.end();
  } catch (error) {
    console.error('Code generation error:', error.message);
    sendSSE(res, { type: 'error', error: error.message });
    res.end();
  }
});

app.post('/api/code-gen/refine', async (req, res) => {
  const { feedback, currentCode, prompt, designPlan, sessionId = 'default' } = req.body;

  if (!feedback) {
    return res.status(400).json({ error: 'Feedback is required.' });
  }

  setupSSE(res);
  sendSSE(res, { type: 'status', message: 'Applying code updates...' });

  try {
    const skillPrompt = loadSkill('ui-code-generator');
    const refinementPrompt = `Original Request: "${prompt}"\n\nDesign Plan:\n${designPlan}\n\nCurrent HTML Code:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nUser Requested Changes:\n"${feedback}"\n\nPlease output the updated complete HTML5 + Tailwind CSS code:`;

    const rawOutput = await runAgenticTurn(refinementPrompt, skillPrompt, tools, {
      onToken: (token) => {
        sendSSE(res, { type: 'token', text: token });
      },
      onStatus: (statusData) => {
        sendSSE(res, statusData);
      },
    });

    const html = extractHtml(rawOutput);

    const outputFilePath = path.join(OUTPUT_DIR, `${sessionId}.html`);
    fs.writeFileSync(outputFilePath, html, 'utf8');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html, 'utf8');

    addTokens(sessionId, 'code', estimateTokens(refinementPrompt) + estimateTokens(rawOutput));

    saveProjectHtmlCode(sessionId, {
      html,
      tokens: estimateTokens(refinementPrompt) + estimateTokens(rawOutput),
      feedbackNote: feedback,
      status: 'completed',
    });
    recordProjectFeedback(sessionId, 'code', feedback, html);

    sendSSE(res, {
      type: 'done',
      html,
      previewUrl: `/api/preview/${sessionId}`,
      usage: getSessionUsage(sessionId),
      sessionId,
    });
    res.end();
  } catch (error) {
    console.error('Code refine error:', error.message);
    sendSSE(res, { type: 'error', error: error.message });
    res.end();
  }
});

// -------------------------------------------------------------
// 6. Live HTML Preview Endpoint (for iframe rendering)
// -------------------------------------------------------------
app.get('/api/preview/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const targetFile = path.join(OUTPUT_DIR, `${sessionId}.html`);
  const defaultFile = path.join(OUTPUT_DIR, 'index.html');

  if (fs.existsSync(targetFile)) {
    return res.sendFile(targetFile);
  }

  // Check SQLite Database if not found on disk
  try {
    const project = getProject(sessionId);
    if (project && project.html_code) {
      fs.writeFileSync(targetFile, project.html_code, 'utf8');
      return res.sendFile(targetFile);
    }
  } catch (_) {}

  if (fs.existsSync(defaultFile)) {
    return res.sendFile(defaultFile);
  }

  res.send('<html><body><h2>No preview generated yet.</h2></body></html>');
});

// -------------------------------------------------------------
// 7. Serve Static Frontend (Vite Production Build)
// -------------------------------------------------------------
const FRONTEND_DIST = path.join(ROOT_DIR, 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
  console.log(`📦 [Server] Frontend static bundle served from: ${FRONTEND_DIST}`);
}

// Start Express Server
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 AI UI STUDIO Backend running on http://localhost:${PORT}`);
  console.log(`========================================\n`);
});

export default app;
