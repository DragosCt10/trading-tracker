'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

export const markdownComponents: Components = {
  a: ({ node, ...props }) => (
    <a
      {...props}
      className="underline text-[var(--tc-text)] dark:text-[var(--tc-text-dark)] decoration-[var(--tc-primary)]/50 hover:decoration-[var(--tc-primary)] break-words [overflow-wrap:anywhere]"
    />
  ),
  p: ({ node, ...props }) => (
    <p {...props} className="break-words [overflow-wrap:anywhere]" />
  ),
  code: ({ node, ...props }) => (
    <code {...props} className="break-words [overflow-wrap:anywhere]" />
  ),
};

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
}
