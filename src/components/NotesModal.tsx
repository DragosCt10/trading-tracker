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
      <AlertDialogContent className="max-w-md max-h-[80vh] fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 rounded-2xl p-0 flex flex-col overflow-hidden">
        {/* Gradient orbs background - theme-aware */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div
            className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '8s' }}
          />
          <div
            className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '10s', animationDelay: '2s' }}
          />
        </div>

        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Top accent line - theme-aware */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        {/* Fixed Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <AlertDialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between">
              <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-2 rounded-lg themed-header-icon-box">
                  <FileText className="h-5 w-5" />
                </div>
                <span>Trade Notes</span>
              </AlertDialogTitle>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-sm ring-offset-background transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg hover:text-slate-900 dark:hover:text-slate-50"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              View notes and additional information for this trade.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Scrollable content wrapper */}
        <div className="relative overflow-y-auto flex-1 px-6 py-5">
          <div className="pt-2 pb-4">
            {notes ? (
              <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{notes}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">No notes available for this trade.</p>
              </div>
            )}
          </div>

          <AlertDialogFooter className="flex justify-end pt-2">
            <Button
              onClick={onClose}
              className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0"
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