import React from 'react';
import { getPreviewUrl } from '../../api/studioApi';

export default function PreviewCanvas({
  sessionId,
  previewKey,
  htmlCode,
  deviceView = 'desktop',
}) {
  const iframeSrc = getPreviewUrl(sessionId, previewKey);

  const containerStyles = {
    desktop: 'w-full',
    tablet: 'w-[768px] max-w-full',
    mobile: 'w-[390px] max-w-full',
  };

  return (
    <div className="flex-1 w-full h-full min-h-0 bg-slate-100 flex flex-col items-center justify-start p-3 overflow-hidden">
      {/* Device Frame Container */}
      <div className={`h-full flex-1 min-h-0 flex flex-col transition-all duration-300 ${containerStyles[deviceView]}`}>
        {/* Device frame decoration for tablet/mobile */}
        {deviceView !== 'desktop' && (
          <div className={`bg-slate-800 flex items-center justify-center shrink-0 ${
            deviceView === 'mobile' ? 'rounded-t-3xl pt-2 pb-1' : 'rounded-t-2xl pt-1.5 pb-1'
          }`}>
            {deviceView === 'mobile' ? (
              <div className="h-3 w-20 rounded-full bg-slate-950 flex items-center justify-end px-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-700"></div>
              </div>
            ) : (
              <div className="h-1.5 w-1.5 rounded-full bg-slate-600"></div>
            )}
          </div>
        )}

        {/* Iframe */}
        <div className={`w-full flex-1 min-h-0 bg-white overflow-hidden shadow-2xl ${
          deviceView === 'desktop'
            ? 'rounded-xl border border-slate-200'
            : deviceView === 'tablet'
            ? 'border-x-4 border-b-4 border-slate-800 rounded-b-2xl'
            : 'border-x-6 border-b-6 border-slate-800 rounded-b-3xl'
        }`}>
          <iframe
            key={`${deviceView}-${previewKey}`}
            srcDoc={htmlCode || undefined}
            src={!htmlCode ? iframeSrc : undefined}
            className="w-full h-full border-0 block bg-white"
            style={{ width: '100%', height: '100%' }}
            title={`${deviceView} Live Preview`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>
      </div>

      {/* Viewport info bar */}
      <div className="w-full flex items-center justify-between mt-2 px-1 text-[10px] font-mono text-slate-400 tracking-wider">
        <span>
          Viewport: {deviceView === 'desktop' ? '100%' : deviceView === 'tablet' ? '768px' : '390px'}
        </span>
        <span>Live Preview Active</span>
      </div>
    </div>
  );
}
