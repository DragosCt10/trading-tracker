// @ts-expect-error — @react-pdf/pdfkit ships JS only; we use its pdfkit-compatible API.
import PDFDocument from '@react-pdf/pdfkit';
import { pdfFonts } from '@/components/trade-ledger/pdf/pdfStyles';
import type { LedgerRow, LedgerTotals } from '@/utils/tradeLedger/buildRunningBalance';

/**
 * Narrow subset of the pdfkit API we rely on. Enough to keep this file
 * type-safe without pulling in @types/pdfkit (the package ships no types
 * of its own).
 */
interface DrawDoc {
  addPage(opts?: { size?: string; margin?: number }): DrawDoc;
  fontSize(n: number): DrawDoc;
  font(name: string): DrawDoc;
  fillColor(color: string): DrawDoc;
  strokeColor(color: string): DrawDoc;
  lineWidth(w: number): DrawDoc;
  text(
    text: string,
    x: number,
    y: number,
    opts?: { width?: number; align?: 'left' | 'right' | 'center'; lineBreak?: boolean; characterSpacing?: number },
  ): DrawDoc;
  rect(x: number, y: number, w: number, h: number): DrawDoc;
  fill(color?: string): DrawDoc;
  stroke(): DrawDoc;
  moveTo(x: number, y: number): DrawDoc;
  lineTo(x: number, y: number): DrawDoc;
  save(): DrawDoc;
  restore(): DrawDoc;
  end(): void;
  on(event: 'data' | 'end' | 'error', cb: (arg?: unknown) => void): void;
}

/**
 * Raw-pdfkit ledger renderer. ~20x faster than react-pdf for this specific
 * table because there is no React reconciliation and no Yoga flex layout —
 * rows are drawn into a fixed grid. Emits a standalone PDF Buffer that the
 * caller merges into the final document via pdf-lib.
 *
 * Column layout for A4 portrait with 36pt side padding:
 *                x      w     align
 *   Date/Time    36     104   left
 *   Market      144     70    left
 *   Side        218     44    left
 *   Risk%       268     44    right
 *   R           316     40    right
 *   P&L         360     94    right
 *   Balance     458    101    right
 */

const PAGE_H = 842; // A4 portrait
const PAGE_W = 595;
const MARGIN_TOP = 36;
const MARGIN_BOTTOM = 48; // leaves room for page number + SHA
const ROW_H = 11;
const TITLE_H = 18;
const HEADER_H = 14;
const FOOTER_TOP = PAGE_H - MARGIN_BOTTOM + 8;

const COLS: Array<{ x: number; w: number; align?: 'right' }> = [
  { x: 36,  w: 104 },
  { x: 144, w: 70 },
  { x: 218, w: 44 },
  { x: 268, w: 44, align: 'right' },
  { x: 316, w: 40, align: 'right' },
  { x: 360, w: 94, align: 'right' },
  { x: 458, w: 101, align: 'right' },
];

// "Risk" is dual-purpose: for standard trades it shows risk_per_trade as a
// percent (e.g. "0.50%"); for futures trades it shows the contract count with
// a "×" suffix (e.g. "5×"). Detection is per-row via `num_contracts > 0`.
const LABELS = ['Date / Time', 'Market', 'Side', 'Risk', 'R', 'P&L', 'Running Balance'];

const INK = '#111827';
const MUTED = '#6B7280';
const DIVIDER = '#E5E7EB';
const SURFACE = '#F9FAFB';
const SUCCESS = '#047857';
const DANGER = '#B91C1C';

const ROWS_PER_PAGE = Math.floor(
  (PAGE_H - MARGIN_TOP - MARGIN_BOTTOM - TITLE_H - HEADER_H) / ROW_H,
);

