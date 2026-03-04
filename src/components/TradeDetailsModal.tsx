'use client';

import { Trade } from '@/types/trade';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TradeDetailsPanel from './TradeDetailsPanel';

interface TradeDetailsModalProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onTradeUpdated?: () => void;
}

export default function TradeDetailsModal({ trade, isOpen, onClose, onTradeUpdated }: TradeDetailsModalProps) {
  if (!isOpen || !trade) return null;

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-6xl max-h-[90vh] fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 flex flex-col overflow-hidden">
        {/* Gradient orbs background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl" />
          <div className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl" />
        </div>

        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        <AlertDialogTitle className="sr-only">Trade Details</AlertDialogTitle>
        <TradeDetailsPanel trade={trade} onClose={onClose} onTradeUpdated={onTradeUpdated} />
      </AlertDialogContent>
    </AlertDialog>
  );
}
