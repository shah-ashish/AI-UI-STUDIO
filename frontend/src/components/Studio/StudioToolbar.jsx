import React, { useState } from 'react';
import {
  Eye,
  Code,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  Download,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { getPreviewUrl } from '../../api/studioApi';

export default function StudioToolbar({
  viewMode,
  setViewMode,
  deviceView,
  setDeviceView,
  sessionId,
  previewKey,
  htmlCode,
  streaming,
  statusMessage,
  onRefreshPreview,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!htmlCode) return;
    navigator.clipboard.writeText(htmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!htmlCode) return;
    const blob = new Blob([htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-2xl shadow-sm shrink-0">
      <div className="flex items-center gap-3">
        {/* Window dots */}
        <div className="flex items-center gap-1.5 mr-2">
          <span className="h-3 w-3 rounded-full bg-red-400"></span>
          <span className="h-3 w-3 rounded-full bg-amber-400"></span>
          <span className="h-3 w-3 rounded-full bg-emerald-400"></span>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5">
          <button
            onClick={() => setViewMode('preview')}
            disabled={streaming}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewMode === 'preview'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Live Split</span>
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewMode === 'code'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            <span>Code</span>
          </button>
        </div>

        {/* Device Viewport Toggles */}
        {viewMode === 'preview' && !streaming && (
          <div className="flex items-center gap-1">
            <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5">
              {[
                { key: 'desktop', Icon: Monitor, title: 'Desktop (100%)' },
                { key: 'tablet', Icon: Tablet, title: 'Tablet (768px)' },
                { key: 'mobile', Icon: Smartphone, title: 'Mobile (390px)' },
              ].map(({ key, Icon, title }) => (
                <button
                  key={key}
                  onClick={() => setDeviceView(key)}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    deviceView === key
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title={title}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            <button
              onClick={onRefreshPreview}
              className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-white transition cursor-pointer"
              title="Reload preview"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {streaming && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="font-mono text-[11px]">Streaming Code: {statusMessage}</span>
          </span>
        )}
      </div>

      {/* Action Buttons */}
      {!streaming && (
        <div className="flex items-center gap-2">
          <a
            href={getPreviewUrl(sessionId, previewKey)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-sm cursor-pointer"
            title="Open in full browser tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open in New Tab</span>
          </a>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-2 rounded-xl transition shadow-sm cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </button>
        </div>
      )}
    </div>
  );
}
