import React, { useState } from 'react';
import { Palette } from 'lucide-react';

export default function DesignReviewBar({ onRefine, streaming }) {
  const [feedback, setFeedback] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleRefineSubmit = () => {
    if (!feedback.trim() || streaming) return;
    onRefine(feedback);
    setFeedback('');
    setExpanded(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRefineSubmit();
    }
    if (e.key === 'Escape') {
      setExpanded(false);
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 text-sm font-medium px-4 py-2.5 rounded-xl transition cursor-pointer shadow-sm"
      >
        <Palette className="h-3.5 w-3.5" />
        <span>Edit Plan Schema</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        placeholder="Describe design changes (press Enter)..."
        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-300 w-64 transition"
      />
      <button
        onClick={handleRefineSubmit}
        disabled={!feedback.trim() || streaming}
        className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-3 py-2 rounded-xl transition disabled:opacity-40 cursor-pointer shadow-sm"
      >
        Refine
      </button>
    </div>
  );
}