export interface RenderLedgerPagesRawInput {
  rows: LedgerRow[];
  totals: LedgerTotals;
  currency: string;
  /** Title above the table. e.g. "Transaction Ledger" or "Transaction Ledger — Consolidated". */
  title: string;
  /** Shown bottom-left on each page for continuity with the summary page. */
  footerLeft: string;
  /** Shown bottom-right on each page (short hash). */
  footerRight: string;
  /** Where this ledger starts in the final merged PDF (1-indexed). Controls page numbering. */
  pageOffset: number;
  /** Total pages in the final merged PDF (for "Page X / Y"). */
  totalPages: number;
}

export interface RenderLedgerPagesRawOutput {
  pdf: Buffer;
  pageCount: number;
}

/**
 * Pre-computes the number of PDF pages this ledger will consume without
 * actually rendering. Used by the caller to determine totalPages before
 * calling render, so page numbers are consistent.
 */
export function countLedgerPages(rowCount: number): number {
  if (rowCount === 0) return 1;
  return Math.ceil(rowCount / ROWS_PER_PAGE);
}

export async function renderLedgerPagesRaw(
  input: RenderLedgerPagesRawInput,
): Promise<RenderLedgerPagesRawOutput> {
  const { rows, totals, currency, title, footerLeft, footerRight, pageOffset, totalPages } = input;

  const currencyFmt = new Intl.NumberFormat(undefined, {
    style: 'currency', currency, maximumFractionDigits: 2,
  });

  const DocCtor = PDFDocument as unknown as new (opts: Record<string, unknown>) => DrawDoc;
  const doc = new DocCtor({ size: 'A4', margin: 0, info: { Title: title } });

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (e) => reject(e));
  });

  if (rows.length === 0) {
    drawPageChrome(doc, title, footerLeft, footerRight, pageOffset, totalPages, true);
    doc.fillColor(MUTED).fontSize(9).font('Helvetica')
      .text('No trades executed in this period.', 36, MARGIN_TOP + TITLE_H + 24, {
        width: PAGE_W - 72, align: 'center', lineBreak: false,
      });
    doc.end();
    const buf = await done;
    return { pdf: buf, pageCount: 1 };
  }

  const totalLedgerPages = Math.ceil(rows.length / ROWS_PER_PAGE);

  for (let pageIdx = 0; pageIdx < totalLedgerPages; pageIdx++) {
    const isFirst = pageIdx === 0;
    const isLast = pageIdx === totalLedgerPages - 1;
    if (!isFirst) doc.addPage({ size: 'A4', margin: 0 });

    drawPageChrome(doc, title, footerLeft, footerRight, pageOffset + pageIdx, totalPages, isFirst);

    // Column header row
    const headerY = MARGIN_TOP + (isFirst ? TITLE_H : 0);
    doc.save()
      .rect(36, headerY - 2, PAGE_W - 72, HEADER_H)
      .fill(SURFACE)
      .restore();
    doc.font(pdfFonts.bold).fontSize(8).fillColor(MUTED);
    for (let c = 0; c < COLS.length; c++) {
      doc.text(LABELS[c], COLS[c].x, headerY + 1, {
        width: COLS[c].w,
        align: COLS[c].align,
        lineBreak: false,
      });
    }

    // Rows
    const startRow = pageIdx * ROWS_PER_PAGE;
    const endRow = Math.min(startRow + ROWS_PER_PAGE, rows.length);
    let y = headerY + HEADER_H;

    doc.font(pdfFonts.regular).fontSize(8);
    for (let i = startRow; i < endRow; i++) {
      const row = rows[i];
      const t = row.trade;
      const zebra = i % 2 === 1;
      if (zebra) {
        doc.save().rect(36, y - 1, PAGE_W - 72, ROW_H).fill(SURFACE).restore();
      }

      // Cell values
      const date = t.trade_date ?? '';
      const time = t.trade_time ? t.trade_time.slice(0, 5) : '';
      const dateStr = time ? `${date} ${time}` : date;
      // Risk column: futures trades render contract count (e.g. "5×"); standard
      // trades render risk_per_trade percent. Detection via num_contracts since
      // standard trades store it as null and futures always set it at write time.
      const isFuturesRow = typeof t.num_contracts === 'number' && t.num_contracts > 0;
      const riskCell = isFuturesRow
        ? `${Math.trunc(t.num_contracts as number)}×`
        : `${(typeof t.risk_per_trade === 'number' ? t.risk_per_trade : 0).toFixed(2)}%`;
      const rMult =
        typeof t.risk_reward_ratio === 'number'
          ? (t.trade_outcome === 'Lose' ? -1 : t.risk_reward_ratio)
          : 0;
      const pnlColor = row.delta > 0 ? SUCCESS : row.delta < 0 ? DANGER : MUTED;

      doc.fillColor(INK);
      doc.text(dateStr, COLS[0].x, y, { width: COLS[0].w, lineBreak: false });
      doc.text(t.market ?? '—', COLS[1].x, y, { width: COLS[1].w, lineBreak: false });
      doc.text(t.direction ?? '—', COLS[2].x, y, { width: COLS[2].w, lineBreak: false });
      doc.text(riskCell, COLS[3].x, y, {
        width: COLS[3].w, align: 'right', lineBreak: false,
      });
      doc.text(`${rMult.toFixed(1)}R`, COLS[4].x, y, {
        width: COLS[4].w, align: 'right', lineBreak: false,
      });
      doc.fillColor(pnlColor).text(currencyFmt.format(row.delta), COLS[5].x, y, {
        width: COLS[5].w, align: 'right', lineBreak: false,
      });
      doc.fillColor(INK).text(currencyFmt.format(row.runningBalance), COLS[6].x, y, {
        width: COLS[6].w, align: 'right', lineBreak: false,
      });

      y += ROW_H;
    }

    // Totals row on the last page
    if (isLast) {
      doc.save()
        .moveTo(36, y + 1).lineTo(PAGE_W - 36, y + 1)
        .strokeColor(INK).lineWidth(1).stroke()
        .restore();
      y += 6;
      const pnlColor = totals.realizedPnL > 0 ? SUCCESS : totals.realizedPnL < 0 ? DANGER : MUTED;
      doc.font(pdfFonts.bold).fontSize(8).fillColor(INK)
        .text(`Totals (${totals.tradeCount})`, COLS[0].x, y, {
          width: COLS[0].w, lineBreak: false,
        });
      doc.fillColor(pnlColor).text(currencyFmt.format(totals.realizedPnL), COLS[5].x, y, {
        width: COLS[5].w, align: 'right', lineBreak: false,
      });
      doc.fillColor(INK).text(currencyFmt.format(totals.closingBalance), COLS[6].x, y, {
        width: COLS[6].w, align: 'right', lineBreak: false,
      });
    }
  }

  doc.end();
  const buf = await done;
  return { pdf: buf, pageCount: totalLedgerPages };
}

