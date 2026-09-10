import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'ai_ui_studio.db');
const db = new Database(DB_PATH);

// Enable WAL mode for high concurrency and fast performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      status TEXT DEFAULT 'created',
      research TEXT,
      design_plan TEXT,
      html_code TEXT,
      research_tokens INTEGER DEFAULT 0,
      design_tokens INTEGER DEFAULT 0,
      code_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS project_feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      feedback TEXT NOT NULL,
      output_snapshot TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_code_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      html_code TEXT NOT NULL,
      feedback_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      pipeline_stage TEXT,
      pipeline_status TEXT DEFAULT 'completed',
      milestones TEXT,
      artifacts TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_feedbacks_project_id ON project_feedbacks(project_id);
    CREATE INDEX IF NOT EXISTS idx_code_versions_project_id ON project_code_versions(project_id);
    CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id, created_at ASC);
  `);

  console.log(`🗄️  [Database] SQLite initialized at: ${DB_PATH}`);
}

// Generate a clean human-readable title from prompt
export function deriveTitleFromPrompt(prompt) {
  if (!prompt) return 'Untitled Project';
  const clean = prompt.replace(/^(I want to build|create|design|build|make)\s+(a|an)?\s*/i, '').trim();
  const title = clean.charAt(0).toUpperCase() + clean.slice(1);
  return title.length > 50 ? title.substring(0, 47) + '...' : title;
}

// List all projects sorted by most recent
export function listProjects() {
  const stmt = db.prepare(`
    SELECT 
      id, 
      title, 
      prompt, 
      status, 
      research_tokens, 
      design_tokens, 
      code_tokens, 
      total_tokens, 
      (html_code IS NOT NULL AND LENGTH(html_code) > 0) AS has_code,
      (design_plan IS NOT NULL AND LENGTH(design_plan) > 0) AS has_design,
      created_at, 
      updated_at
    FROM projects 
    ORDER BY updated_at DESC
  `);
  return stmt.all();
}

// Get full project record
export function getProject(id) {
  const stmt = db.prepare(`SELECT * FROM projects WHERE id = ?`);
  const project = stmt.get(id);
  if (!project) return null;

  const feedbacksStmt = db.prepare(`
    SELECT id, stage, feedback, created_at 
    FROM project_feedbacks 
    WHERE project_id = ? 
    ORDER BY created_at ASC
  `);
  project.feedbacks = feedbacksStmt.all(id);

  const versionsStmt = db.prepare(`
    SELECT id, version_number, feedback_note, created_at 
    FROM project_code_versions 
    WHERE project_id = ? 
    ORDER BY version_number ASC
  `);
  project.versions = versionsStmt.all(id);

  const messagesStmt = db.prepare(`
    SELECT id, project_id, role, content, pipeline_stage, pipeline_status, milestones, artifacts, created_at
    FROM messages
    WHERE project_id = ?
    ORDER BY created_at ASC, id ASC
  `);
  project.messages = messagesStmt.all(id).map((msg) => ({
    ...msg,
    milestones: msg.milestones ? JSON.parse(msg.milestones) : [],
    artifacts: msg.artifacts ? JSON.parse(msg.artifacts) : [],
  }));

  return project;
}

// Save a chat message
export function saveChatMessage({
  projectId,
  role,
  content,
  stage = null,
  status = 'completed',
  milestones = [],
  artifacts = [],
}) {
  // Ensure project row exists in projects table to satisfy foreign key constraint
  const checkStmt = db.prepare(`SELECT id FROM projects WHERE id = ?`);
  const projectExists = checkStmt.get(projectId);
  if (!projectExists) {
    const title = deriveTitleFromPrompt(content || 'New UI Project');
    const insertProjStmt = db.prepare(`
      INSERT INTO projects (id, title, prompt, status, updated_at)
      VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)
    `);
    insertProjStmt.run(projectId, title, content || '');
  }

  const stmt = db.prepare(`
    INSERT INTO messages (project_id, role, content, pipeline_stage, pipeline_status, milestones, artifacts)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    projectId,
    role,
    content,
    stage,
    status,
    JSON.stringify(milestones || []),
    JSON.stringify(artifacts || [])
  );

  return {
    id: info.lastInsertRowid,
    projectId,
    role,
    content,
    pipeline_stage: stage,
    pipeline_status: status,
    milestones: milestones || [],
    artifacts: artifacts || [],
    created_at: new Date().toISOString(),
  };
}

