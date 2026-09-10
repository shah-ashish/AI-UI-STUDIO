import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize2, Minimize2, Copy, Check, ArrowDown } from 'lucide-react';

export default function CodeEditorView({ htmlCode, streaming, scrollRef }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Normal view scroll state
  const normalScrollRef = useRef(null);
  const [isNormalAtBottom, setIsNormalAtBottom] = useState(true);
  const [showNormalScrollBtn, setShowNormalScrollBtn] = useState(false);

  // Expanded modal scroll state
  const modalScrollRef = useRef(null);
  const [isModalAtBottom, setIsModalAtBottom] = useState(true);
  const [showModalScrollBtn, setShowModalScrollBtn] = useState(false);

  // Handle scroll events in normal view
  const handleNormalScroll = useCallback(() => {
    const el = normalScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 50;
    setIsNormalAtBottom(atBottom);
    setShowNormalScrollBtn(!atBottom && el.scrollHeight > el.clientHeight + 80);
  }, []);

  // Handle scroll events in modal view
  const handleModalScroll = useCallback(() => {
    const el = modalScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 50;
    setIsModalAtBottom(atBottom);
    setShowModalScrollBtn(!atBottom && el.scrollHeight > el.clientHeight + 80);
  }, []);

  // Smart auto-scroll: Only scroll down if user was already at bottom!
  useEffect(() => {
    if (isNormalAtBottom && normalScrollRef.current) {
      normalScrollRef.current.scrollTop = normalScrollRef.current.scrollHeight;
    }
    if (isExpanded && isModalAtBottom && modalScrollRef.current) {
      modalScrollRef.current.scrollTop = modalScrollRef.current.scrollHeight;
    }
  }, [htmlCode, isNormalAtBottom, isModalAtBottom, isExpanded]);

  // Jump to bottom handlers
  const scrollToBottomNormal = () => {
    if (normalScrollRef.current) {
      normalScrollRef.current.scrollTo({
        top: normalScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setIsNormalAtBottom(true);
      setShowNormalScrollBtn(false);
    }
  };

  const scrollToBottomModal = () => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTo({
        top: modalScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setIsModalAtBottom(true);
      setShowModalScrollBtn(false);
    }
  };

  // Allow pressing Escape to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const handleCopy = () => {
    if (!htmlCode) return;
    navigator.clipboard.writeText(htmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Normal View */}
      <div className={`flex-1 w-full h-full min-h-0 flex flex-col bg-slate-900 overflow-hidden relative ${
        isExpanded ? 'opacity-0 pointer-events-none' : ''
      }`}>
        {/* Editor Header */}
        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Buffer Stream • UTF-8</span>
            <span className="text-slate-600">•</span>
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">HTML5 / Tailwind CSS</span>
          </div>

          <div className="flex items-center gap-1.5">
            {htmlCode && (
              <button
                onClick={handleCopy}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition cursor-pointer"
                title="Copy code"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition cursor-pointer flex items-center gap-1 text-[10px] font-mono"
              title="Expand to Fullscreen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Expand</span>
            </button>
          </div>
        </div>

        {/* Code Content with Smart Scroll */}
        <div
          ref={normalScrollRef}
          onScroll={handleNormalScroll}
          className="flex-1 min-h-0 p-4 sm:p-5 overflow-auto custom-scrollbar font-mono text-xs leading-relaxed text-slate-300 relative"
        >
          <pre className="whitespace-pre-wrap selection:bg-indigo-500/30 selection:text-white">
            {htmlCode ? (
              htmlCode
            ) : (
              <span className="text-slate-500 italic">Waiting for HTML5 code stream...</span>
            )}
            {streaming && (
              <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 animate-cursor-blink align-middle rounded-sm"></span>
            )}
          </pre>
          <div ref={scrollRef} />
        </div>

        {/* Floating "Scroll to Bottom" button when user scrolls up */}
        {showNormalScrollBtn && (
          <button
            onClick={scrollToBottomNormal}
            className="absolute bottom-10 right-4 z-10 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1.5 transition-all animate-fade-in-up cursor-pointer border border-indigo-400/30"
          >
            <span>Scroll to bottom</span>
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Status Bar */}
        <div className="px-4 py-1.5 bg-slate-800 border-t border-slate-700 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-mono text-slate-500">
            {htmlCode ? `${htmlCode.split('\n').length} lines` : '0 lines'}
          </span>
          <span className="text-[10px] font-mono text-emerald-400">
            {streaming ? 'Streaming live code...' : 'No compile errors'}
          </span>
        </div>
      </div>

      {/* Fullscreen Modal View */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm p-4 sm:p-8 flex items-center justify-center animate-fade-in-up">
          <div className="w-full max-w-6xl h-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
            {/* Fullscreen Header */}
            <div className="px-6 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-800 px-2 py-0.5 rounded uppercase tracking-wider">
                  Code Fullscreen
                </span>
                <span className="text-xs font-mono text-slate-300">HTML5 + Tailwind CSS Output</span>
                {htmlCode && (
                  <span className="text-xs font-mono text-slate-500">
                    ({htmlCode.split('\n').length} lines)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {htmlCode && (
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg transition cursor-pointer shadow-sm"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                )}

                <button
                  onClick={() => setIsExpanded(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow-sm"
                  title="Close Fullscreen (Esc)"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>Exit Fullscreen</span>
                </button>
              </div>
            </div>

            {/* Code Content with Smart Scroll */}
            <div
              ref={modalScrollRef}
              onScroll={handleModalScroll}
              className="flex-1 min-h-0 p-6 sm:p-8 overflow-auto custom-scrollbar font-mono text-xs leading-relaxed text-slate-200 relative"
            >
              <pre className="whitespace-pre-wrap selection:bg-indigo-500/30 selection:text-white">
                {htmlCode ? (
                  htmlCode
                ) : (
                  <span className="text-slate-500 italic">Waiting for HTML5 code stream...</span>
                )}
                {streaming && (
                  <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 animate-cursor-blink align-middle rounded-sm"></span>
                )}
              </pre>
            </div>

            {/* Floating "Scroll to Bottom" button in modal */}
            {showModalScrollBtn && (
              <button
                onClick={scrollToBottomModal}
                className="absolute bottom-12 right-8 z-10 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-medium px-3.5 py-2 rounded-full shadow-xl backdrop-blur-sm flex items-center gap-1.5 transition-all animate-fade-in-up cursor-pointer border border-indigo-400/30"
              >
                <span>Scroll to bottom</span>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Footer hint */}
            <div className="px-6 py-2 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
              <span>Press <kbd className="bg-slate-700 border border-slate-600 px-1.5 py-0.5 rounded text-[10px] text-slate-300">Esc</kbd> to exit fullscreen</span>
              <span className="text-emerald-400">{streaming ? 'Streaming...' : 'Ready'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
