import React from 'react';
import { ArrowRight, FolderOpen } from 'lucide-react';
import { SAMPLE_PROMPTS } from '../../constants/prompts';
import Logo from '../Common/Logo';

export default function PromptIntake({ prompt, setPrompt, onStartResearch, streaming, onOpenHistory }) {
  const charCount = prompt.length;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !streaming) {
        onStartResearch();
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 animate-fade-in-up relative">
      {/* Top Right Saved Projects Toggle */}
      <div className="absolute top-2 right-4">
        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl transition cursor-pointer shadow-sm hover:shadow"
          title="Browse saved projects in SQLite"
        >
          <FolderOpen className="h-4 w-4 text-indigo-500" />
          <span>Saved Projects</span>
        </button>
      </div>

      {/* Brand Logo Emblem */}
      <div className="mb-4">
        <Logo size="lg" />
      </div>

      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-white/80 text-slate-500 text-xs font-mono tracking-widest mb-4 shadow-sm">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
        NEURAL WORKSPACE V4.2
      </div>

      {/* Title */}
      <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight text-center mb-3">
        AI UI STUDIO
      </h1>

      {/* Subtitle */}
      <p className="text-slate-500 text-sm sm:text-base text-center max-w-lg mb-10 leading-relaxed">
        Precision canvas engineered for creative flow, dynamic prototyping, and rapid interface synthesis.
      </p>

      {/* Main Input Card */}
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-lg shadow-slate-200/50 p-1.5 transition-all focus-within:shadow-xl focus-within:shadow-indigo-100/50 focus-within:border-indigo-300">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={5}
          placeholder="Ask or prompt AI UI STUDIO..."
          className="w-full bg-transparent border border-slate-200 rounded-xl resize-none text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-300 text-sm sm:text-base leading-relaxed p-4 transition-colors"
        />

        <div className="flex items-center justify-between px-2 pt-2 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
              Markdown Ready
            </span>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
              {charCount} chars
            </span>
          </div>

          <button
            onClick={() => onStartResearch()}
            disabled={!prompt.trim() || streaming}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:shadow-lg"
          >
            <span>Submit</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="flex items-center gap-1.5 mt-4 text-xs text-slate-400">
        <span className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">⌘</span>
        <span>Press</span>
        <span className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">Enter</span>
        <span>to submit,</span>
        <span className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">Shift + Enter</span>
        <span>for new line</span>
      </div>

      {/* Sample Prompts */}
      <div className="mt-8 w-full max-w-3xl">
        <div className="flex flex-wrap gap-2 justify-center">
          {SAMPLE_PROMPTS.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(sample)}
              className="text-xs bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg transition text-left cursor-pointer hover:border-slate-300 shadow-sm"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
