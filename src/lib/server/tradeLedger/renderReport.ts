import { renderToBuffer } from '@react-pdf/renderer';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pdfFonts } from '@/components/trade-ledger/pdf/pdfStyles';
import { computeAllDashboardStats } from '@/utils/computeAllDashboardStats';
import { buildRunningBalance } from '@/utils/tradeLedger/buildRunningBalance';
import {
  calculateAverageDrawdown,
  calculateAvgWinLoss,
  calculateExpectancy,
  computeRecoveryFactorAndDrawdownCount,
} from '@/utils/analyticsCalculations';
import {
  buildCanonicalPayload,
  buildReferenceCode,
  sha256Hex,
} from '@/lib/tradeLedger/integrityHash';
import {
  SECTION_CATEGORIES,
  SECTION_REGISTRY_BY_ID,
  type SectionCategoryId,
  type StatExtras,
} from '@/lib/tradeLedger/sectionRegistry';
import type { ReportConfig } from '@/lib/tradeLedger/reportConfig';
import type { MacroStats, Stats } from '@/types/dashboard';
import type { Trade } from '@/types/trade';
import { LedgerDocument, type PerAccountLedger } from '@/components/trade-ledger/pdf/LedgerDocument';
import type { StatsGridItem } from '@/components/trade-ledger/pdf/sections/StatsGrid';
import {
  countLedgerPages,
  renderLedgerPagesRaw,
} from './renderLedgerPagesRaw';

export interface AccountMeta {
  id: string;
  name: string;
  currency: string;
  accountBalance: number;
}

export interface RenderReportInput {
  config: ReportConfig;
  trades: Trade[];
  accounts: AccountMeta[];
  traderName: string;
  customStatsItems?: StatsGridItem[];
  context: { via: 'download' | 'share' };
  /** Optional — if supplied, used in the reference code. Defaults to 1. */
  seqForDay?: number;
}

export interface RenderReportOutput {
  pdf: Buffer;
  hashHex: string;
  referenceCode: string;
  generatedAt: string; // ISO
  tradeIds: string[];
}

/**
 * Server-side PDF render. Pure-ish: given inputs it produces a PDF buffer +
 * hash metadata. No Supabase calls, no auth — the caller (API route or share
 * creation action) is responsible for that.
 */
