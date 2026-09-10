import React from 'react';
import Logo from '../Common/Logo';

export default function Sidebar({
  projects = [],
  currentSessionId,
  onSelectProject,
  onNewChat,
  onDeleteProject,
}) {
  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 select-none shadow-sm z-20">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2.5">
          <Logo size="sm" />
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              AI UI STUDIO
              <span className="text-[10px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Chat
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Neural Web Builder</p>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm hover:shadow transition-all active:scale-[0.98] cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Projects / Chats List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 min-h-0 custom-scrollbar">
        <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          Saved Projects ({projects.length})
        </div>

        {projects.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-slate-400">
            No saved projects yet. Start a new chat!
          </div>
        ) : (
          projects.map((proj) => {
            const isActive = proj.id === currentSessionId;
            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    proj.has_code ? 'bg-emerald-500' : proj.has_design ? 'bg-amber-500' : 'bg-slate-300'
                  }`} />
                  <span className="truncate" title={proj.title}>
                    {proj.title || 'Untitled Project'}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => onDeleteProject(proj.id, e)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200/60 transition-colors"
                    title="Delete project"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Model Status Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/80 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-[10px] text-slate-600 font-medium">qwen3.8:27b</span>
        </div>
        <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">SQLite Ready</span>
      </div>
    </aside>
  );
}
