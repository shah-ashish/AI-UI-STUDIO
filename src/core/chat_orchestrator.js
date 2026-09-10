import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callModel } from './model.js';
import { loadSkill, runAgenticTurn } from './pipeline.js';
import {
  saveChatMessage,
  updateChatMessage,
  getProject,
  getProjectMessages,
  saveProjectResearch,
  saveProjectDesignPlan,
  saveProjectHtmlCode,
  recordProjectFeedback,
} from './db.js';
import { addTokens, estimateTokens, getSessionUsage } from './token_tracker.js';
import { scrapeUrl } from '../tools/url_scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper: Extract HTML code block
function extractHtml(rawText) {
  if (!rawText) return '';
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
  return rawText.trim();
}

/**
 * Lets the LLM analyze conversation context & user message to decide the action autonomously
 */
async function determineTurnActionWithModel(message, project, conversationHistory = []) {
  const systemPrompt = `You are the central Brain & Router of AI UI STUDIO.
Analyze the user's latest message in the context of the conversation history and current project artifacts.
Decide which action to take. Return ONLY a valid JSON object.

Available Actions:
- "chat": The user is asking a conversational question, inquiring about prior tasks, asking what they gave you, greeting, or discussing. DO NOT start any pipeline stage.
- "start_research": The user is giving a prompt or instruction to build, create, or design a new web page/app (Stage 1).
- "proceed_to_design": The user approved the research and wants to advance to the UI Design Plan (Stage 2).
- "proceed_to_code": The user approved the design and wants to compile the HTML5/Tailwind prototype (Stage 3).
- "refine_research": The user wants to modify, research again, or add criteria to the research dossier.
- "refine_design": The user wants to change color palette, typography, layout, or tokens in the design plan.
- "refine_code": The user wants to modify, add, or tweak elements in the existing HTML/CSS code.

Current Project Status:
- Title: "${project.title || 'Untitled'}"
- Initial Prompt: "${project.prompt || 'None'}"
- Has Research Dossier: ${project.research ? 'Yes' : 'No'}
- Has UI Design Plan: ${project.design_plan ? 'Yes' : 'No'}
- Has HTML Prototype: ${project.html_code ? 'Yes' : 'No'}

JSON Output Format:
{
  "action": "chat" | "start_research" | "proceed_to_design" | "proceed_to_code" | "refine_research" | "refine_design" | "refine_code",
  "reasoning": "brief explanation",
  "chat_reply": "If action is 'chat', provide your direct conversational response here"
}`;

  const historySnippet = conversationHistory
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = `Conversation History:
${historySnippet || '(No prior messages)'}

User's Latest Message:
"${message}"

Return JSON:`;

  try {
    const raw = await callModel(prompt, process.env.BASE_URL, process.env.MODEL_NAME, systemPrompt, {
      streamToConsole: false,
    });
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const decision = JSON.parse(match[0]);
      console.log(`🤖 [Model Router] Action decided: "${decision.action}" (${decision.reasoning || ''})`);
      return decision;
    }
  } catch (err) {
    console.warn('Model routing parse warning:', err.message);
  }

  // Safe fallback if parsing fails
  if (!project.research) return { action: 'start_research' };
  if (project.html_code) return { action: 'refine_code' };
  return { action: 'chat' };
}

/**
 * Handle a chat turn with live streaming SSE events and model-driven routing
 */
