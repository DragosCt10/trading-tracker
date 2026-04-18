import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { renderReport } from '@/lib/server/tradeLedger/renderReport';
import { defaultReportConfig } from '@/lib/tradeLedger/reportConfig';
import { countLedgerPages } from '@/lib/server/tradeLedger/renderLedgerPagesRaw';
import type { Trade } from '@/types/trade';

const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440000';

function makeTrades(count: number): Trade[] {
  const out: Trade[] = [];
  for (let i = 0; i < count; i++) {
    const win = i % 2 === 0;
    out.push({
      id: `t-${i}`,
      user_id: 'u',
      account_id: ACCOUNT_ID,
      trade_screens: ['', '', '', ''],
      trade_time: '10:00:00',
      trade_date: '2025-01-01',
      day_of_week: 'Monday',
      market: 'EURUSD',
      setup_type: 'BOS',
      liquidity: 'Internal',
      sl_size: 10,
      direction: win ? 'Long' : 'Short',
      trade_outcome: win ? 'Win' : 'Lose',
      session: 'London',
      mss: 'Normal',
      local_high_low: false,
      quarter: 'Q2',
      evaluation: 'A',
      partials_taken: false,
      executed: true,
      launch_hour: false,
      trend: null,
      calculated_profit: win ? 100 : -80,
      risk_per_trade: 0.5,
      risk_reward_ratio: win ? 2 : 0,
      break_even: false,
      reentry: false,
      news_related: false,
    } as Trade);
  }
  return out;
}

describe('renderReport — merged pagination', () => {
  it('produces the expected page count for a small ledger', async () => {
    const rowCount = 100;
    const trades = makeTrades(rowCount);
    const cfg = defaultReportConfig(ACCOUNT_ID, 'live', {
      start: '2025-01-01',
      end: '2025-12-31',
    });

    const result = await renderReport({
      config: cfg,
      trades,
      accounts: [
        { id: ACCOUNT_ID, name: 'Acct', currency: 'USD', accountBalance: 100_000 },
      ],
      traderName: 'Tester',
      context: { via: 'download' },
    });

    const doc = await PDFDocument.load(result.pdf);
    const expectedLedgerPages = countLedgerPages(rowCount);
    // 1 cover + 1 summary + ledger pages.
    expect(doc.getPageCount()).toBe(2 + expectedLedgerPages);
  }, 30_000);

  it('survives a summary page that paginates beyond one PDF page (long footer notes)', async () => {
    // A deliberately enormous footer note forces react-pdf to spill the
    // summary onto a second PDF page — previously this would have meant
    // "Page 1 / N" was drawn on the wrong page of the merged PDF.
    const longNote = 'Compliance disclosure — '.repeat(600);
    const rowCount = 50;
    const trades = makeTrades(rowCount);
    const cfg = defaultReportConfig(ACCOUNT_ID, 'live', {
      start: '2025-01-01',
      end: '2025-12-31',
    });
    cfg.sections.footerNotes = longNote;

    const result = await renderReport({
      config: cfg,
      trades,
      accounts: [
        { id: ACCOUNT_ID, name: 'Acct', currency: 'USD', accountBalance: 100_000 },
      ],
      traderName: 'Tester',
      context: { via: 'download' },
    });

    const doc = await PDFDocument.load(result.pdf);
    const total = doc.getPageCount();
    // Ledger should still map cleanly: the last `countLedgerPages(...)`
    // pages are ledger pages, everything before is cover + summary.
    const ledgerPages = countLedgerPages(rowCount);
    expect(total).toBeGreaterThanOrEqual(2 + ledgerPages);
    // Per-page size sanity: every page is A4 portrait (595 x 842 pt).
    for (const page of doc.getPages()) {
      const { width, height } = page.getSize();
      expect(width).toBeCloseTo(595, 0);
      expect(height).toBeCloseTo(842, 0);
    }
  }, 30_000);

  it('always starts the ledger on its own page, even for tiny ledgers', async () => {
    // Invariant: the ledger begins on a fresh page regardless of row count —
    // matches conventional financial-statement layout and keeps the merge
    // boundary between react-pdf (summary) and raw pdfkit (ledger) clean.
    // 3 trades would visually fit at the bottom of the summary page; assert
    // we still get a dedicated ledger page.
    const rowCount = 3;
    const trades = makeTrades(rowCount);
    const cfg = defaultReportConfig(ACCOUNT_ID, 'live', {
      start: '2025-01-01',
      end: '2025-12-31',
    });

    const result = await renderReport({
      config: cfg,
      trades,
      accounts: [
        { id: ACCOUNT_ID, name: 'Acct', currency: 'USD', accountBalance: 100_000 },
      ],
      traderName: 'Tester',
      context: { via: 'download' },
    });

    const doc = await PDFDocument.load(result.pdf);
    // Cover + summary + exactly 1 ledger page for 3 rows.
    expect(doc.getPageCount()).toBe(3);
    expect(countLedgerPages(rowCount)).toBe(1);
  }, 30_000);

  it('handles empty ledger with a single "no trades" page', async () => {
    const cfg = defaultReportConfig(ACCOUNT_ID, 'live', {
      start: '2025-01-01',
      end: '2025-12-31',
    });

    const result = await renderReport({
      config: cfg,
      trades: [],
      accounts: [
        { id: ACCOUNT_ID, name: 'Acct', currency: 'USD', accountBalance: 100_000 },
      ],
      traderName: 'Tester',
      context: { via: 'download' },
    });

    const doc = await PDFDocument.load(result.pdf);
    // 1 cover + 1 summary + 1 empty-ledger page.
    expect(doc.getPageCount()).toBe(3);
  }, 30_000);
});
