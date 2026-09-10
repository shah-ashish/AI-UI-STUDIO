import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize2, Minimize2, Copy, Check, ArrowDown } from 'lucide-react';
import MarkdownRenderer from '../Common/MarkdownRenderer';

/**
 * Renders streaming content as rich formatted markdown.
 * Features smart auto-scrolling (pauses when user scrolls up, resumes when user returns to bottom),
 * a floating "Scroll to bottom" button, copy, and fullscreen modal expansion.
 */
export default function StreamOutputCard({
  content,
  streaming,
  placeholder = 'Waiting for tokens to arrive...',
  scrollRef,
  title = 'Output Stream',
}) {
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
  }, [content, isNormalAtBottom, isModalAtBottom, isExpanded]);

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
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Normal View */}
      <div className={`flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden relative ${
        isExpanded ? 'opacity-0 pointer-events-none' : ''
      }`}>
        {/* Top Mini Toolbar */}
        <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
            {title}
          </span>
          <div className="flex items-center gap-1.5">
            {content && (
              <button
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Copy content"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-mono"
              title="Expand to Fullscreen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Expand</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div
          ref={normalScrollRef}
          onScroll={handleNormalScroll}
          className="flex-1 min-h-0 p-5 sm:p-6 overflow-y-auto custom-scrollbar relative"
        >
          {content ? (
            <MarkdownRenderer content={content} />
          ) : (
            <p className="text-slate-400 italic text-sm">{placeholder}</p>
          )}

          {streaming && (
            <span className="inline-block w-1.5 h-4 bg-slate-900 ml-0.5 animate-cursor-blink align-middle rounded-sm"></span>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Floating "Scroll to Bottom" button when user scrolls up */}
        {showNormalScrollBtn && (
          <button
            onClick={scrollToBottomNormal}
            className="absolute bottom-4 right-4 z-10 bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1.5 transition-all animate-fade-in-up cursor-pointer border border-slate-700"
          >
            <span>Scroll to bottom</span>
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Fullscreen Expanded Overlay Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm p-4 sm:p-8 flex items-center justify-center animate-fade-in-up">
          <div className="w-full max-w-6xl h-full bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
            {/* Fullscreen Header */}
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded uppercase tracking-wider">
                  Fullscreen Mode
                </span>
                <span className="text-sm font-semibold text-slate-800">{title}</span>
                {content && (
                  <span className="text-xs font-mono text-slate-400">
                    (~{Math.round(content.length / 4).toLocaleString()} tokens)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {content && (
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition cursor-pointer shadow-sm"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                )}

                <button
                  onClick={() => setIsExpanded(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow-sm"
                  title="Close Fullscreen (Esc)"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>Exit Fullscreen</span>
                </button>
              </div>
            </div>

            {/* Scrollable Expanded Content */}
            <div
              ref={modalScrollRef}
              onScroll={handleModalScroll}
              className="flex-1 min-h-0 p-6 sm:p-10 overflow-y-auto custom-scrollbar relative"
            >
              {content ? (
                <MarkdownRenderer content={content} />
              ) : (
                <p className="text-slate-400 italic text-sm">{placeholder}</p>
              )}

              {streaming && (
                <span className="inline-block w-1.5 h-4 bg-slate-900 ml-0.5 animate-cursor-blink align-middle rounded-sm"></span>
              )}
            </div>

            {/* Floating "Scroll to Bottom" button for modal view */}
            {showModalScrollBtn && (
              <button
                onClick={scrollToBottomModal}
                className="absolute bottom-12 right-8 z-10 bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-medium px-3.5 py-2 rounded-full shadow-xl backdrop-blur-sm flex items-center gap-1.5 transition-all animate-fade-in-up cursor-pointer border border-slate-700"
              >
                <span>Scroll to bottom</span>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Fullscreen Footer Hint */}
            <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
              <span>Press <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-600">Esc</kbd> to exit fullscreen</span>
              <span>Rich Markdown View</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