function drawPageChrome(
  doc: DrawDoc,
  title: string,
  footerLeft: string,
  footerRight: string,
  pageNumber: number,
  totalPages: number,
  showTitle: boolean,
) {
  if (showTitle) {
    doc.font(pdfFonts.bold).fontSize(9).fillColor(MUTED);
    doc.text(title.toUpperCase(), 36, MARGIN_TOP, {
      width: PAGE_W - 72, characterSpacing: 0.8, lineBreak: false,
    });
  }

  // Footer divider
  doc.save()
    .moveTo(36, FOOTER_TOP - 2).lineTo(PAGE_W - 36, FOOTER_TOP - 2)
    .strokeColor(DIVIDER).lineWidth(1).stroke()
    .restore();

  doc.font(pdfFonts.regular).fontSize(7).fillColor(MUTED);
  doc.text(footerLeft, 36, FOOTER_TOP + 2, {
    width: PAGE_W - 300, lineBreak: false,
  });
  doc.text(footerRight, PAGE_W - 260, FOOTER_TOP + 2, {
    width: 120, align: 'right', lineBreak: false,
  });
  doc.text(`Page ${pageNumber} / ${totalPages}`, PAGE_W - 120, FOOTER_TOP + 2, {
    width: 84, align: 'right', lineBreak: false,
  });
}
