import React, { useState } from 'react';
import MarkdownRenderer from '../Common/MarkdownRenderer';

export default function ArtifactViewer({
  isOpen = false,
  onClose,
  activeTab = 'preview',
  onSelectTab,
  artifacts = {},
  previewKey = 0,
  onRefreshPreview,
  sessionId,
}) {
  const [viewport, setViewport] = useState('desktop'); // desktop | tablet | mobile
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const { research = '', designPlan = '', htmlCode = '', previewUrl = '' } = artifacts;

  const handleCopyCode = () => {
    if (!htmlCode) return;
    navigator.clipboard.writeText(htmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportHtml = () => {
    if (!htmlCode) return;
    const blob = new Blob([htmlCode], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sessionId || 'webpage'}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="w-full lg:w-[50%] xl:w-[52%] border-l border-slate-200 bg-white flex flex-col h-full flex-shrink-0 min-w-0 z-20 shadow-xl transition-all">
      {/* Top Bar with Tabs and Controls */}
      <div className="h-14 px-4 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0 gap-2">
        {/* Artifact Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => onSelectTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${htmlCode ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span>Live Preview</span>
          </button>

          <button
            onClick={() => onSelectTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>💻 Code</span>
          </button>

          <button
            onClick={() => onSelectTab('design')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'design'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎨 Design</span>
          </button>

          <button
            onClick={() => onSelectTab('research')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'research'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🔍 Research</span>
          </button>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-1.5">
          {activeTab === 'preview' && htmlCode && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs mr-2">
              <button
                onClick={() => setViewport('desktop')}
                className={`p-1.5 rounded transition-colors ${
                  viewport === 'desktop' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Desktop View"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>

              <button
                onClick={() => setViewport('tablet')}
                className={`p-1.5 rounded transition-colors ${
                  viewport === 'tablet' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tablet View (768px)"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>

              <button
                onClick={() => setViewport('mobile')}
                className={`p-1.5 rounded transition-colors ${
                  viewport === 'mobile' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Mobile View (375px)"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          )}

          {activeTab === 'preview' && (
            <button
              onClick={onRefreshPreview}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Refresh Preview"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Open Live Preview in New Window"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
            title="Close Canvas"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Artifact Tab Content Body */}
      <div className="flex-1 overflow-hidden relative bg-[#f0f2f5] flex flex-col min-h-0">
        {/* 1. Live Preview Tab */}
        {activeTab === 'preview' && (
          <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 overflow-auto">
            {htmlCode ? (
              <div
                className={`h-full transition-all duration-300 rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white ${
                  viewport === 'mobile'
                    ? 'w-[375px] max-h-[750px] my-auto'
                    : viewport === 'tablet'
                    ? 'w-[768px] max-h-[900px] my-auto'
                    : 'w-full'
                }`}
              >
                <iframe
                  title="Web UI Preview"
                  src={`/api/preview/${sessionId}?t=${previewKey}`}
                  className="w-full h-full border-none bg-white"
                  sandbox="allow-scripts allow-same-origin allow-modals allow-forms"
                />
              </div>
            ) : (
              <div className="text-center p-8 text-slate-400">
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-xs">
                  🌐
                </div>
                <h4 className="font-semibold text-slate-700 text-xs mb-1">No Web UI Generated Yet</h4>
                <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                  Prompt the assistant in the chat. The live interactive prototype will appear here automatically!
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2. Code Tab */}
        {activeTab === 'code' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-600 font-semibold">index.html</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  disabled={!htmlCode}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer transition-colors shadow-xs"
                >
                  {copied ? '✓ Copied' : 'Copy HTML'}
                </button>
                <button
                  onClick={handleExportHtml}
                  disabled={!htmlCode}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer transition-colors shadow-xs"
                >
                  Export File
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-900 font-mono text-xs text-slate-200 select-text leading-relaxed custom-scrollbar">
              {htmlCode ? (
                <pre className="whitespace-pre">{htmlCode}</pre>
              ) : (
                <div className="text-center py-12 text-slate-400 font-sans">
                  No code generated yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Design Spec Tab */}
        {activeTab === 'design' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#f0f2f5] text-slate-800 text-xs leading-relaxed select-text custom-scrollbar">
            {designPlan ? (
              <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="mb-4 pb-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-mono text-xs text-indigo-600 font-bold">design-plan.md</span>
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Design Architecture</span>
                </div>
                <div className="markdown-rich">
                  <MarkdownRenderer content={designPlan} />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                No design specification generated yet.
              </div>
            )}
          </div>
        )}

        {/* 4. Research Tab */}
        {activeTab === 'research' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#f0f2f5] text-slate-800 text-xs leading-relaxed select-text custom-scrollbar">
            {research ? (
              <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="mb-4 pb-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-mono text-xs text-blue-600 font-bold">research.md</span>
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Market & UX Dossier</span>
                </div>
                <div className="markdown-rich">
                  <MarkdownRenderer content={research} />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                No research dossier generated yet.
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