export async function renderReport(
  input: RenderReportInput,
): Promise<RenderReportOutput> {
  const {
    config,
    trades,
    accounts,
    traderName,
    customStatsItems = [],
    context,
    seqForDay = 1,
  } = input;

  const accountsById = new Map(accounts.map((a) => [a.id, a]));
  const primary = accountsById.get(config.accountIds[0]);
  if (!primary) {
    throw new Error(
      `TradeLedger: primary account ${config.accountIds[0]} not found`,
    );
  }
  const currency = primary.currency;

  // ── 1. Aggregate stats via existing pipeline ─────────────────────────
  const aggregateBalance = accounts.reduce((s, a) => s + a.accountBalance, 0);
  const apiResponse = computeAllDashboardStats(
    trades,
    aggregateBalance,
    'executed',
    'all',
  );
  const executedTrades = trades.filter((t) => t.executed === true);
  const averageDrawdown = calculateAverageDrawdown(executedTrades, aggregateBalance);
  const stats = adaptStats(apiResponse, averageDrawdown);
  const macroStats = adaptMacro(apiResponse);

  // Extras not surfaced directly by computeAllDashboardStats — computed once
  // here so the registry can stay a pure projection over `stats` / `macroStats`
  // plus this sidecar bundle.
  const avgWL = calculateAvgWinLoss(executedTrades);
  const expectancy = calculateExpectancy(executedTrades);
  const { recoveryFactor } = computeRecoveryFactorAndDrawdownCount({
    averagePnLPercentage: stats.averagePnLPercentage,
    maxDrawdown: stats.maxDrawdown,
    drawdownCount: stats.drawdownCount,
  });
  const extras: StatExtras = {
    avgWin: avgWL.avgWin,
    avgLoss: avgWL.avgLoss,
    winLossRatio: avgWL.winLossRatio,
    expectancy: expectancy.expectancy,
    expectancyNormalized: expectancy.normalized,
    recoveryFactor,
  };

  // ── 2. Running balance (and per-account sub-tables in consolidated mode) ─
  const { rows, totals } = buildRunningBalance(trades, aggregateBalance);

  let perAccountLedgers: PerAccountLedger[] | undefined;
  if (config.accountIds.length > 1) {
    perAccountLedgers = config.accountIds.map((id) => {
      const meta = accountsById.get(id);
      if (!meta) throw new Error(`TradeLedger: account ${id} not found`);
      const subset = trades.filter((t) => t.account_id === id);
      const per = buildRunningBalance(subset, meta.accountBalance);
      return {
        accountId: id,
        accountLabel: meta.name,
        rows: per.rows,
        totals: per.totals,
      };
    });
  }

  // ── 3. Resolve selected stats from registry ──────────────────────────
  const statSections: Array<{ title: string; items: StatsGridItem[] }> = [];
  for (const cat of SECTION_CATEGORIES) {
    const sectionKey = cat.id as SectionCategoryId;
    const conf = config.sections[sectionKey];
    if (!conf.enabled || conf.picks.length === 0) continue;

    const items: StatsGridItem[] = [];
    for (const statId of conf.picks) {
      const def = SECTION_REGISTRY_BY_ID[statId];
      if (!def) continue; // dangling ref — silent skip
      try {
        const out = def.extract({ stats, macroStats, currency, extras });
        items.push({ label: def.label, formatted: out.formatted });
      } catch {
        // A single bad extract doesn't kill the whole report.
      }
    }
    if (items.length > 0) {
      statSections.push({ title: cat.label, items });
    }
  }

  // ── 4. Integrity hash ─────────────────────────────────────────────────
  const tradeIds = trades
    .map((t) => t.id)
    .filter((id): id is string => typeof id === 'string');
  const generatedAt = new Date();
  const canonical = buildCanonicalPayload(config, tradeIds, generatedAt);
  const hashHex = await sha256Hex(canonical);
  const referenceCode = buildReferenceCode(hashHex, generatedAt, seqForDay);

  // ── 5. Account label (multi-account aware) ────────────────────────────
  const accountLabel =
    config.accountIds.length === 1
      ? `${primary.name} · ${currency}`
      : `${config.accountIds.length} accounts · ${currency}`;

  // ── 6. Render styled pages (cover + summary) via react-pdf ─────────────
  const summaryBuf = await renderToBuffer(
    LedgerDocument({
      config,
      accountLabel,
      traderName,
      currency,
      totals,
      ledgerRows: rows,
      perAccountLedgers,
      stats,
      macroStats,
      statSections,
      customStatsItems,
      integrity: { hashHex, referenceCode, generatedAt },
      context,
    }),
  );

  // ── 7. Render ledger pages via raw pdfkit ──────────────────────────────
  // Pre-compute page counts so we can number pages consistently across the
  // merged document without a post-pass.
  const summaryDoc = await PDFDocument.load(summaryBuf);
  const summaryPageCount = summaryDoc.getPageCount();

  const showPerAccountSubTables =
    (perAccountLedgers?.length ?? 0) > 1 && config.accountIds.length > 1;

  const mainLedgerPageCount = countLedgerPages(rows.length);
  const subLedgerPageCounts = showPerAccountSubTables
    ? perAccountLedgers!.map((pal) => countLedgerPages(pal.rows.length))
    : [];
  const totalPages =
    summaryPageCount +
    mainLedgerPageCount +
    subLedgerPageCounts.reduce((s, n) => s + n, 0);

  const footerLeft =
    context.via === 'share'
      ? 'Alpha Stats — shared statement. For review only.'
      : 'Alpha Stats — personal trading record.';
  const footerRight = `SHA-256: ${hashHex.slice(0, 16)}…`;

  const ledgerBuffers: Buffer[] = [];
  let pageCursor = summaryPageCount + 1;

  if (showPerAccountSubTables) {
    const consolidated = await renderLedgerPagesRaw({
      rows,
      totals,
      currency,
      title: 'Transaction Ledger — Consolidated',
      footerLeft,
      footerRight,
      pageOffset: pageCursor,
      totalPages,
    });
    ledgerBuffers.push(consolidated.pdf);
    pageCursor += consolidated.pageCount;

    for (let i = 0; i < perAccountLedgers!.length; i++) {
      const pal = perAccountLedgers![i];
      const sub = await renderLedgerPagesRaw({
        rows: pal.rows,
        totals: pal.totals,
        currency,
        title: `Transaction Ledger — ${pal.accountLabel}`,
        footerLeft,
        footerRight,
        pageOffset: pageCursor,
        totalPages,
      });
      ledgerBuffers.push(sub.pdf);
      pageCursor += sub.pageCount;
    }
  } else {
    const single = await renderLedgerPagesRaw({
      rows,
      totals,
      currency,
      title: 'Transaction Ledger',
      footerLeft,
      footerRight,
      pageOffset: pageCursor,
      totalPages,
    });
    ledgerBuffers.push(single.pdf);
  }

  // ── 8. Merge into final PDF ────────────────────────────────────────────
  const merged = await PDFDocument.create();
  const stampFont = await merged.embedFont(resolveStandardFont(pdfFonts.regular));

  // Copy summary pages and stamp page numbers on each. This is the only place
  // the cover + summary get page numbers — react-pdf can't know the final
  // total (which spans the raw ledger), so we do it here after the merge.
  const copiedSummary = await merged.copyPages(summaryDoc, summaryDoc.getPageIndices());
  copiedSummary.forEach((page, i) => {
    merged.addPage(page);
    const { width } = page.getSize();
    page.drawText(`Page ${i + 1} / ${totalPages}`, {
      x: width - 120,
      y: 20,
      size: 7,
      font: stampFont,
      color: rgb(0.42, 0.45, 0.50),
    });
  });

  for (const buf of ledgerBuffers) {
    const doc = await PDFDocument.load(buf);
    const copied = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of copied) merged.addPage(page);
  }

  const pdf = Buffer.from(await merged.save());

  return {
    pdf,
    hashHex,
    referenceCode,
    generatedAt: generatedAt.toISOString(),
    tradeIds,
  };
}

