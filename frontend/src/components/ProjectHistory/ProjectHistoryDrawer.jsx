import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Trash2,
  ExternalLink,
  Search,
  FolderOpen,
  Code,
  FileText,
  Palette,
  CheckCircle2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { fetchProjects, fetchProjectById, deleteProjectApi } from '../../api/studioApi';

export default function ProjectHistoryDrawer({ isOpen, onClose, onLoadProject, onNewProject, currentProjectId }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const loadProjectList = async () => {
    setLoading(true);
    const data = await fetchProjects();
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadProjectList();
    }
  }, [isOpen]);

  const handleSelectProject = async (id) => {
    const fullProject = await fetchProjectById(id);
    if (fullProject) {
      onLoadProject(fullProject);
      onClose();
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;
    setDeletingId(id);
    const success = await deleteProjectApi(id);
    if (success) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
    setDeletingId(null);
  };

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.prompt && p.prompt.toLowerCase().includes(q)) ||
      (p.id && p.id.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-start animate-fade-in-up">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Body */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-r border-slate-200">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Saved Projects</h3>
              <p className="text-[11px] font-mono text-slate-400">SQLite Local Database</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={loadProjectList}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Refresh project list"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Close drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-2 shrink-0">
          <div className="flex-1 relative flex items-center">
            <Search className="h-3.5 w-3.5 absolute left-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past prompts..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-300 focus:bg-white transition"
            />
          </div>

          <button
            onClick={() => {
              onNewProject();
              onClose();
            }}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition cursor-pointer shrink-0"
            title="Start new project"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {loading && projects.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-400" />
              <span>Loading projects from database...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">No projects found</p>
              <p className="text-[11px] mt-1 text-slate-400">
                {searchQuery ? 'Try a different search term' : 'Generate your first UI to save it here'}
              </p>
            </div>
          ) : (
            filteredProjects.map((proj) => {
              const isCurrent = proj.id === currentProjectId;
              const dateFormatted = new Date(proj.updated_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={proj.id}
                  onClick={() => handleSelectProject(proj.id)}
                  className={`group p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                    isCurrent
                      ? 'bg-indigo-50/50 border-indigo-300 shadow-sm'
                      : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {proj.title}
                    </h4>

                    {isCurrent && (
                      <span className="text-[9px] font-mono font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded shrink-0">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {proj.prompt}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{dateFormatted}</span>
                      </span>

                      {proj.has_code ? (
                        <span className="flex items-center gap-0.5 text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                          <Code className="h-2.5 w-2.5" />
                          Code Ready
                        </span>
                      ) : (
                        <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          Draft
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span>{(proj.total_tokens || 0).toLocaleString()} tok</span>
                      <button
                        onClick={(e) => handleDelete(e, proj.id)}
                        disabled={deletingId === proj.id}
                        className="text-slate-400 hover:text-rose-500 p-1 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="Delete project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400 font-mono flex items-center justify-between shrink-0">
          <span>{projects.length} saved project{projects.length === 1 ? '' : 's'}</span>
          <span>SQLite Auto-Save</span>
        </div>
      </div>
    </div>
  );
}
