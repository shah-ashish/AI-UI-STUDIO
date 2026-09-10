import React from 'react';
import { RotateCcw, FolderOpen } from 'lucide-react';
import Logo from '../Common/Logo';

export default function Header({ step, onReset, statusLabel, onOpenHistory }) {
  const handleResetClick = () => {
    if (confirm('Start a fresh project?')) {
      onReset();
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 px-6 py-3">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
        {/* Left: Logo + Title + Status badge */}
        <div className="flex items-center gap-3.5">
          <Logo size="sm" />
          <h1 className="font-extrabold text-lg tracking-tight text-slate-900">
            AI UI STUDIO
          </h1>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-mono tracking-widest">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {statusLabel || 'NEURAL WORKSPACE V4.2'}
          </div>
        </div>

        {/* Right Actions: Projects Drawer & New Project */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer shadow-sm"
            title="Browse saved projects from SQLite database"
          >
            <FolderOpen className="h-3.5 w-3.5 text-indigo-500" />
            <span>Projects</span>
          </button>

          {step > 1 && (
            <button
              onClick={handleResetClick}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer shadow-sm"
              title="Start a fresh project"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>New</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
