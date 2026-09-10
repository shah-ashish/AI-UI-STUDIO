import React from 'react';
import Logo from '../Common/Logo';
import MarkdownRenderer from '../Common/MarkdownRenderer';
import MilestoneTracker from './MilestoneTracker';

export default function ChatBubble({
  message,
  onOpenArtifact,
  isStreamingAssistant = false,
}) {
  const isUser = message.role === 'user';
  const milestones = message.milestones || [];
  const artifacts = message.artifacts || [];

  if (isUser) {
    return (
      <div className="flex justify-end my-3">
        <div className="max-w-[82%] sm:max-w-[70%] flex items-start gap-2.5 flex-row-reverse">
          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm">
            U
          </div>
          <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 text-xs sm:text-[13px] leading-relaxed shadow-sm font-medium whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start my-4">
      <div className="max-w-[92%] sm:max-w-[85%] flex items-start gap-3 w-full">
        {/* Assistant Avatar */}
        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-xs p-1">
          <Logo size="sm" />
        </div>

        {/* Content Box */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4 text-slate-800 text-xs sm:text-[13px] leading-relaxed shadow-sm">
          {/* Background Pipeline Milestones */}
          {milestones.length > 0 && (
            <MilestoneTracker milestones={milestones} isRunning={message.pipeline_status === 'running'} />
          )}

          {/* Assistant Text */}
          {message.content ? (
            <div className="mt-2 text-slate-800 markdown-rich">
              <MarkdownRenderer content={message.content} />
              {isStreamingAssistant && (
                <span className="inline-block w-1.5 h-3.5 bg-indigo-600 animate-pulse ml-1 align-baseline rounded-xs" />
              )}
            </div>
          ) : isStreamingAssistant ? (
            <div className="flex items-center gap-2 text-indigo-600 py-1 font-mono text-xs">
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              <span>Synthesizing response & orchestrating pipeline...</span>
            </div>
          ) : (
            <div className="text-slate-400 italic text-xs flex items-center gap-2 py-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <span>Generation was interrupted or stopped before completion.</span>
            </div>
          )}

          {/* Artifact Buttons */}
          {artifacts && artifacts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Artifacts:
              </span>

              {artifacts.includes('code') && (
                <button
                  onClick={() => onOpenArtifact('preview')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors text-xs font-semibold cursor-pointer shadow-xs"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>🌐 Live Preview</span>
                </button>
              )}

              {artifacts.includes('code') && (
                <button
                  onClick={() => onOpenArtifact('code')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors text-xs font-medium cursor-pointer"
                >
                  <span>💻 index.html</span>
                </button>
              )}

              {artifacts.includes('design') && (
                <button
                  onClick={() => onOpenArtifact('design')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors text-xs font-medium cursor-pointer"
                >
                  <span>🎨 design-plan.md</span>
                </button>
              )}

              {artifacts.includes('research') && (
                <button
                  onClick={() => onOpenArtifact('research')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors text-xs font-medium cursor-pointer"
                >
                  <span>🔍 research.md</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
