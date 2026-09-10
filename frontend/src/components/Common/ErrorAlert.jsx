import React from 'react';
import { ShieldAlert, X } from 'lucide-react';

export default function ErrorAlert({ error, onDismiss }) {
  if (!error) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[90%] pointer-events-auto transition-all duration-200">
      <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start gap-3 shadow-xl backdrop-blur-sm">
        <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-rose-800">Error</p>
          <p className="text-rose-600 text-xs mt-0.5 leading-relaxed break-words">{error}</p>
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
