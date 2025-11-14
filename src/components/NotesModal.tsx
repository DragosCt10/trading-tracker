import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: string;
}

export default function NotesModal({ isOpen, onClose, notes }: NotesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Trade Notes</CardTitle>
          <Button 
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent>
          {notes ? (
            <p className="text-slate-700 whitespace-pre-wrap">{notes}</p>
          ) : (
            <p className="text-slate-500 italic">No notes available for this trade.</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-end pt-4">
          <Button onClick={onClose}>
            Close
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}