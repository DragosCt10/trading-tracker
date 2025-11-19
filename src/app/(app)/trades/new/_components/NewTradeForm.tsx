'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trade } from '@/types/trade';
import { useRouter } from 'next/navigation';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useQueryClient } from '@tanstack/react-query';

// shadcn/ui
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Info } from 'lucide-react';

const MARKET_OPTIONS = ['DAX', 'US30', 'UK100', 'US100', 'EURUSD', 'GBPUSD'];
const SETUP_OPTIONS = [
  'OG', 'TG', 'TCG', '3G', '3CG', 'MultipleGaps',
  'SLG+OG', 'SLG+TG', 'SLG+TCG', 'SLG+3G', 'SLG+3CG'
];
const LIQUIDITY_OPTIONS = ['Liq. Majora', 'Liq. Minora', 'Liq. Locala', 'HOD', 'LOD'];
const MSS_OPTIONS = ['Normal', 'Agresiv'];
const EVALUATION_OPTIONS = ['A+', 'A', 'B', 'C'];
const WEEKDAY_MAP: Record<string, string> = {
  Monday: 'Luni', Tuesday: 'Marti', Wednesday: 'Miercuri', Thursday: 'Joi',
  Friday: 'Vineri', Saturday: 'Sambata', Sunday: 'Duminica',
};

function getQuarter(dateStr: string): string {
  const m = new Date(dateStr).getMonth() + 1;
  if (m <= 3) return 'Q1';
  if (m <= 6) return 'Q2';
  if (m <= 9) return 'Q3';
  return 'Q4';
}

const NOTES_TEMPLATE = `📈 Setup:
(Descrie setup-ul tehnic sau fundamental – de ce ai intrat în trade? Ce pattern, indicator sau logică ai urmat?)

✅ Plusuri:
(Ce ai făcut bine? Ce a mers conform planului? A existat disciplină, răbdare, timing bun?)

❌ Minusuri:
(Ce nu a mers? Ai intrat prea devreme/târziu? Ai ignorat ceva? Overtrading? FOMO?)

🧠 Emoții:
(Ce ai simțit în timpul trade-ului? Încredere? Frică? Nerăbdare? Calm? Ai fost influențat emoțional?)

🎯 Lecții învățate:
(Ce poți îmbunătăți? Ce vei face diferit data viitoare?)`;

