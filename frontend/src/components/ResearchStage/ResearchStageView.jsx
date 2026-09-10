import React, { useState, useMemo } from 'react';
import { Zap, CheckCircle2, Loader2, Clock, Globe, ArrowRight } from 'lucide-react';
import { STEPS } from '../../constants/prompts';
import StreamOutputCard from '../Common/StreamOutputCard';
import ResearchReviewBar from './ResearchReviewBar';

/**
 * Research stage matching screen.png reference:
 * - Top prompt bar showing current prompt + run ID
 * - Left panel: Activity log with step-by-step progress
 * - Right panel: Live streaming markdown output
 * - Bottom: Stats bar (throughput, tokens)
 */
export default function ResearchStageView({
  step,
  research,
  streaming,
  statusMessage,
  streamEndRef,
  onProceed,
  onRefine,
  prompt,
  sessionId,
}) {
  // Parse activity steps dynamically from model's research stream
  const activitySteps = useMemo(() => {
    const defaultInitialSteps = [
      { label: 'Analyzing user prompt & intent', done: true, detail: 'Extracted entities & keywords' },
      { label: 'Searching live web sources', done: !!research, detail: 'Indexed web results & patterns' },
    ];

    // Extract dynamic headings from the research stream
    const rawHeadings = research
      ? [...research.matchAll(/^##\s+([^\n\r]+)/gm)].map((m) => m[1].trim())
      : [];

    if (rawHeadings.length === 0) {
      defaultInitialSteps.push({
        label: 'Synthesizing research dossier',
        done: step >= STEPS.RESEARCH_REVIEW,
        detail: streaming ? (statusMessage || 'Compiling findings...') : 'Research compiled & ready',
      });
      return defaultInitialSteps;
    }

    const dynamicSteps = rawHeadings.map((heading, idx) => {
      const cleanLabel = heading
        .replace(/^[0-9]+[\.\)]\s*/, '')
        .replace(/^[\p{Emoji}\p{Symbol}\p{Punctuation}\s]+/u, '')
        .trim() || heading;

      const isLast = idx === rawHeadings.length - 1;
      const done = !isLast || step >= STEPS.RESEARCH_REVIEW || !streaming;

      return {
        label: cleanLabel,
        done,
        detail: done ? 'Synthesized' : (statusMessage || 'Synthesizing...'),
      };
    });

    return [...defaultInitialSteps, ...dynamicSteps];
  }, [research, streaming, statusMessage, step]);

  // Estimate token count from content length
  const tokenEstimate = useMemo(() => {
    if (!research) return 0;
    return Math.round(research.length / 4);
  }, [research]);

  return (
    <div className="flex-1 flex flex-col gap-4 w-full animate-fade-in-up min-h-0 overflow-hidden">
      {/* Prompt Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded uppercase tracking-wider">
            Prompt
          </span>
          <span className="text-sm text-slate-700 font-medium truncate max-w-xl">{prompt}</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 tracking-wider">
          RUN-ID #{sessionId?.slice(-4)?.toUpperCase() || '0000'}
        </span>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Panel: Activity Log */}
        <div className="w-80 shrink-0 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          {/* Panel Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Research & Reasoning Log</span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              streaming
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-slate-50 text-slate-500 border border-slate-200'
            }`}>
              {streaming ? 'Active' : 'Complete'}
            </span>
          </div>

          {/* Activity Steps */}
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
            <div className="space-y-5">
              {activitySteps.map((item, idx) => {
                const isActive = !item.done && streaming;
                return (
                  <div key={idx} className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className="mt-0.5 shrink-0">
                      {item.done ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : isActive ? (
                        <div className="h-5 w-5 rounded-full bg-indigo-100 border-2 border-indigo-400 flex items-center justify-center">
                          <Loader2 className="h-3 w-3 text-indigo-500 animate-spin" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-slate-200 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-slate-400">{idx + 1}</span>
                        </div>
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${
                        item.done ? 'text-slate-800' : isActive ? 'text-indigo-700' : 'text-slate-400'
                      }`}>
                        {isActive ? `${item.label}...` : item.label}
                      </p>
                      <p className={`text-[11px] mt-0.5 font-mono ${
                        item.done ? 'text-slate-400' : isActive ? 'text-indigo-400' : 'text-slate-300'
                      }`}>
                        {item.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="border-t border-slate-100 px-5 py-3 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Status</div>
              <div className="text-xs font-semibold text-slate-700 mt-0.5">
                {streaming ? 'Streaming...' : 'Ready'}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Tokens</div>
              <div className="text-xs font-semibold text-indigo-600 mt-0.5 font-mono">
                {tokenEstimate.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Streaming Output + Actions */}
        <div className="flex-1 flex flex-col gap-3 min-h-0 min-w-0">
          {/* Approve Button (when in review) */}
          {!streaming && step === STEPS.RESEARCH_REVIEW && (
            <div className="flex items-center justify-end">
              <button
                onClick={onProceed}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer hover:shadow-lg"
              >
                <span>Approve & Proceed to Design Plan</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Streaming Status */}
          {streaming && (
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-xs shadow-sm">
              <Globe className="h-4 w-4 text-indigo-500 animate-spin" />
              <span className="font-medium font-mono text-[11px] text-slate-600 tracking-wide">
                {statusMessage || 'Streaming research tokens in real-time...'}
              </span>
            </div>
          )}

          {/* Streaming Content */}
          <StreamOutputCard
            title="Discovery & Market Research"
            content={research}
            streaming={streaming}
            placeholder="Waiting for research tokens to arrive from model..."
            scrollRef={streamEndRef}
          />

          {/* Feedback Bar */}
          {!streaming && step === STEPS.RESEARCH_REVIEW && (
            <ResearchReviewBar onRefine={onRefine} streaming={streaming} />
          )}
        </div>
      </div>
    </div>
  );
}
