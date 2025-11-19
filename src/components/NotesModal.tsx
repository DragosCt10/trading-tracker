import React from 'react';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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
      <AlertDialogContent className="max-w-md max-h-[80vh] overflow-y-auto fade-content data-[state=open]:fade-content data-[state=closed]:fade-content">
        <AlertDialogHeader className="flex flex-row items-center justify-between pb-2">
          <AlertDialogTitle className="text-lg">Trade Notes</AlertDialogTitle>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground"
            tabIndex={0}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </Button>
        </AlertDialogHeader>
        <div className="pt-1 pb-1">
          {notes ? (
            <p className="text-slate-700 whitespace-pre-wrap">{notes}</p>
          ) : (
            <p className="text-slate-500 italic">No notes available for this trade.</p>
          )}
        </div>
        <AlertDialogFooter className="flex justify-end pt-4">
          <Button onClick={onClose}>
            Close
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}