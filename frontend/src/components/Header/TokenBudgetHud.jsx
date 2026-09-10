import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function TokenBudgetHud({ usage, step, onReset }) {
  const handleResetClick = () => {
    if (confirm('Start a fresh project and reset token limits?')) {
      onReset();
    }
  };

  return (
    <div className="flex items-center gap-5 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs shadow-sm">
      {/* Research Limit */}
      <div className="flex flex-col gap-1 min-w-32">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400 font-medium font-mono uppercase tracking-wider">Research</span>
          <span className={`font-semibold font-mono ${usage.research?.percentage > 85 ? 'text-rose-500' : 'text-slate-600'}`}>
            {(usage.research?.used || 0).toLocaleString()} / 10k
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              usage.research?.percentage > 85 ? 'bg-rose-400' : 'bg-indigo-400'
            }`}
            style={{ width: `${Math.min(100, usage.research?.percentage || 0)}%` }}
          ></div>
        </div>
      </div>

      <div className="h-6 w-px bg-slate-200"></div>

      {/* Design Limit */}
      <div className="flex flex-col gap-1 min-w-32">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400 font-medium font-mono uppercase tracking-wider">Design</span>
          <span className={`font-semibold font-mono ${usage.design?.percentage > 85 ? 'text-rose-500' : 'text-slate-600'}`}>
            {(usage.design?.used || 0).toLocaleString()} / 10k
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              usage.design?.percentage > 85 ? 'bg-rose-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${Math.min(100, usage.design?.percentage || 0)}%` }}
          ></div>
        </div>
      </div>

      {step > 1 && (
        <button
          onClick={handleResetClick}
          className="ml-1 text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          title="Reset session & start new project"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