/**
 * Maps the shared `pdfFonts` family name (used by both the react-pdf style
 * sheet and the raw-pdfkit ledger) to a pdf-lib StandardFonts enum for the
 * post-merge page-number stamp. Keeps the three render paths aligned on
 * whichever font the brand uses.
 *
 * If `pdfFonts` ever moves off the pdfkit built-ins (Helvetica/Courier/
 * Times), the caller must embed custom font bytes via `merged.embedFont(...)`
 * instead — extend this mapping at that point.
 */
function resolveStandardFont(family: string): StandardFonts {
  switch (family) {
    case 'Helvetica':        return StandardFonts.Helvetica;
    case 'Helvetica-Bold':   return StandardFonts.HelveticaBold;
    case 'Helvetica-Oblique':return StandardFonts.HelveticaOblique;
    case 'Times-Roman':      return StandardFonts.TimesRoman;
    case 'Times-Bold':       return StandardFonts.TimesRomanBold;
    case 'Courier':          return StandardFonts.Courier;
    case 'Courier-Bold':     return StandardFonts.CourierBold;
    default:
      throw new Error(
        `TradeLedger: pdfFonts family "${family}" is not a pdfkit built-in. ` +
          `Embed the TTF via merged.embedFont(bytes) or extend resolveStandardFont.`,
      );
  }
}

// ── adapters: wire shape → dashboard types ─────────────────────────────

type ApiResponse = ReturnType<typeof computeAllDashboardStats>;

function adaptStats(r: ApiResponse, averageDrawdown: number): Stats {
  return {
    totalTrades: r.core.totalTrades,
    totalWins: r.core.totalWins,
    totalLosses: r.core.totalLosses,
    winRate: r.core.winRate,
    totalProfit: r.core.totalProfit,
    averageProfit: r.core.averageProfit,
    intervalStats: {},
    maxDrawdown: r.maxDrawdown,
    averageDrawdown,
    averagePnLPercentage: r.core.averagePnLPercentage,
    evaluationStats: [],
    winRateWithBE: r.core.winRateWithBE,
    beWins: r.core.beWins,
    beLosses: r.core.beLosses,
    currentStreak: r.currentStreak,
    maxWinningStreak: r.maxWinningStreak,
    maxLosingStreak: r.maxLosingStreak,
    averageDaysBetweenTrades: r.core.averageDaysBetweenTrades,
    partialWinningTrades: r.partials.partialWinningTrades ?? 0,
    partialLosingTrades: r.partials.partialLosingTrades ?? 0,
    partialBETrades: r.partials.partialBETrades ?? 0,
    totalPartialTradesCount: r.partials.totalPartialTradesCount ?? 0,
    totalPartialsBECount: r.partials.totalPartialsBECount ?? 0,
    tradeQualityIndex: r.tradeQualityIndex,
    multipleR: r.multipleR,
    drawdownCount: r.drawdownCount ?? 0,
  };
}

function adaptMacro(r: ApiResponse): MacroStats {
  return {
    profitFactor: r.macro.profitFactor,
    consistencyScore: r.macro.consistencyScore,
    consistencyScoreWithBE: r.macro.consistencyScoreWithBE,
    sharpeWithBE: r.sharpeWithBE,
    tradeQualityIndex: r.tradeQualityIndex,
    multipleR: r.multipleR,
  };
}