// Update an existing chat message (e.g. streaming progress, completion)
export function updateChatMessage(messageId, { content, status, milestones, artifacts }) {
  const currentStmt = db.prepare(`SELECT * FROM messages WHERE id = ?`);
  const current = currentStmt.get(messageId);
  if (!current) return null;

  const newContent = content !== undefined ? content : current.content;
  const newStatus = status !== undefined ? status : current.pipeline_status;
  const newMilestones = milestones !== undefined ? JSON.stringify(milestones) : current.milestones;
  const newArtifacts = artifacts !== undefined ? JSON.stringify(artifacts) : current.artifacts;

  const stmt = db.prepare(`
    UPDATE messages
    SET content = ?, pipeline_status = ?, milestones = ?, artifacts = ?
    WHERE id = ?
  `);
  stmt.run(newContent, newStatus, newMilestones, newArtifacts, messageId);

  return {
    ...current,
    content: newContent,
    pipeline_status: newStatus,
    milestones: JSON.parse(newMilestones || '[]'),
    artifacts: JSON.parse(newArtifacts || '[]'),
  };
}

// Retrieve all messages for a project
export function getProjectMessages(projectId) {
  const stmt = db.prepare(`
    SELECT id, project_id, role, content, pipeline_stage, pipeline_status, milestones, artifacts, created_at
    FROM messages
    WHERE project_id = ?
    ORDER BY created_at ASC, id ASC
  `);

  return stmt.all(projectId).map((msg) => ({
    ...msg,
    milestones: msg.milestones ? JSON.parse(msg.milestones) : [],
    artifacts: msg.artifacts ? JSON.parse(msg.artifacts) : [],
  }));
}


