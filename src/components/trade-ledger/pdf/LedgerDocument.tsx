import { Document, Page, Text, View } from '@react-pdf/renderer';
import { pdfFonts, pdfStyles } from './pdfStyles';
import { ModeBadge } from './Watermark';
import { PdfLogo } from './PdfLogo';
import { CoverPage } from './sections/CoverPage';
import { AccountSummary } from './sections/AccountSummary';
import { StatsGrid, type StatsGridItem } from './sections/StatsGrid';
import { formatPdfCurrency, formatPdfPercent, formatPdfPeriod } from './pdfHelpers';
import type { LedgerRow, LedgerTotals } from '@/utils/tradeLedger/buildRunningBalance';
import type { MacroStats, Stats } from '@/types/dashboard';
import type { ReportConfig } from '@/lib/tradeLedger/reportConfig';

/**
 * Renders ONLY the styled summary portion of the report (cover page + summary
 * with stats and key metrics). The transaction ledger itself is drawn directly
 * to pdfkit in `renderLedgerPagesRaw.ts` — ~20x faster at scale — and merged
 * into the final PDF by `renderReport.ts`.
 *
 * Page numbers are deliberately omitted here; they are drawn by `renderReport`
 * after the merge so the numbering spans the combined document.
 */

export interface PerAccountLedger {
  accountId: string;
  accountLabel: string;
  rows: LedgerRow[];
  totals: LedgerTotals;
}

export interface LedgerDocumentProps {
  config: ReportConfig;
  accountLabel: string;
  traderName: string;
  currency: string;
  totals: LedgerTotals;
  ledgerRows: LedgerRow[];
  /** Populated when config.accountIds.length > 1 — per-account sub-tables. */
  perAccountLedgers?: PerAccountLedger[];
  stats: Stats;
  macroStats: MacroStats;
  /** Resolved stat picks, already grouped by category. */
  statSections: Array<{ title: string; items: StatsGridItem[] }>;
  /** Custom stats the user picked. */
  customStatsItems: StatsGridItem[];
  integrity: {
    hashHex: string;
    referenceCode: string;
    generatedAt: Date;
  };
  context: { via: 'download' | 'share' };
}

export function LedgerDocument(props: LedgerDocumentProps) {
  const {
    config,
    accountLabel,
    traderName,
    currency,
    totals,
    stats,
    macroStats,
    statSections,
    customStatsItems,
    integrity,
    context,
  } = props;

  const heroStats: Array<{ label: string; value: string }> = [
    { label: 'Net P&L', value: formatPdfCurrency(totals.realizedPnL, currency) },
    { label: 'Win rate', value: formatPdfPercent(stats.winRate) },
    { label: 'R total', value: `${macroStats.multipleR.toFixed(2)}R` },
    { label: 'Trades', value: String(stats.totalTrades) },
  ];

  return (
    <Document title={`Alpha Stats — Trade Ledger ${integrity.referenceCode}`}>
      <Page size="A4" style={pdfStyles.page}>
        <CoverPage
          traderName={traderName}
          accountLabel={accountLabel}
          period={config.period}
          heroStats={heroStats}
          generatedAt={integrity.generatedAt}
          referenceCode={integrity.referenceCode}
          mode={config.mode}
          markets={config.markets}
        />
        <PageFooter integrity={integrity} context={context} />
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <Header
          accountLabel={accountLabel}
          period={config.period}
          referenceCode={integrity.referenceCode}
          generatedAt={integrity.generatedAt}
          mode={config.mode}
        />

        <AccountSummary totals={totals} currency={currency} />

        {statSections.map((sec) => (
          <StatsGrid key={sec.title} title={sec.title} items={sec.items} />
        ))}

        {customStatsItems.length > 0 && (
          <StatsGrid title="Custom Stats" items={customStatsItems} />
        )}

        {config.sections.keyMetricsBullets && (
          <KeyMetrics
            stats={stats}
            macroStats={macroStats}
            currency={currency}
            totals={totals}
          />
        )}

        {config.sections.footerNotes && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.5 }}>
              {config.sections.footerNotes}
            </Text>
          </View>
        )}

        <PageFooter integrity={integrity} context={context} />
      </Page>
    </Document>
  );
}

interface HeaderProps {
  accountLabel: string;
  period: { start: string; end: string };
  referenceCode: string;
  generatedAt: Date;
  mode: 'live' | 'demo' | 'backtesting';
}

function Header(props: HeaderProps) {
  return (
    <View style={pdfStyles.headerBand} fixed>
      <View style={pdfStyles.headerLeft}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <PdfLogo size={16} />
          <Text style={pdfStyles.brand}>AlphaStats</Text>
          <ModeBadge mode={props.mode} />
        </View>
        <Text style={pdfStyles.smallMuted}>{props.accountLabel}</Text>
      </View>
      <View style={pdfStyles.headerCenter}>
        <Text style={pdfStyles.smallMuted}>Statement period</Text>
        <Text style={{ fontSize: 10, fontFamily: pdfFonts.bold, marginTop: 2 }}>
          {formatPdfPeriod(props.period.start, props.period.end)}
        </Text>
      </View>
      <View style={pdfStyles.headerRight}>
        <Text style={pdfStyles.smallMuted}>Reference</Text>
        <Text style={{ fontSize: 8, marginTop: 2 }}>{props.referenceCode}</Text>
        <Text style={[pdfStyles.smallMuted, { marginTop: 2 }]}>
          {props.generatedAt.toISOString().slice(0, 10)}
        </Text>
      </View>
    </View>
  );
}

function KeyMetrics(props: {
  stats: Stats;
  macroStats: MacroStats;
  currency: string;
  totals: LedgerTotals;
}) {
  const items: StatsGridItem[] = [
    { label: 'Win rate', formatted: formatPdfPercent(props.stats.winRate) },
    {
      label: 'Average profit',
      formatted: formatPdfCurrency(props.stats.averageProfit, props.currency),
    },
    { label: 'Profit factor', formatted: props.macroStats.profitFactor.toFixed(2) },
    { label: 'Sharpe (incl. BE)', formatted: props.macroStats.sharpeWithBE.toFixed(2) },
    {
      label: 'Max drawdown',
      formatted: `${props.stats.maxDrawdown.toFixed(2)}%`,
    },
    {
      label: 'Best streak',
      formatted: String(props.stats.maxWinningStreak),
    },
  ];
  return <StatsGrid title="Key Metrics" items={items} />;
}

function PageFooter(props: {
  integrity: { hashHex: string; referenceCode: string };
  context: { via: 'download' | 'share' };
}) {
  const disclaimer =
    props.context.via === 'share'
      ? 'Alpha Stats — shared statement. For review only. The integrity hash covers the data depicted.'
      : 'Alpha Stats — personal trading record. For your records only. The integrity hash covers the data depicted.';

  return (
    <View style={pdfStyles.footerBand} fixed>
      <Text>{disclaimer}</Text>
      <Text>SHA-256: {props.integrity.hashHex.slice(0, 16)}…</Text>
    </View>
  );
}
