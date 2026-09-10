import React from 'react';
import { STEPS } from '../../constants/prompts';

const STEP_DEFINITIONS = [
  { id: STEPS.PROMPT, label: 'Prompt' },
  { id: STEPS.RESEARCH_STREAM, label: 'Discovery' },
  { id: STEPS.RESEARCH_REVIEW, label: 'Verify Research' },
  { id: STEPS.DESIGN_STREAM, label: 'Design Plan' },
  { id: STEPS.DESIGN_REVIEW, label: 'Verify Design' },
  { id: STEPS.STUDIO, label: 'Live Studio' },
];

export default function StepTracker({ currentStep }) {
  return (
    <div className="bg-white/60 border-b border-slate-200/60 px-6 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between relative">
        {/* Connection line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px bg-slate-200 -z-0"></div>

        {STEP_DEFINITIONS.map((s, idx) => {
          const isPassed = currentStep >= s.id;
          const isCurrent = currentStep === s.id;

          return (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-1.5 bg-[#f0f2f5] px-2">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[11px] transition-all duration-300 border-2 ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20 scale-110'
                    : isPassed
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                {isPassed && !isCurrent ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isCurrent ? 'text-slate-900 font-semibold' : isPassed ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
