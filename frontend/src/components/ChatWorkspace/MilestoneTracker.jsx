import React, { useState } from 'react';

export default function MilestoneTracker({ milestones = [], isRunning = false }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!milestones || milestones.length === 0) return null;

  const completedCount = milestones.filter((m) => m.status === 'completed').length;
  const isAllComplete = completedCount === milestones.length && !isRunning;

  return (
    <div className="my-3 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all text-xs">
      {/* Tracker Header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          {isRunning ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
            </span>
          ) : isAllComplete ? (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
              ✓
            </span>
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          )}

          <span className="font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            Autonomous Pipeline Execution
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
              {completedCount}/{milestones.length}
            </span>
          </span>
        </div>

        <button className="text-slate-400 hover:text-slate-600 transition-colors p-0.5">
          <svg
            className={`w-3.5 h-3.5 transform transition-transform duration-200 ${collapsed ? '-rotate-90' : 'rotate-0'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Milestones Steps */}
      {!collapsed && (
        <div className="p-3 space-y-2 bg-slate-50/40">
          {milestones.map((m, idx) => {
            const isActive = m.status === 'active';
            const isDone = m.status === 'completed';
            const isErr = m.status === 'error';

            return (
              <div
                key={m.id || idx}
                className={`flex items-start gap-2.5 p-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-indigo-50/80 border border-indigo-200 shadow-xs'
                    : isDone
                    ? 'bg-emerald-50/50 border border-emerald-100'
                    : 'bg-white border border-slate-100 opacity-60'
                }`}
              >
                {/* Step Icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {isActive && (
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  )}
                  {isDone && (
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                      ✓
                    </div>
                  )}
                  {isErr && (
                    <div className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-[10px]">
                      ✕
                    </div>
                  )}
                  {!isActive && !isDone && !isErr && (
                    <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400">
                      {idx + 1}
                    </div>
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`font-semibold text-xs ${
                      isActive ? 'text-indigo-900' : isDone ? 'text-slate-800' : 'text-slate-500'
                    }`}>
                      {m.label}
                    </div>

                    <span className={`text-[10px] uppercase font-mono font-medium px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700 animate-pulse'
                        : isDone
                        ? 'text-emerald-700 font-semibold'
                        : 'text-slate-400'
                    }`}>
                      {isActive ? 'In Progress' : isDone ? 'Done' : 'Pending'}
                    </span>
                  </div>

                  {m.detail && (
                    <p className={`mt-0.5 text-[11px] leading-relaxed ${
                      isActive ? 'text-indigo-700/90 font-mono text-[10.5px]' : 'text-slate-500'
                    }`}>
                      {m.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
