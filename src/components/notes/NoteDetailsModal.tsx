'use client';

import { useState } from 'react';
import { Note } from '@/types/note';
import { deleteNote, updateNote } from '@/lib/server/notes';
import { useQueryClient } from '@tanstack/react-query';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useStrategies } from '@/hooks/useStrategies';
import { AlertCircle, Loader2, Edit2, Trash2, Pin, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

interface NoteDetailsModalProps {
  note: Note;
  isOpen: boolean;
  onClose: () => void;
  onNoteUpdated?: () => void;
  onNoteDeleted?: () => void;
}

export default function NoteDetailsModal({
  note,
  isOpen,
  onClose,
  onNoteUpdated,
  onNoteDeleted,
}: NoteDetailsModalProps) {
  const { data: userDetails } = useUserDetails();
  const userId = userDetails?.user?.id;
  const { strategies } = useStrategies({ userId });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const queryClient = useQueryClient();

  const [editedNote, setEditedNote] = useState<Note>(note);

  // Update editedNote when note changes
  if (note.id !== editedNote.id && !isEditing) {
    setEditedNote(note);
  }

  const handleSave = async () => {
    if (!userId) {
      setError('User not found');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const { data, error: updateError } = await updateNote(editedNote.id, userId, {
        title: editedNote.title,
        content: editedNote.content,
        strategy_id: editedNote.strategy_id,
        is_pinned: editedNote.is_pinned,
        tags: editedNote.tags,
      });

      if (updateError) throw new Error(updateError.message);
      if (!data) throw new Error('Failed to update note');

      setIsEditing(false);
      if (onNoteUpdated) onNoteUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to update note');
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) {
      setError('User not found');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const { error: deleteError } = await deleteNote(editedNote.id, userId);

      if (deleteError) throw new Error(deleteError.message);

      setShowDeleteConfirm(false);
      if (onNoteDeleted) onNoteDeleted();
    } catch (err: any) {
      setError(err.message || 'Failed to delete note');
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent className="max-w-4xl max-h-[90vh] fade-content border border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-br from-white via-purple-100/80 to-violet-100/70 dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl rounded-2xl p-0 flex flex-col overflow-hidden">
          {/* Gradient orbs background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
            <div
              className="absolute -top-40 -left-32 w-[420px] h-[420px] bg-purple-500/8 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse"
              style={{ animationDuration: '8s' }}
            />
            <div
              className="absolute -bottom-40 -right-32 w-[420px] h-[420px] bg-violet-500/8 dark:bg-violet-500/10 rounded-full blur-3xl animate-pulse"
              style={{ animationDuration: '10s', animationDelay: '2s' }}
            />
          </div>

          {/* Top accent line */}
          <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60" />

          {/* Scrollable content */}
          <div className="relative overflow-y-auto flex-1 px-6 py-5">
            <AlertDialogHeader className="space-y-1.5 mb-4">
              <div className="flex items-center justify-between">
                <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  {isEditing ? 'Edit Note' : 'Note Details'}
                </AlertDialogTitle>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="h-8"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="h-8 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </AlertDialogHeader>

            {error && (
              <div className="mb-4 p-3 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              </div>
            )}

            {isEditing ? (
              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Title *
                  </Label>
                  <Input
                    value={editedNote.title}
                    onChange={(e) =>
                      setEditedNote({ ...editedNote, title: e.target.value })
                    }
                    className="h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700"
                  />
                </div>

                {/* Strategy */}
                <div className="space-y-1.5">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Strategy (Optional)
                  </Label>
                  <Select
                    value={editedNote.strategy_id || 'none'}
                    onValueChange={(value) =>
                      setEditedNote({
                        ...editedNote,
                        strategy_id: value === 'none' ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="h-12 bg-slate-100/50 dark:bg-slate-800/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Strategy</SelectItem>
                      {strategies.map((strategy) => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Content Editor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Content *
                    </Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPreview(false)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          !isPreview
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPreview(true)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          isPreview
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                  <div className="border border-slate-200/70 dark:border-slate-800/70 rounded-xl overflow-hidden bg-white dark:bg-[#0d0a12]">
                    {isPreview ? (
                      <div className="min-h-[400px] p-4 prose prose-slate dark:prose-invert max-w-none [&_a]:underline [&_a]:text-purple-600 dark:[&_a]:text-purple-400 [&_a]:decoration-purple-500/50 hover:[&_a]:decoration-purple-500">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ node, ...props }) => (
                              <a {...props} className="underline text-purple-600 dark:text-purple-400 decoration-purple-500/50 hover:decoration-purple-500" />
                            ),
                          }}
                        >
                          {editedNote.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <Textarea
                        value={editedNote.content}
                        onChange={(e) =>
                          setEditedNote({ ...editedNote, content: e.target.value })
                        }
                        className="min-h-[400px] p-4 bg-transparent border-0 outline-none resize-none text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono text-sm"
                      />
                    )}
                  </div>
                </div>

                {/* Pin */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pin-note-edit"
                    checked={editedNote.is_pinned}
                    onCheckedChange={(checked) =>
                      setEditedNote({ ...editedNote, is_pinned: checked as boolean })
                    }
                    className="h-5 w-5"
                  />
                  <Label htmlFor="pin-note-edit" className="text-sm cursor-pointer">
                    Pin this note
                  </Label>
                </div>

                {/* Action Buttons */}
                <AlertDialogFooter className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedNote(note);
                      setError(null);
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </AlertDialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Note Info */}
                <div className="flex items-center gap-2 flex-wrap">
                  {editedNote.is_pinned && (
                    <Badge className="bg-purple-100 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      <Pin className="h-3 w-3 mr-1" />
                      Pinned
                    </Badge>
                  )}
                  {editedNote.strategy && (
                    <Badge className="bg-purple-100 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      {editedNote.strategy.name}
                    </Badge>
                  )}
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Created {format(new Date(editedNote.created_at), 'MMM d, yyyy')}
                  </span>
                  {editedNote.updated_at !== editedNote.created_at && (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      • Updated {format(new Date(editedNote.updated_at), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {editedNote.title}
                </h2>

                {/* Content */}
                <div className="prose prose-slate dark:prose-invert max-w-none min-h-[200px] p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-200/70 dark:border-slate-800/70 [&_a]:underline [&_a]:text-purple-600 dark:[&_a]:text-purple-400 [&_a]:decoration-purple-500/50 hover:[&_a]:decoration-purple-500">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => (
                        <a {...props} className="underline text-purple-600 dark:text-purple-400 decoration-purple-500/50 hover:decoration-purple-500" />
                      ),
                    }}
                  >
                    {editedNote.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
