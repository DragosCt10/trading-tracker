import React from 'react';
import { Button } from "@/components/ui/button";
import { X, FileText } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: string;
}

export default function NotesModal({ isOpen, onClose, notes }: NotesModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-md max-h-[80vh] fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-br from-white via-purple-100/80 to-violet-100/70 dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 rounded-2xl p-0 flex flex-col overflow-hidden">
        {/* Gradient orbs background - fixed to modal */}
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

        {/* Noise texture overlay - fixed to modal */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60" />

        {/* Scrollable content wrapper */}
        <div className="relative overflow-y-auto flex-1 px-6 py-5">
          <AlertDialogHeader className="space-y-1.5 mb-4">
            <div className="flex items-center justify-between">
              <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-violet-500/10 dark:from-purple-500/20 dark:to-violet-500/20 border border-purple-200/50 dark:border-purple-700/50">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span>Trade Notes</span>
              </AlertDialogTitle>
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="cursor-pointer rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors duration-200"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              View notes and additional information for this trade.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="pt-2 pb-4">
            {notes ? (
              <div className="rounded-lg bg-transparent border border-slate-300 dark:border-slate-700 p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{notes}</p>
              </div>
            ) : (
              <div className="rounded-lg bg-transparent border border-slate-300 dark:border-slate-700 p-4">
                <p className="text-sm text-slate-500 dark:text-slate-500 italic">No notes available for this trade.</p>
              </div>
            )}
          </div>

          <AlertDialogFooter className="flex justify-end pt-2">
            <Button 
              onClick={onClose}
              className="cursor-pointer relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 px-4 py-2 group border-0"
            >
              <span className="relative z-10">Close</span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}