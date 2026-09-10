import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function CodeRefinementBar({ onRefineCode, streaming }) {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (!feedback.trim() || streaming) return;
    onRefineCode(feedback);
    setFeedback('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm shrink-0">
      <div className="flex items-center justify-center pl-1">
        <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
      </div>
      <input
        type="text"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Adjust code: 'Make hero headline bigger', 'Add pricing toggle' (press Enter)..."
        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition"
      />
      <button
        onClick={handleSubmit}
        disabled={!feedback.trim() || streaming}
        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition disabled:opacity-40 cursor-pointer shrink-0 shadow-sm"
      >
        Apply Code Update
      </button>
    </div>
  );
}
