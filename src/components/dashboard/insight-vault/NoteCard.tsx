'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Pin } from 'lucide-react';
import { Note } from '@/types/note';
import { format } from 'date-fns';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  // Strip markdown and get preview
  const getPreview = (content: string): string => {
    // Remove markdown syntax
    const plainText = content
      .replace(/#{1,6}\s+/g, '') // Headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
      .replace(/\*([^*]+)\*/g, '$1') // Italic
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
      .replace(/`([^`]+)`/g, '$1') // Inline code
      .replace(/```[\s\S]*?```/g, '') // Code blocks
      .trim();

    return plainText;
  };

  const preview = getPreview(note.content);
  const formattedDate = format(new Date(note.created_at), 'MMM d, yyyy');

  return (
    <Card
      className="relative overflow-hidden border-slate-200/60 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 shadow-none backdrop-blur-sm cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={onClick}
    >
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 line-clamp-2 flex-1 pr-2">
            {note.title}
          </h3>
          {note.is_pinned && (
            <Pin className="h-4 w-4 text-purple-500 dark:text-purple-400 flex-shrink-0" />
          )}
        </div>

        {preview && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3 flex-1 overflow-hidden text-ellipsis">
            {preview}
          </p>
        )}

        <div className="space-y-2 mb-4">
          {(note.strategy || (note.strategies && note.strategies.length > 0)) && (
            <div className="flex items-start gap-2 flex-wrap">
              {(() => {
                const strategyCount = note.strategies?.length || (note.strategy ? 1 : 0);
                const label = strategyCount === 1 ? 'Strategy:' : 'Strategies:';
                return (
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">{label}</span>
                );
              })()}
              <div className="flex flex-wrap gap-1.5">
                {note.strategies && note.strategies.length > 0 ? (
                  note.strategies.map((strategy) => (
                    <Badge
                      key={strategy.id}
                      className="bg-purple-100 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 shadow-none text-xs"
                    >
                      {strategy.name}
                    </Badge>
                  ))
                ) : note.strategy ? (
                  <Badge className="bg-purple-100 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 shadow-none text-xs">
                    {note.strategy.name}
                  </Badge>
                ) : null}
              </div>
            </div>
          )}
          <span className="text-xs text-slate-500 dark:text-slate-500">
            {formattedDate}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer mt-auto"
        >
          View Details
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </CardContent>
    </Card>
  );
}
