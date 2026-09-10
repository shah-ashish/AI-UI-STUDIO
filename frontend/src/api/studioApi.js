import { API_BASE } from '../constants/prompts';

export async function fetchSessionUsage(sessionId) {
  try {
    const res = await fetch(`${API_BASE}/session/${sessionId}/usage`);
    if (res.ok) {
      const data = await res.json();
      return data.usage || null;
    }
  } catch (err) {
    console.warn('Failed to fetch session usage:', err.message);
  }
  return null;
}

export async function resetSessionOnServer(sessionId) {
  try {
    const res = await fetch(`${API_BASE}/session/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.usage || null;
    }
  } catch (err) {
    console.warn('Failed to reset session:', err.message);
  }
  return null;
}

export function getPreviewUrl(sessionId, previewKey = 0) {
  return `${API_BASE}/preview/${sessionId}?t=${previewKey}`;
}

// -------------------------------------------------------------
// SQLite Projects API
// -------------------------------------------------------------
export async function fetchProjects() {
  try {
    const res = await fetch(`${API_BASE}/projects`);
    if (res.ok) {
      const data = await res.json();
      return data.projects || [];
    }
  } catch (err) {
    console.warn('Failed to fetch projects list:', err.message);
  }
  return [];
}

export async function fetchProjectById(id) {
  try {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    if (res.ok) {
      const data = await res.json();
      return data.project || null;
    }
  } catch (err) {
    console.warn(`Failed to fetch project ${id}:`, err.message);
  }
  return null;
}

export async function deleteProjectApi(id) {
  try {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const data = await res.json();
      return data.success || false;
    }
  } catch (err) {
    console.warn(`Failed to delete project ${id}:`, err.message);
  }
  return false;
}
