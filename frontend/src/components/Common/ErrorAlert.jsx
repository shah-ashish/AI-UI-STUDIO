import React from 'react';
import { ShieldAlert, X } from 'lucide-react';

export default function ErrorAlert({ error, onDismiss }) {
  if (!error) return null;

  return (
    <div className="max-w-5xl mx-auto mt-4 px-6 w-full animate-fade-in-up">
      <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start gap-3 shadow-sm">
        <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-rose-800">Error occurred</p>
          <p className="text-rose-600 text-xs mt-0.5 leading-relaxed">{error}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-rose-400 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-100 transition cursor-pointer"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
