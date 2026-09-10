import React, { useState } from 'react';
import ChatBubble from './ChatBubble';
import Logo from '../Common/Logo';

const SUGGESTION_PROMPTS = [
  {
    title: 'AI Resume SaaS Landing Page',
    desc: 'Modern hero section, live feature demo card, pricing tiers & testimonials.',
    prompt: 'Create a modern, high-converting landing page for an AI Resume Builder called ResumePulse. Include a bold hero with CTA, features grid, interactive resume preview card, pricing tiers, and testimonials with Tailwind CSS.',
  },
  {
    title: 'Fintech Analytics Dashboard',
    desc: 'Dark mode metrics, revenue trends, transaction history table & cards.',
    prompt: 'Design a sleek dark-mode Fintech Analytics Dashboard for crypto and fiat portfolios. Include metric stat cards with glowing badges, a revenue chart section, recent transactions table, and a quick transfer widget.',
  },
  {
    title: 'Artisan Coffee Roastery Store',
    desc: 'Warm earthy palette, product catalog, origin filter & subscription flow.',
    prompt: 'Build an elegant e-commerce landing page for RoastCraft Artisan Coffee. Feature coffee origin story, interactive blend catalog with tasting notes, roast level selectors, and a monthly subscription box calculator.',
  },
  {
    title: 'Developer Portfolio & Lab',
    desc: 'Minimalist typography, project showcase, terminal widget & contact form.',
    prompt: 'Create a clean, minimalist developer portfolio for a Senior AI & Fullstack Engineer. Include an interactive terminal hero, featured open-source projects grid, tech stack tags, and a modern contact modal.',
  },
];

const QUICK_REFINEMENTS = [
  'Add a 3-tier pricing comparison table with monthly/annual toggle',
  'Add a responsive FAQ accordion section with expand/collapse',
  'Add a customer testimonials carousel with star ratings',
  'In research, check competitor pricing models and feature breakdown',
  'In design, switch primary color palette to emerald and slate',
];

export default function ChatView({
  projectTitle,
  messages = [],
  isStreaming = false,
  streamingMilestones = [],
  streamingText = '',
  onSendMessage,
  onOpenArtifact,
  isArtifactOpen,
  onToggleArtifact,
  artifactCount = 0,
  pendingAction = null,
  onStop,
  chatEndRef,
}) {
  const [inputText, setInputText] = useState('');

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] min-w-0 overflow-hidden relative">
      {/* Chat Top Header */}
      <header className="h-14 px-5 border-b border-slate-200 bg-white/90 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-slate-900 truncate max-w-md">
              {projectTitle}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="font-mono">{isStreaming ? 'Synthesizing in background...' : 'NEURAL WORKSPACE V4.2'}</span>
            </div>
          </div>
        </div>

        {/* Right Artifact Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleArtifact}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
              isArtifactOpen
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>Artifacts Canvas</span>
            {artifactCount > 0 && (
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                isArtifactOpen ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {artifactCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 min-h-0 space-y-4 custom-scrollbar">
        {messages.length === 0 && !isStreaming ? (
          <div className="max-w-2xl mx-auto my-auto py-8 flex flex-col items-center text-center animate-fade-in-up">
            {/* Logo Emblem */}
            <div className="mb-3">
              <Logo size="lg" />
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-slate-200 bg-white/80 text-slate-500 text-xs font-mono tracking-widest mb-3 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              NEURAL WORKSPACE V4.2
            </div>

            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
              AI UI STUDIO
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-8 leading-relaxed">
              Precision canvas engineered for creative flow, dynamic prototyping, and rapid interface synthesis.
            </p>

            {/* Starter Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
              {SUGGESTION_PROMPTS.map((card, idx) => (
                <div
                  key={idx}
                  onClick={() => onSendMessage(card.prompt)}
                  className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {card.title}
                    </span>
                    <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full space-y-4">
            {messages.map((msg, index) => (
              <ChatBubble
                key={msg.id || index}
                message={msg}
                onOpenArtifact={onOpenArtifact}
              />
            ))}

            {/* Live Streaming Turn */}
            {isStreaming && (
              <ChatBubble
                message={{
                  role: 'assistant',
                  content: streamingText,
                  pipeline_status: 'running',
                  milestones: streamingMilestones,
                  artifacts: [],
                }}
                isStreamingAssistant={true}
                onOpenArtifact={onOpenArtifact}
              />
            )}

            {/* Interactive Stage Approval Gate */}
            {pendingAction && !isStreaming && (
              <div className="my-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in-up">
                <div className="min-w-0">
                  <div className="font-bold text-xs text-indigo-950 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                    </span>
                    <span>Stage Review & Approval Required</span>
                  </div>
                  <p className="text-[11px] text-indigo-800/80 mt-1 leading-relaxed">
                    Inspect the synthesized artifact on the right. When ready, click below to advance to the next pipeline stage, or type any requested edits in the chat!
                  </p>
                </div>

                <button
                  onClick={() => onSendMessage(pendingAction.actionMessage || 'Approve and proceed')}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{pendingAction.label}</span>
                </button>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white/80 backdrop-blur-md flex-shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Quick Refinement Chips */}
          {messages.length > 0 && !isStreaming && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <span className="text-slate-400 flex-shrink-0 font-medium mr-1">Suggested:</span>
              {QUICK_REFINEMENTS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(chip)}
                  className="px-3 py-1 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors flex-shrink-0 cursor-pointer text-[11px] shadow-xs"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-white rounded-2xl border border-slate-200 focus-within:border-indigo-300 focus-within:shadow-md focus-within:shadow-indigo-100/50 shadow-sm p-1.5 transition-all">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder={
                isStreaming
                  ? 'Orchestrating pipeline stages in background...'
                  : messages.length === 0
                  ? 'Ask or prompt AI UI STUDIO...'
                  : 'Ask to change design, add sections, or update research...'
              }
              rows={2}
              className="flex-1 bg-transparent text-slate-800 placeholder-slate-400 text-xs sm:text-[13px] p-2.5 resize-none focus:outline-none leading-relaxed disabled:opacity-50"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm hover:shadow transition-all cursor-pointer active:scale-95 flex items-center justify-center flex-shrink-0"
                title="Stop generation"
              >
                <div className="w-3.5 h-3.5 bg-white rounded-xs" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`p-2.5 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                  !inputText.trim()
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer active:scale-95'
                }`}
                title="Send message"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
            <span>Press <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">Enter</kbd> to send, <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">Shift+Enter</kbd> for newline</span>
            <span>Markdown Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