export async function handleChatTurn({
  projectId,
  message,
  tools = {},
  sendEvent,
  abortSignal,
}) {
  const project = getProject(projectId) || {
    id: projectId,
    title: message.substring(0, 45),
    prompt: message,
    research: '',
    design_plan: '',
    html_code: '',
  };

  const priorMessages = getProjectMessages(projectId) || [];

  // 1. Save user's incoming message
  saveChatMessage({
    projectId,
    role: 'user',
    content: message,
    stage: 'input',
    status: 'completed',
  });

  // 2. Let the Model determine the action
  sendEvent({
    type: 'status',
    message: 'Understanding intent & context...',
  });

  const decision = await determineTurnActionWithModel(message, project, priorMessages);
  const action = decision.action || 'chat';

  const milestones = [];
  const updateMilestone = (id, label, status, detail = '') => {
    const existingIndex = milestones.findIndex((m) => m.id === id);
    const item = { id, label, status, detail, timestamp: new Date().toISOString() };
    if (existingIndex >= 0) {
      milestones[existingIndex] = item;
    } else {
      milestones.push(item);
    }
    sendEvent({
      type: 'milestone',
      milestone: item,
      milestones: [...milestones],
    });
  };

  // 3. Insert placeholder assistant message in SQLite
  const assistantMsgRecord = saveChatMessage({
    projectId,
    role: 'assistant',
    content: '',
    stage: action,
    status: 'running',
    milestones: [],
    artifacts: [],
  });

  let finalAssistantContent = '';
  let updatedArtifacts = [];
  let actionRequired = null;

  try {
    if (action === 'chat') {
      // -------------------------------------------------------------
      // CONVERSATIONAL Q&A: Model answers user naturally without stages!
      // -------------------------------------------------------------
      if (decision.chat_reply) {
        finalAssistantContent = decision.chat_reply;
      } else {
        const chatSystemPrompt = `You are AI UI STUDIO, an intelligent AI assistant and web UI architect.
The user is asking a conversational question or chatting with you.
Answer directly, concisely, and naturally based on the conversation history and project status.
DO NOT start any pipeline stages or generate HTML code unless requested.

Current Project Status:
- Project Title: "${project.title || 'Untitled'}"
- Project Prompt: "${project.prompt || 'None'}"
- Research Done: ${project.research ? 'Yes' : 'No'}
- Design Plan Done: ${project.design_plan ? 'Yes' : 'No'}
- HTML Code Done: ${project.html_code ? 'Yes' : 'No'}`;

        const chatHistory = priorMessages
          .slice(-6)
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n');

        let chatContextAddon = '';
        const chatUrlMatch = message.match(/https?:\/\/[^\s]+/i);
        if (chatUrlMatch) {
          try {
            sendEvent({ type: 'status', message: `Resolving link details for: ${chatUrlMatch[0]}...` });
            const scraped = await scrapeUrl(chatUrlMatch[0]);
            if (scraped && (scraped.businessName || scraped.content)) {
              chatContextAddon = `\n\nReal-time information extracted from link (${chatUrlMatch[0]}):\n- Title/Name: ${scraped.businessName || scraped.title}\n- Details: ${scraped.content}`;
            }
          } catch (_) {}
        }

        finalAssistantContent = await callModel(
          `Conversation History:\n${chatHistory}\n\nUser Question: "${message}"${chatContextAddon}\n\nPlease answer:`,
          process.env.BASE_URL,
          process.env.MODEL_NAME,
          chatSystemPrompt,
          {
            streamToConsole: true,
            onToken: (token) => {
              sendEvent({ type: 'token', text: token, stage: 'chat' });
            },
          }
        );
      }

      // If research has finished and design hasn't, remind user of approval button
      if (project.research && !project.design_plan) {
        actionRequired = {
          type: 'approve_research',
          label: 'Approve & Proceed to Design Plan',
          actionMessage: 'Proceed to Design Plan',
        };
      } else if (project.design_plan && !project.html_code) {
        actionRequired = {
          type: 'approve_design',
          label: 'Approve & Generate HTML5 Prototype',
          actionMessage: 'Generate Code Prototype',
        };
      }
    } else if (action === 'start_research') {
      // -------------------------------------------------------------
      // STAGE 1: DISCOVERY & MARKET RESEARCH (Then PAUSE for approval)
      // -------------------------------------------------------------
      updateMilestone('research', 'Discovery & Market Intelligence', 'active', 'Analyzing domain, target audience, and benchmarks...');

      // Check if message contains any URL / Map link and resolve it
      const urlMatch = message.match(/https?:\/\/[^\s]+/i);
      let enrichedResearchPrompt = `User Request:\n"${message}"\n\nPlease execute deep market & UX research, analyze target users, key product flows, and competitive benchmarks.`;

      if (urlMatch) {
        updateMilestone('research', 'Discovery & Market Intelligence', 'active', `Resolving link & extracting business data: ${urlMatch[0]}`);
        try {
          const scraped = await scrapeUrl(urlMatch[0]);
          if (scraped && scraped.businessName) {
            updateMilestone('research', 'Discovery & Market Intelligence', 'active', `Identified Business: "${scraped.businessName}". Analyzing market & reviews...`);
            enrichedResearchPrompt = `User Request:\n"${message}"\n\nVerified Target Business Data:\n- Business Name: ${scraped.businessName}\n- Details / Context: ${scraped.content}\n- Link: ${scraped.resolvedUrl}\n\nPlease execute deep market & UX research for "${scraped.businessName}", analyze target customers, menu/service offerings, visual branding, and competitors:`;
          } else if (scraped && scraped.content) {
            enrichedResearchPrompt = `User Request:\n"${message}"\n\nExtracted Web Page Content:\n${scraped.content.substring(0, 1500)}\n\nPlease execute deep market & UX research based on this:`;
          }
        } catch (scrapeErr) {
          console.warn('[Research Scrape Warning]:', scrapeErr.message);
        }
      }

      const researchSkill = loadSkill('research_user_prompt');

      const currentResearch = await runAgenticTurn(
        enrichedResearchPrompt,
        researchSkill,
        tools,
        {
          onToken: (token) => {
            sendEvent({ type: 'token', text: token, stage: 'research' });
          },
          onStatus: (st) => {
            if (st.type === 'tool') {
              updateMilestone('research', 'Discovery & Market Intelligence', 'active', `Browsing & searching: ${st.query || ''}`);
            }
          },
        }
      );

      addTokens(projectId, 'research', estimateTokens(message) + estimateTokens(currentResearch));
      saveProjectResearch(projectId, {
        prompt: message,
        research: currentResearch,
        tokens: estimateTokens(currentResearch),
        status: 'research_ready',
      });

      updateMilestone('research', 'Discovery & Market Intelligence', 'completed', 'Research dossier generated.');
      updatedArtifacts.push('research');

      sendEvent({
        type: 'artifact',
        artifact: {
          key: 'research',
          type: 'markdown',
          title: 'research.md',
          content: currentResearch,
        },
      });

      finalAssistantContent = `I have completed **Stage 1: Discovery & Market Research**!

I synthesized user personas, competitive benchmarks, and functional requirements into \`research.md\` (viewable on the right canvas).

Please review the research dossier. You can either approve to proceed to the **UI Design Plan**, or chat with me to adjust any requirements!`;

      actionRequired = {
        type: 'approve_research',
        label: 'Approve & Proceed to Design Plan',
        actionMessage: 'Proceed to Design Plan',
      };
    } else if (action === 'proceed_to_design') {
      // -------------------------------------------------------------
      // STAGE 2: UI ARCHITECTURE & DESIGN PLAN (Then PAUSE for approval)
      // -------------------------------------------------------------
      updateMilestone('design', 'UI Architecture & Design Plan', 'active', 'Synthesizing color palette, typography, layout, and component specs...');

      const designSkill = loadSkill('ui-design-plan');
      const designInput = `Original User Request:\n"${project.prompt || message}"\n\nApproved Research Dossier:\n${project.research}\n\nPlease generate a comprehensive Web UI Design Plan:`;

      const currentDesignPlan = await runAgenticTurn(designInput, designSkill, tools, {
        onToken: (token) => {
          sendEvent({ type: 'token', text: token, stage: 'design' });
        },
        onStatus: (st) => {
          updateMilestone('design', 'UI Architecture & Design Plan', 'active', st.message || 'Drafting design tokens...');
        },
      });

      addTokens(projectId, 'design', estimateTokens(designInput) + estimateTokens(currentDesignPlan));
      saveProjectDesignPlan(projectId, {
        prompt: project.prompt,
        research: project.research,
        designPlan: currentDesignPlan,
        tokens: estimateTokens(currentDesignPlan),
        status: 'design_ready',
      });

      updateMilestone('design', 'UI Architecture & Design Plan', 'completed', 'Design specifications & component architecture ready.');
      updatedArtifacts.push('design');

      sendEvent({
        type: 'artifact',
        artifact: {
          key: 'design',
          type: 'markdown',
          title: 'design-plan.md',
          content: currentDesignPlan,
        },
      });

      finalAssistantContent = `I have completed **Stage 2: UI Architecture & Design Plan**!

The design plan defines:
- 🎨 **Visual Architecture**: Color palette tokens, gradients, and shadows.
- 🔤 **Typography System**: Google Font pairings and scale hierarchy.
- 📐 **Page Section Blueprint**: Hero section, interactive widgets, features, and footer layout.

Please review the design specifications in \`design-plan.md\` on the right canvas. Once approved, I will compile the responsive HTML5 + Tailwind CSS prototype!`;

      actionRequired = {
        type: 'approve_design',
        label: 'Approve & Generate HTML5 Prototype',
        actionMessage: 'Generate Code Prototype',
      };
    } else if (action === 'proceed_to_code') {
      // -------------------------------------------------------------
      // STAGE 3: HTML5 & TAILWIND CODE GENERATION (Studio Prototype)
      // -------------------------------------------------------------
      updateMilestone('code', 'HTML5 & Tailwind CSS Engine', 'active', 'Generating clean, interactive prototype with responsive Tailwind CSS...');

      const codeSkill = loadSkill('ui-code-generator');
      const codeInput = `User Request:\n"${project.prompt || message}"\n\nAccepted Web UI Design Plan:\n${project.design_plan}\n\nPlease generate the complete, standalone HTML5 + Tailwind CSS + Google Fonts/Icons code implementation:`;

      const rawCodeOutput = await runAgenticTurn(codeInput, codeSkill, tools, {
        onToken: (token) => {
          sendEvent({ type: 'token', text: token, stage: 'code' });
          sendEvent({ type: 'code_token', text: token });
        },
        onStatus: (st) => {
          updateMilestone('code', 'HTML5 & Tailwind CSS Engine', 'active', st.message || 'Compiling responsive Tailwind layout...');
        },
      });

      const cleanHtml = extractHtml(rawCodeOutput);

      const outputFilePath = path.join(OUTPUT_DIR, `${projectId}.html`);
      fs.writeFileSync(outputFilePath, cleanHtml, 'utf8');
      fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), cleanHtml, 'utf8');

      addTokens(projectId, 'code', estimateTokens(codeInput) + estimateTokens(rawCodeOutput));
      saveProjectHtmlCode(projectId, {
        html: cleanHtml,
        tokens: estimateTokens(codeInput) + estimateTokens(rawCodeOutput),
        feedbackNote: 'Initial Prototype Build',
        status: 'completed',
      });

      updateMilestone('code', 'HTML5 & Tailwind CSS Engine', 'completed', 'Responsive interactive prototype ready.');
      updatedArtifacts.push('code');

      sendEvent({
        type: 'artifact',
        artifact: {
          key: 'code',
          type: 'html',
          title: 'index.html',
          content: cleanHtml,
          previewUrl: `/api/preview/${projectId}?t=${Date.now()}`,
        },
      });

      finalAssistantContent = `🎉 **Stage 3 Complete: Interactive Prototype Built!**

The live web application is rendered in the **Live Preview** tab on the right canvas.
- Fully responsive across desktop, tablet, and mobile.
- Clean Tailwind CSS styling and micro-interactions.
- Standalone HTML5 code ready for export.

You can test the prototype, toggle device views, or chat with me to request any changes (e.g. *"Add a pricing table"*, *"Change the hero headline"*).`;
    } else if (action === 'refine_research') {
      // -------------------------------------------------------------
      // REFINEMENT: RESEARCH DOSSIER
      // -------------------------------------------------------------
      updateMilestone('research_refine', 'Updating Market Research', 'active', 'Incorporating new research criteria...');

      const researchSkill = loadSkill('research_user_prompt');
      const updatePrompt = `Existing Research:\n${project.research}\n\nUser Iteration Request:\n"${message}"\n\nPlease update and enhance the research dossier accordingly:`;

      const updatedResearch = await runAgenticTurn(updatePrompt, researchSkill, tools, {
        onToken: (token) => {
          sendEvent({ type: 'token', text: token, stage: 'research_refine' });
        },
      });
      saveProjectResearch(projectId, {
        prompt: project.prompt,
        research: updatedResearch,
        tokens: estimateTokens(updatePrompt) + estimateTokens(updatedResearch),
        status: 'research_ready',
      });

      updateMilestone('research_refine', 'Updating Market Research', 'completed', 'Research dossier updated.');
      updatedArtifacts.push('research');

      sendEvent({
        type: 'artifact',
        artifact: {
          key: 'research',
          type: 'markdown',
          title: 'research.md',
          content: updatedResearch,
        },
      });

      finalAssistantContent = `I have updated \`research.md\` based on your notes. You can inspect the updated dossier on the right canvas.\n\nReady to proceed to the **UI Design Plan**?`;

      actionRequired = {
        type: 'approve_research',
        label: 'Approve & Proceed to Design Plan',
        actionMessage: 'Proceed to Design Plan',
      };
    } else if (action === 'refine_design') {
      // -------------------------------------------------------------
      // REFINEMENT: DESIGN PLAN
      // -------------------------------------------------------------
      updateMilestone('design_refine', 'Updating UI Design Plan', 'active', 'Adjusting design tokens and layout specifications...');

      const designSkill = loadSkill('ui-design-plan');
      const updatePrompt = `Current Design Plan:\n${project.design_plan}\n\nUser Modification Request:\n"${message}"\n\nPlease update the design plan specifications:`;

      const updatedDesign = await runAgenticTurn(updatePrompt, designSkill, tools, {
        onToken: (token) => {
          sendEvent({ type: 'token', text: token, stage: 'design_refine' });
        },
      });
      saveProjectDesignPlan(projectId, {
        prompt: project.prompt,
        research: project.research,
        designPlan: updatedDesign,
        tokens: estimateTokens(updatePrompt) + estimateTokens(updatedDesign),
        status: 'design_ready',
      });

      updateMilestone('design_refine', 'Updating UI Design Plan', 'completed', 'Design specifications updated.');
      updatedArtifacts.push('design');

      sendEvent({
        type: 'artifact',
        artifact: {
          key: 'design',
          type: 'markdown',
          title: 'design-plan.md',
          content: updatedDesign,
        },
      });

      finalAssistantContent = `I have updated the **Web UI Design Plan** (\`design-plan.md\`).\n\nWould you like me to generate or update the HTML prototype now?`;

      actionRequired = {
        type: 'approve_design',
        label: 'Approve & Generate HTML5 Prototype',
        actionMessage: 'Generate Code Prototype',
      };
    } else if (action === 'refine_code') {
      // -------------------------------------------------------------
      // CONTINUOUS CODE REFINEMENT
      // -------------------------------------------------------------
      updateMilestone('code_refine', 'Updating Web UI Code', 'active', 'Applying requested modifications to the layout...');

      const codeSkill = loadSkill('ui-code-generator');
      const refinePrompt = `You are maintaining and enhancing this existing HTML5 + Tailwind CSS web page.

Current HTML Code:
\`\`\`html
${project.html_code}
\`\`\`

User Request for Changes:
"${message}"

Instructions:
1. Apply the user requested changes cleanly to the existing code.
2. If adding a new section, integrate it smoothly into the DOM with harmonious Tailwind styling.
3. Keep all other sections and functionality intact.
4. Output the updated standalone HTML inside a \`\`\`html codeblock.`;

      const rawCodeOutput = await runAgenticTurn(refinePrompt, codeSkill, tools, {
        onToken: (token) => {
          sendEvent({ type: 'token', text: token, stage: 'code_refine' });
          sendEvent({ type: 'code_token', text: token });
        },
        onStatus: (st) => {
          updateMilestone('code_refine', 'Updating Web UI Code', 'active', st.message || 'Applying code modifications...');
        },
      });

      const updatedHtml = extractHtml(rawCodeOutput);

      const outputFilePath = path.join(OUTPUT_DIR, `${projectId}.html`);
      fs.writeFileSync(outputFilePath, updatedHtml, 'utf8');
      fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), updatedHtml, 'utf8');

      addTokens(projectId, 'code', estimateTokens(refinePrompt) + estimateTokens(rawCodeOutput));
      saveProjectHtmlCode(projectId, {
        html: updatedHtml,
        tokens: estimateTokens(refinePrompt) + estimateTokens(rawCodeOutput),
        feedbackNote: message,
        status: 'completed',
      });
      recordProjectFeedback(projectId, 'code', message, updatedHtml);

      updateMilestone('code_refine', 'Updating Web UI Code', 'completed', 'Changes applied and live preview refreshed.');
      updatedArtifacts.push('code');

      sendEvent({
        type: 'artifact',
        artifact: {
          key: 'code',
          type: 'html',
          title: 'index.html',
          content: updatedHtml,
          previewUrl: `/api/preview/${projectId}?t=${Date.now()}`,
        },
      });

      finalAssistantContent = `I have updated the web UI with your changes: **"${message}"**.\n\nThe live preview has refreshed on the right canvas. Let me know if you want any more tweaks!`;
    }

    // Stream final assistant narrative if not already streamed
    if (finalAssistantContent && action !== 'chat') {
      for (const char of finalAssistantContent) {
        sendEvent({ type: 'token', text: char });
      }
    } else if (finalAssistantContent && decision.chat_reply) {
      for (const char of finalAssistantContent) {
        sendEvent({ type: 'token', text: char });
      }
    }

    // Update message in SQLite
    updateChatMessage(assistantMsgRecord.id, {
      content: finalAssistantContent,
      status: 'completed',
      milestones,
      artifacts: updatedArtifacts,
    });

    sendEvent({
      type: 'done',
      messageId: assistantMsgRecord.id,
      milestones,
      artifacts: updatedArtifacts,
      actionRequired,
      usage: getSessionUsage(projectId),
    });
  } catch (error) {
    if (abortSignal?.aborted) {
      console.log(`[Chat] Session ${projectId} execution cancelled by user.`);
      updateChatMessage(assistantMsgRecord.id, {
        content: '🛑 Generation stopped by user.',
        status: 'stopped',
        milestones,
        artifacts: updatedArtifacts,
      });
      return;
    }

    console.error('Chat turn execution error:', error);
    updateMilestone('error', 'Execution Error', 'error', error.message);

    updateChatMessage(assistantMsgRecord.id, {
      content: `⚠️ An error occurred while executing this step: ${error.message}`,
      status: 'error',
      milestones,
      artifacts: updatedArtifacts,
    });

    sendEvent({
      type: 'error',
      error: error.message,
      milestones,
    });
  }
}
