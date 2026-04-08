'use client';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MarkdownRenderer } from '@/components/dynamicComponents';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  isPreview: boolean;
  onTogglePreview: () => void;
  placeholder?: string;
}

export default function MarkdownEditor({
  content,
  onChange,
  isPreview,
  onTogglePreview,
  placeholder = 'Start writing your insight in markdown...',
}: MarkdownEditorProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
          Content *
        </Label>
        {/* Switch Toggle */}
        <div className="relative inline-flex items-center bg-slate-100/60 dark:bg-slate-800/40 rounded-xl p-1 border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => { if (isPreview) onTogglePreview(); }}
            className={`relative px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
              !isPreview
                ? 'bg-white dark:bg-slate-700 shadow-sm text-[var(--tc-text)] dark:text-[var(--tc-text-dark)]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => { if (!isPreview) onTogglePreview(); }}
            className={`relative px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
              isPreview
                ? 'bg-white dark:bg-slate-700 shadow-sm text-[var(--tc-text)] dark:text-[var(--tc-text-dark)]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Preview
          </button>
        </div>
      </div>
      <div className="border border-slate-200/60 dark:border-slate-600 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm">
        {isPreview ? (
          <div className="min-h-[400px] p-4 prose prose-slate dark:prose-invert max-w-none break-words [overflow-wrap:anywhere] [&_a]:underline [&_a]:[color:var(--tc-text)] dark:[&_a]:[color:var(--tc-text-dark)] [&_a]:decoration-[var(--tc-primary)]/50 hover:[&_a]:decoration-[var(--tc-primary)] [&_*]:break-words [&_*]:[overflow-wrap:anywhere]">
            {content ? (
              <MarkdownRenderer content={content} />
            ) : (
              <span className="text-slate-400 dark:text-slate-600">No content yet...</span>
            )}
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[400px] p-4 bg-transparent border-0 outline-none resize-none text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono text-sm break-words [overflow-wrap:anywhere]"
            placeholder={placeholder}
          />
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Supports markdown syntax (headers, bold, italic, lists, links, etc.)
      </p>
    </div>
  );
}
