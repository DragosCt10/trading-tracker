import React from 'react';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: string;
}

export default function NotesModal({ isOpen, onClose, notes }: NotesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm max-w-lg w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-stone-900">Trade Notes</h3>
            <button
              onClick={onClose}
              className="inline-grid place-items-center border align-middle select-none font-sans font-medium text-center transition-all duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-sm min-w-[38px] min-h-[38px] rounded-md bg-transparent border-transparent text-stone-800 hover:bg-stone-800/5 hover:border-stone-800/5 shadow-none hover:shadow-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="mt-4">
            {notes ? (
              <p className="text-stone-700 whitespace-pre-wrap">{notes}</p>
            ) : (
              <p className="text-stone-500 italic">No notes available for this trade.</p>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 