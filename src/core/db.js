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

    CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_feedbacks_project_id ON project_feedbacks(project_id);
    CREATE INDEX IF NOT EXISTS idx_code_versions_project_id ON project_code_versions(project_id);
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

  return project;
}

// Upsert base project info (called at research start)
export function saveProjectResearch(id, { prompt, research, tokens = 0, status = 'research_ready' }) {
  const title = deriveTitleFromPrompt(prompt);
  const stmt = db.prepare(`
    INSERT INTO projects (id, title, prompt, status, research, research_tokens, total_tokens, updated_at)
    VALUES (@id, @title, @prompt, @status, @research, @tokens, @tokens, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      title = COALESCE(excluded.title, projects.title),
      prompt = COALESCE(excluded.prompt, projects.prompt),
      status = excluded.status,
      research = excluded.research,
      research_tokens = excluded.research_tokens,
      total_tokens = excluded.research_tokens + projects.design_tokens + projects.code_tokens,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run({ id, title, prompt, status, research, tokens });
}

// Save design plan
export function saveProjectDesignPlan(id, { designPlan, tokens = 0, status = 'design_ready' }) {
  const stmt = db.prepare(`
    UPDATE projects SET
      design_plan = @designPlan,
      status = @status,
      design_tokens = @tokens,
      total_tokens = research_tokens + @tokens + code_tokens,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);

  stmt.run({ id, designPlan, tokens, status });
}

// Save HTML5 generated code + version history
export function saveProjectHtmlCode(id, { html, tokens = 0, feedbackNote = 'Initial generation', status = 'completed' }) {
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
  stmt.run({ id, html, status, tokens });

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
