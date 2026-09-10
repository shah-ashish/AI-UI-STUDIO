import React from 'react';
import { Loader2 } from 'lucide-react';

export default function StreamingBadge({ message, icon: Icon, theme = 'default' }) {
  const themes = {
    default: 'border-slate-200 bg-slate-50 text-slate-600',
    active: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };

  return (
    <div className={`border rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-xs shadow-sm ${themes[theme] || themes.default}`}>
      {Icon ? (
        <Icon className="h-4 w-4 animate-spin shrink-0" />
      ) : (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      )}
      <span className="font-medium font-mono text-[11px] tracking-wide">{message || 'Streaming tokens in real-time...'}</span>
    </div>
  );
}
