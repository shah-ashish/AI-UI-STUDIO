import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders markdown content in rich HTML format with styled components.
 * No raw markdown symbols are shown — everything is rendered as proper HTML.
 */
/**
 * Sanitizes markdown content so that if a model mistakenly wraps its entire response
 * inside a ```markdown ... ``` code fence, it is stripped and rendered as rich HTML.
 */
function sanitizeMarkdown(raw) {
  if (!raw) return '';
  let text = raw.trim();
  // Strip opening code fence like ```markdown or ```
  text = text.replace(/^```(?:markdown)?\s*\n?/i, '');
  // Strip closing code fence if present
  text = text.replace(/\n?```\s*$/i, '');
  return text;
}

export default function MarkdownRenderer({ content, className = '' }) {
  if (!content) return null;

  const cleanContent = sanitizeMarkdown(content);

  return (
    <div className={`markdown-rich prose prose-slate max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-slate-900 mt-6 mb-3 pb-2 border-b border-slate-200 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-slate-800 mt-5 mb-2 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-1.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-slate-700 mt-3 mb-1 uppercase tracking-wider">
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-sm text-slate-600 leading-relaxed mb-3">{children}</p>
          ),

          // Strong & Emphasis
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-800">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-600">{children}</em>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-none space-y-1.5 mb-3 pl-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-none space-y-1.5 mb-3 pl-0 counter-reset-item">{children}</ol>
          ),
          li: ({ children, ordered }) => (
            <li className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0"></span>
              <span className="flex-1">{children}</span>
            </li>
          ),

          // Code
          code: ({ inline, className: codeClassName, children }) => {
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono text-indigo-700 font-medium">
                  {children}
                </code>
              );
            }
            return (
              <div className="my-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-300"></span>
                  <span className="h-2 w-2 rounded-full bg-amber-300"></span>
                  <span className="h-2 w-2 rounded-full bg-emerald-300"></span>
                  <span className="ml-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider">Code</span>
                </div>
                <pre className="p-3 overflow-x-auto">
                  <code className="text-xs font-mono text-slate-700 leading-relaxed">{children}</code>
                </pre>
              </div>
            );
          },
          pre: ({ children }) => <>{children}</>,

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-indigo-400 bg-indigo-50/50 pl-4 py-2 my-3 rounded-r-lg text-sm text-slate-600 italic">
              {children}
            </blockquote>
          ),

          // Tables
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50 border-b border-slate-200">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm text-slate-600 border-t border-slate-100">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-50/50 transition-colors">{children}</tr>
          ),

          // Horizontal rules
          hr: () => <hr className="my-4 border-slate-200" />,

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2 transition-colors font-medium"
            >
              {children}
            </a>
          ),

          // Images
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className="rounded-lg border border-slate-200 shadow-sm my-3 max-w-full" />
          ),
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}
