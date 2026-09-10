import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveTitleFromPrompt,
  saveProjectResearch,
  saveProjectDesignPlan,
  saveProjectHtmlCode,
  getProject,
  listProjects,
  saveChatMessage,
  updateChatMessage,
  getProjectMessages,
  deleteProject,
} from '../src/core/db.js';

describe('SQLite Database & Chat Persistence', () => {
  const testProjectId = 'test_proj_' + Date.now();

  it('should derive clean project titles from prompts', () => {
    assert.equal(
      deriveTitleFromPrompt('I want to build a modern SaaS landing page'),
      'Modern SaaS landing page'
    );
    assert.equal(
      deriveTitleFromPrompt('Create an e-commerce storefront for shoes'),
      'E-commerce storefront for shoes'
    );
    assert.equal(deriveTitleFromPrompt(''), 'Untitled Project');
  });

  it('should save and retrieve research dossier for a project', () => {
    saveProjectResearch(testProjectId, {
      prompt: 'Build a coffee shop website',
      research: '### Target Audience\nCoffee lovers and remote workers.',
      tokens: 450,
    });

    const project = getProject(testProjectId);
    assert.ok(project);
    assert.equal(project.id, testProjectId);
    assert.equal(project.prompt, 'Build a coffee shop website');
    assert.match(project.research, /Target Audience/);
    assert.equal(project.research_tokens, 450);
  });

  it('should save design plan and accumulate tokens', () => {
    saveProjectDesignPlan(testProjectId, {
      designPlan: '### Color Palette\n- Primary: #4B2E1E\n- Background: #FFF8F0',
      tokens: 350,
    });

    const project = getProject(testProjectId);
    assert.match(project.design_plan, /Color Palette/);
    assert.equal(project.design_tokens, 350);
    assert.equal(project.total_tokens, 800);
  });

  it('should save HTML code and version history', () => {
    const htmlSnippet = '<!DOCTYPE html><html><body><h1>Coffee Roasters</h1></body></html>';
    saveProjectHtmlCode(testProjectId, {
      html: htmlSnippet,
      tokens: 1200,
      feedbackNote: 'V1 Initial Generation',
      status: 'completed',
    });

    const project = getProject(testProjectId);
    assert.equal(project.html_code, htmlSnippet);
    assert.equal(project.code_tokens, 1200);
    assert.equal(project.total_tokens, 2000);
  });

  it('should persist chat messages and handle milestone updates', () => {
    // 1. User message
    const userMsg = saveChatMessage({
      projectId: testProjectId,
      role: 'user',
      content: 'Make the hero heading bolder',
      stage: 'input',
      status: 'completed',
    });
    assert.ok(userMsg.id);
    assert.equal(userMsg.role, 'user');

    // 2. Assistant streaming message
    const assistantMsg = saveChatMessage({
      projectId: testProjectId,
      role: 'assistant',
      content: '',
      stage: 'refine_code',
      status: 'running',
      milestones: [{ id: 'm1', label: 'Modifying hero section', status: 'running' }],
    });

    // 3. Update assistant message with tokens & completion
    const updated = updateChatMessage(assistantMsg.id, {
      content: 'Updated heading with font-extrabold styling.',
      status: 'completed',
      milestones: [{ id: 'm1', label: 'Modifying hero section', status: 'completed' }],
    });

    assert.equal(updated.content, 'Updated heading with font-extrabold styling.');
    assert.equal(updated.pipeline_status, 'completed');

    // 4. Retrieve message history
    const history = getProjectMessages(testProjectId);
    assert.ok(history.length >= 2);
    assert.equal(history[history.length - 1].content, 'Updated heading with font-extrabold styling.');
  });

  it('should list projects including the created test project', () => {
    const projects = listProjects();
    assert.ok(Array.isArray(projects));
    const found = projects.find((p) => p.id === testProjectId);
    assert.ok(found);
    assert.equal(found.has_code, 1);
  });

  it('should delete project and cascading records cleanly', () => {
    deleteProject(testProjectId);
    const deleted = getProject(testProjectId);
    assert.equal(deleted, null);

    const remainingMessages = getProjectMessages(testProjectId);
    assert.equal(remainingMessages.length, 0);
  });
});
