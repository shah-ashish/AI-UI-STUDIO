import React, { useState } from 'react';
import StudioToolbar from './StudioToolbar';
import PreviewCanvas from './PreviewCanvas';
import CodeEditorView from './CodeEditorView';
import CodeRefinementBar from './CodeRefinementBar';

export default function StudioView({
  sessionId,
  previewKey,
  htmlCode,
  streaming,
  statusMessage,
  streamEndRef,
  onRefineCode,
  onRefreshPreview,
}) {
  const [viewMode, setViewMode] = useState(streaming ? 'code' : 'preview');
  const [deviceView, setDeviceView] = useState('desktop');

  // Auto-switch view mode based on streaming state
  React.useEffect(() => {
    if (streaming) {
      setViewMode('code');
    } else if (htmlCode) {
      setViewMode('preview');
    }
  }, [streaming, htmlCode]);

  return (
    <div className="flex-1 w-full flex flex-col gap-3 min-h-0 h-full overflow-hidden animate-fade-in-up">
      {/* Studio Control Toolbar */}
      <StudioToolbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        deviceView={deviceView}
        setDeviceView={setDeviceView}
        sessionId={sessionId}
        previewKey={previewKey}
        htmlCode={htmlCode}
        streaming={streaming}
        statusMessage={statusMessage}
        onRefreshPreview={onRefreshPreview}
      />

      {/* Main Studio Canvas */}
      <div className="flex-1 w-full min-h-0 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg relative">
        {viewMode === 'preview' && !streaming ? (
          <PreviewCanvas
            sessionId={sessionId}
            previewKey={previewKey}
            htmlCode={htmlCode}
            deviceView={deviceView}
          />
        ) : (
          <CodeEditorView
            htmlCode={htmlCode}
            streaming={streaming}
            scrollRef={streamEndRef}
          />
        )}
      </div>

      {/* Live Code Refinement Bar */}
      {!streaming && (
        <CodeRefinementBar onRefineCode={onRefineCode} streaming={streaming} />
      )}
    </div>
  );
}
