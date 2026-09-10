import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function ResearchReviewBar({ onRefine, streaming }) {
  const [feedback, setFeedback] = useState('');

  const handleRefineSubmit = () => {
    if (!feedback.trim() || streaming) return;
    onRefine(feedback);
    setFeedback('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRefineSubmit();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm shrink-0">
      <h4 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        Want changes in research findings?
      </h4>
      <p className="text-xs text-slate-400 mb-2.5">
        Request specific changes to refine before moving to design.
      </p>

      <div className="flex gap-3">
        <input
          type="text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter change request (press Enter to submit)..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition"
        />
        <button
          onClick={handleRefineSubmit}
          disabled={!feedback.trim() || streaming}
          className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-40 cursor-pointer shadow-sm"
        >
          Refine Research
        </button>
      </div>
    </div>
  );
}