// Upsert base project info (called at research start / completion)
export function saveProjectResearch(id, { prompt = '', research = '', tokens = 0, status = 'research_ready' }) {
  const title = deriveTitleFromPrompt(prompt);
  const stmt = db.prepare(`
    INSERT INTO projects (id, title, prompt, status, research, research_tokens, total_tokens, updated_at)
    VALUES (@id, @title, @prompt, @status, @research, @tokens, @tokens, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      title = CASE WHEN LENGTH(COALESCE(excluded.title, '')) > 0 THEN excluded.title ELSE projects.title END,
      prompt = CASE WHEN LENGTH(COALESCE(excluded.prompt, '')) > 0 THEN excluded.prompt ELSE projects.prompt END,
      status = excluded.status,
      research = CASE WHEN LENGTH(COALESCE(excluded.research, '')) > 0 THEN excluded.research ELSE projects.research END,
      research_tokens = CASE WHEN excluded.research_tokens > 0 THEN excluded.research_tokens ELSE projects.research_tokens END,
      total_tokens = (CASE WHEN excluded.research_tokens > 0 THEN excluded.research_tokens ELSE projects.research_tokens END) + projects.design_tokens + projects.code_tokens,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run({ id, title, prompt, status, research, tokens });
}

// Save design plan (safely upserts if project doesn't exist yet)
export function saveProjectDesignPlan(id, { prompt = '', research = '', designPlan = '', tokens = 0, status = 'design_ready' }) {
  const title = deriveTitleFromPrompt(prompt);
  const stmt = db.prepare(`
    INSERT INTO projects (id, title, prompt, status, research, design_plan, design_tokens, total_tokens, updated_at)
    VALUES (@id, @title, @prompt, @status, @research, @designPlan, @tokens, @tokens, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      design_plan = CASE WHEN LENGTH(COALESCE(excluded.design_plan, '')) > 0 THEN excluded.design_plan ELSE projects.design_plan END,
      design_tokens = CASE WHEN excluded.design_tokens > 0 THEN excluded.design_tokens ELSE projects.design_tokens END,
      total_tokens = projects.research_tokens + (CASE WHEN excluded.design_tokens > 0 THEN excluded.design_tokens ELSE projects.design_tokens END) + projects.code_tokens,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run({ id, title, prompt, status, research, designPlan, tokens });
}

// Save HTML5 generated code + version history
export function saveProjectHtmlCode(id, { html = '', tokens = 0, feedbackNote = 'Initial generation', status = 'completed' }) {
  // 1. Update project row
  const stmt = db.prepare(`
    UPDATE projects SET
      html_code = @html,
      status = @status,
      code_tokens = code_tokens + @tokens,
      total_tokens = research_tokens + design_tokens + code_tokens + @tokens,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);
  const info = stmt.run({ id, html, status, tokens });

  if (info.changes > 0) {
    // 2. Determine next version number
    const versionStmt = db.prepare(`SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM project_code_versions WHERE project_id = ?`);
    const { next_version } = versionStmt.get(id);

    // 3. Insert into version history
    const insertVersionStmt = db.prepare(`
      INSERT INTO project_code_versions (project_id, version_number, html_code, feedback_note)
      VALUES (?, ?, ?, ?)
    `);
    insertVersionStmt.run(id, next_version, html, feedbackNote);
  }
}

// Full sync for client state
export function syncProjectState(id, { prompt = '', research = '', designPlan = '', htmlCode = '', status = 'draft', researchTokens = 0, designTokens = 0, codeTokens = 0 }) {
  const title = deriveTitleFromPrompt(prompt);
  const stmt = db.prepare(`
    INSERT INTO projects (id, title, prompt, status, research, design_plan, html_code, research_tokens, design_tokens, code_tokens, total_tokens, updated_at)
    VALUES (@id, @title, @prompt, @status, @research, @designPlan, @htmlCode, @researchTokens, @designTokens, @codeTokens, @totalTokens, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      title = CASE WHEN LENGTH(COALESCE(excluded.title, '')) > 0 THEN excluded.title ELSE projects.title END,
      prompt = CASE WHEN LENGTH(COALESCE(excluded.prompt, '')) > 0 THEN excluded.prompt ELSE projects.prompt END,
      status = excluded.status,
      research = CASE WHEN LENGTH(COALESCE(excluded.research, '')) > 0 THEN excluded.research ELSE projects.research END,
      design_plan = CASE WHEN LENGTH(COALESCE(excluded.design_plan, '')) > 0 THEN excluded.design_plan ELSE projects.design_plan END,
      html_code = CASE WHEN LENGTH(COALESCE(excluded.html_code, '')) > 0 THEN excluded.html_code ELSE projects.html_code END,
      research_tokens = CASE WHEN excluded.research_tokens > 0 THEN excluded.research_tokens ELSE projects.research_tokens END,
      design_tokens = CASE WHEN excluded.design_tokens > 0 THEN excluded.design_tokens ELSE projects.design_tokens END,
      code_tokens = CASE WHEN excluded.code_tokens > 0 THEN excluded.code_tokens ELSE projects.code_tokens END,
      total_tokens = projects.research_tokens + projects.design_tokens + projects.code_tokens,
      updated_at = CURRENT_TIMESTAMP
  `);

  const totalTokens = researchTokens + designTokens + codeTokens;
  stmt.run({ id, title, prompt, status, research, designPlan, htmlCode, researchTokens, designTokens, codeTokens, totalTokens });
}

// Log user feedback
export function recordProjectFeedback(projectId, stage, feedback, outputSnapshot = '') {
  const stmt = db.prepare(`
    INSERT INTO project_feedbacks (project_id, stage, feedback, output_snapshot)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(projectId, stage, feedback, outputSnapshot);
}

// Delete project and all associated cascading records
export function deleteProject(id) {
  const stmt = db.prepare(`DELETE FROM projects WHERE id = ?`);
  return stmt.run(id);
}

// Initialize on load
initDatabase();

export default db;