export default function NewTradeForm({
  selection,
  actionBarLoading,
}: {
  selection: any;
  actionBarLoading: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: userDetails } = useUserDetails();

  // -------- Base state (only what's necessary) --------
  const initialTradeState: Trade = {
    trade_link: '',
    liquidity_taken: '',
    trade_time: '',
    trade_date: new Date().toISOString().split('T')[0],
    day_of_week: WEEKDAY_MAP[new Date().toLocaleDateString('en-US', { weekday: 'long' })],
    market: '',
    setup_type: '',
    liquidity: '',
    sl_size: 0,
    direction: 'Long',
    trade_outcome: 'Win',
    break_even: false,
    reentry: false,
    news_related: false,
    mss: '',
    risk_per_trade: 0,
    risk_reward_ratio: 0,
    risk_reward_ratio_long: 0,
    local_high_low: false,
    mode: selection.mode,
    notes: NOTES_TEMPLATE,
    quarter: '',
    evaluation: '',
    rr_hit_1_4: false,
    partials_taken: false,
    executed: true,
    launch_hour: false,
  };

  const [trade, setTrade] = useState<Trade>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`new-trade-draft-${selection.mode}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const dateStr = parsed.trade_date || new Date().toISOString().split('T')[0];
          return {
            ...initialTradeState,
            ...parsed,
            trade_date: dateStr,
            day_of_week:
              parsed.day_of_week ||
              WEEKDAY_MAP[new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' })],
            quarter: parsed.quarter || getQuarter(dateStr),
          };
        } catch { }
      }
    }
    return initialTradeState;
  });

  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  const updateTrade = <K extends keyof Trade>(key: K, value: Trade[K]) => {
    setTrade((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  };

  // commit patch to state + localStorage (used by uncontrolled fields)
  const commitAndSave = React.useCallback((patch: Partial<Trade>) => {
    setTrade((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(`new-trade-draft-${selection.mode}`, JSON.stringify(next));
      } catch { }
      return next;
    });
  }, [selection.mode]);

  // keep weekday + quarter in sync when the committed date changes
  useEffect(() => {
    const dateStr = trade.trade_date;
    const dt = new Date(dateStr);
    const engDay = dt.toLocaleDateString('en-US', { weekday: 'long' });
    const roDay = WEEKDAY_MAP[engDay] ?? engDay;
    setTrade((prev) => {
      const next = { ...prev, day_of_week: roDay, quarter: getQuarter(dateStr) };
      return prev.day_of_week === next.day_of_week && prev.quarter === next.quarter ? prev : next;
    });
  }, [trade.trade_date]);

  // -------- Derived from ONLY the 3 controlled pieces (RPT, RR, Outcome) + balance --------
  const accountBalance = selection.activeAccount?.account_balance ?? 0;
  const currency = selection.activeAccount?.currency === 'EUR' ? '€' : '$';

  // -------- P&L calculation --------
  const { signedProfit, pnlPercentage } = useMemo(() => {
    if (!accountBalance) {
      return { signedProfit: 0, pnlPercentage: 0 };
    }

    // Break-even trade => 0%
    if (trade.break_even) {
      return { signedProfit: 0, pnlPercentage: 0 };
    }

    let pnlPct = 0;

    if (trade.trade_outcome === 'Lose') {
      // ❌ loss = -risk_per_trade (e.g. risk 1% -> -1%)
      pnlPct = -trade.risk_per_trade;
    } else {
      // ✅ win = risk_per_trade * RR (e.g. risk 1%, RR 2 -> +2%)
      pnlPct = trade.risk_per_trade * (trade.risk_reward_ratio || 0);
    }

    const profit = (pnlPct / 100) * accountBalance;

    return {
      signedProfit: profit,
      pnlPercentage: pnlPct,
    };
  }, [accountBalance, trade.break_even, trade.trade_outcome, trade.risk_per_trade, trade.risk_reward_ratio]);

  // Save trade draft to localStorage every time the trade state changes
  useEffect(() => {
    try {
      localStorage.setItem(`new-trade-draft-${selection.mode}`, JSON.stringify(trade));
    } catch { }
  }, [trade, selection.mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!trade.market || !trade.setup_type || !trade.liquidity || !trade.mss) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    if (!selection.activeAccount) {
      setError('No active account found. Please set up an account in settings.');
      setIsSubmitting(false);
      return;
    }

    try {
      // grab latest notes if user didn’t blur
      if (notesRef.current) {
        const latestNotes = notesRef.current.value;
        if (latestNotes !== trade.notes) {
          trade.notes = latestNotes; // update snapshot for submit
        }
      }

      const supabase = createClient();
      const tableName = `${selection.mode}_trades`;

      const { error } = await supabase
        .from(tableName)
        .insert([{
          ...trade,
          user_id: userDetails?.user?.id,
          calculated_profit: signedProfit,
          pnl_percentage: pnlPercentage,
          account_id: selection.activeAccount.id,
        }] as any)
        .select();

      if (error) throw error;

      if (typeof window !== 'undefined') {
        localStorage.removeItem(`new-trade-draft-${selection.mode}`);
      }

      // ✅ make sure every trades list is stale
      await queryClient.invalidateQueries({
        // this will invalidate all queries whose key starts with 'allTrades'
        queryKey: ['allTrades'],
        exact: false,
      });

      router.push('/trades');
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  if (actionBarLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (!selection.activeAccount) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border bg-background p-8 text-center">
        <Info className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 text-xl font-semibold">No Active Account</h2>
        <p className="text-muted-foreground">
          Please set up and activate an account for {selection.mode} mode to view your trading dashboard.
        </p>
      </div>
    );
  }

  const money = (n: number) => `${currency}${n.toFixed(2)}`;

  // tiny helper for uncontrolled inputs
  const Uncontrolled = React.memo(function Uncontrolled({
    id, label, type = 'text', defaultValue, onCommit, step, inputMode,
  }: {
    id: string;
    label: string;
    type?: string;
    defaultValue?: string | number;
    onCommit: (value: string) => void;
    step?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  }) {
    // Use vertical spacing between label and input
    return (
      <div>
        <Label htmlFor={id} className="mb-1.5 block">{label}</Label>
        <Input
          id={id}
          type={type}
          defaultValue={defaultValue as any}
          step={step}
          inputMode={inputMode}
          className="shadow-none"
          onBlur={(e) => onCommit(e.currentTarget.value)}
        />
      </div>
    );
  });

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 rounded-md border bg-muted/20 p-4 text-sm">
        You are adding a new trade for your{' '}
        <span className="font-medium">{selection.activeAccount.name}</span> account in{' '}
        <Badge className="ml-1 align-middle">
          {selection.mode ? selection.mode[0].toUpperCase() + selection.mode.slice(1) : '—'}
        </Badge>{' '}
        mode.
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Uncontrolled text/number fields */}
        <Uncontrolled
          id="liquidity_taken"
          label="Liquidity Taken"
          defaultValue={trade.liquidity_taken}
          onCommit={(v) => commitAndSave({ liquidity_taken: v })}
        />

        <Uncontrolled
          id="trade_link"
          label="Trade Link"
          defaultValue={trade.trade_link}
          onCommit={(v) => commitAndSave({ trade_link: v })}
        />

        {/* Uncontrolled selects using defaultValue (shadcn Select supports it) */}
        <div>
          <Label className="mb-1.5 block">Market</Label>
          <Select defaultValue={trade.market || undefined} onValueChange={(v) => commitAndSave({ market: v })}>
            <SelectTrigger className="shadow-none"><SelectValue placeholder="Select Market" /></SelectTrigger>
            <SelectContent>
              {MARKET_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Uncontrolled
          id="trade_date"
          label="Date"
          type="date"
          defaultValue={trade.trade_date}
          onCommit={(v) => commitAndSave({ trade_date: v })}
        />

        <Uncontrolled
          id="trade_time"
          label="Time"
          type="time"
          defaultValue={trade.trade_time}
          onCommit={(v) => commitAndSave({ trade_time: v })}
        />

        <div>
          <Label className="mb-1.5 block">Liquidity</Label>
          <Select defaultValue={trade.liquidity || undefined} onValueChange={(v) => commitAndSave({ liquidity: v })}>
            <SelectTrigger className="shadow-none"><SelectValue placeholder="Select Liquidity" /></SelectTrigger>
            <SelectContent>
              {LIQUIDITY_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block">Setup Type</Label>
          <Select defaultValue={trade.setup_type || undefined} onValueChange={(v) => commitAndSave({ setup_type: v })}>
            <SelectTrigger className="shadow-none"><SelectValue placeholder="Select Setup Type" /></SelectTrigger>
            <SelectContent>
              {SETUP_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Uncontrolled
          id="sl_size"
          label="Stop Loss Size"
          type="number"
          inputMode="decimal"
          step="0.01"
          defaultValue={trade.sl_size}
          onCommit={(v) => commitAndSave({ sl_size: parseFloat(v) || 0 })}
        />

        {/* ✅ Controlled #1 */}
        <div>
          <Label htmlFor="risk_per_trade" className="mb-1.5 block">Risk Per Trade (%)</Label>
          <Input
            id="risk_per_trade"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={String(trade.risk_per_trade ?? '')}
            className="shadow-none"
            onChange={(e) => updateTrade('risk_per_trade', parseFloat(e.target.value) || 0)}
            onBlur={() => commitAndSave({ risk_per_trade: trade.risk_per_trade })}
            required
          />
        </div>

        <div>
          <Label className="mb-1.5 block">Direction</Label>
          <Select defaultValue={trade.direction} onValueChange={(v) => commitAndSave({ direction: v as 'Long' | 'Short' })}>
            <SelectTrigger className="shadow-none"><SelectValue placeholder="Select Direction" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Long">Long</SelectItem>
              <SelectItem value="Short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ✅ Controlled #3 */}
        <div>
          <Label className="mb-1.5 block">Trade Outcome</Label>
          <Select value={trade.trade_outcome} onValueChange={(v) => commitAndSave({ trade_outcome: v as 'Win' | 'Lose' })}>
            <SelectTrigger className="shadow-none"><SelectValue placeholder="Select Outcome" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Win">Win</SelectItem>
              <SelectItem value="Lose">Lose</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ✅ Controlled #2 */}
        <div>
          <Label htmlFor="risk_reward_ratio" className="mb-1.5 block">Risk/Reward Ratio</Label>
          <Input
            id="risk_reward_ratio"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={String(trade.risk_reward_ratio ?? '')}
            className="shadow-none"
            onChange={(e) => updateTrade('risk_reward_ratio', parseFloat(e.target.value) || 0)}
            onBlur={() => commitAndSave({ risk_reward_ratio: trade.risk_reward_ratio })}
            required
          />
        </div>

        <Uncontrolled
          id="risk_reward_ratio_long"
          label="Potential Risk/Reward Ratio"
          type="number"
          inputMode="decimal"
          step="0.01"
          defaultValue={trade.risk_reward_ratio_long}
          onCommit={(v) => commitAndSave({ risk_reward_ratio_long: parseFloat(v) || 0 })}
        />

        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <Label className="mb-0">MSS</Label>
          </div>
          <Select defaultValue={trade.mss || undefined} onValueChange={(v) => commitAndSave({ mss: v })}>
            <SelectTrigger className="shadow-none"><SelectValue placeholder="Select MSS Type" /></SelectTrigger>
            <SelectContent>
              {MSS_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <Label className="mb-0">Evaluation Grade</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="w-80">
                  <div className="space-y-2 text-xs">
                    <div className="font-semibold">Evaluation Grade Guide</div>
                    <div className="rounded border bg-blue-50 p-2"><span className="font-medium">A+</span> — Perfect execution.</div>
                    <div className="rounded border bg-green-50 p-2"><span className="font-medium">A</span> — Excellent trade.</div>
                    <div className="rounded border bg-yellow-50 p-2"><span className="font-medium">B</span> — Good trade.</div>
                    <div className="rounded border bg-orange-50 p-2"><span className="font-medium">C</span> — Poor execution.</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select defaultValue={trade.evaluation || undefined} onValueChange={(v) => commitAndSave({ evaluation: v })}>
            <SelectTrigger className="shadow-none"><SelectValue placeholder="Select Grade" /></SelectTrigger>
            <SelectContent>
              {EVALUATION_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Notes (uncontrolled) */}
        <div className="md:col-span-2">
          <Label htmlFor="notes" className="mb-1.5 block">Notes</Label>
          <Textarea
            id="notes"
            ref={notesRef}
            defaultValue={trade.notes}
            rows={16}
            className="shadow-none"
            placeholder="Add any notes about this trade..."
            onBlur={(e) => commitAndSave({ notes: e.currentTarget.value })}
          />
        </div>
      </div>

      <Separator className="my-6" />

      {/* Flags (uncontrolled via defaultChecked) */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          {[
            { key: 'break_even', label: 'Break Even' },
            { key: 'reentry', label: 'Re-entry' },
            { key: 'news_related', label: 'News' },
            { key: 'local_high_low', label: 'Local High/Low' },
            { key: 'rr_hit_1_4', label: '1.4RR Hit' },
            { key: 'launch_hour', label: 'LH' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={key}
                defaultChecked={(trade as any)[key]}
                className="p-2 rounded shadow-none cursor-pointer border-slate-300 data-[state=checked]:border-slate-800"
                onCheckedChange={(checked) => commitAndSave({ [key]: Boolean(checked) } as any)}
              />
              <Label htmlFor={key} className="text-sm font-normal cursor-pointer">{label}</Label>
            </div>
          ))}

          {/* Not Executed (uncontrolled) */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="not_executed"
              defaultChecked={trade.executed === false}
              className="p-2 rounded shadow-none cursor-pointer border-slate-300 data-[state=checked]:border-slate-800"
              onCheckedChange={(checked) => commitAndSave({ executed: checked ? false : true })}
            />
            <div className="flex items-center gap-1">
              <Label htmlFor="not_executed" className="text-sm font-normal cursor-pointer">Not Executed</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 cursor-help text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="w-72">
                    <div className="text-xs">
                      <div className="mb-1 font-semibold">Not Counted in Stats</div>
                      <div className="rounded border bg-yellow-50 p-2">
                        This trade is marked as &quot;not executed&quot; and will <span className="font-semibold">not</span> be included in your statistics.
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between">
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>
            Account Balance ({selection.activeAccount.currency}):{' '}
            <span className="font-medium text-foreground">{money(accountBalance)}</span>
          </div>
          <div>
            P&amp;L:{' '}
            <span className={`font-medium ${signedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {money(signedProfit)}
            </span>
          </div>
          <div>
            P&amp;L %:{' '}
            <span className={`font-medium ${signedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {pnlPercentage.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => router.push('/trades')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Trade'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
