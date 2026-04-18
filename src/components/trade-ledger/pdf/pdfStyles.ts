import { StyleSheet } from '@react-pdf/renderer';

/**
 * Design tokens for the Trade Ledger PDF. Deliberately small — Helvetica
 * built-in, grayscale core, one accent. Tabular numerals on numeric columns
 * to prevent ledger-row jitter.
 */
/**
 * Brand colors match Alpha Stats default themed primary (purple-500).
 * Aligns PDF output with the app's `--tc-primary` token so the brand reads as
 * one system — the PDF renderer can't read CSS vars server-side, so we pin
 * the default theme here.
 */
export const pdfColors = {
  ink: '#111827',
  muted: '#6B7280',
  subtle: '#9CA3AF',
  divider: '#E5E7EB',
  surface: '#F9FAFB',
  accent: '#a855f7',       // --tc-primary (purple-500)
  accentEnd: '#c026d3',    // --tc-accent-end (fuchsia-600)
  success: '#047857',
  danger: '#B91C1C',
  watermark: '#F1F5F9',
};

/**
 * Shared font-family names — consumed by both the react-pdf style sheet
 * (below) and the raw-pdfkit ledger renderer. Kept here so a brand-font
 * swap happens in one place and the two render paths stay visually aligned.
 * Any substitute must be either a pdfkit built-in or registered with
 * `doc.registerFont()` on the raw side and added to react-pdf's Font registry.
 */
export const pdfFonts = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
} as const;

export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: pdfFonts.regular,
    fontSize: 9,
    color: pdfColors.ink,
    lineHeight: 1.4,
  },

  // ── Header band ──
  headerBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.divider,
    marginBottom: 14,
  },
  headerLeft: { flexDirection: 'column' },
  headerCenter: { flexDirection: 'column', alignItems: 'center' },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end' },
  brand: {
    fontSize: 14,
    fontFamily: pdfFonts.bold,
    // Matches Navbar's `tracking-widest` (0.1em) on the `AlphaStats` wordmark.
    letterSpacing: 1.4,
  },
  brandAccent: { color: pdfColors.accent },
  smallMuted: { fontSize: 8, color: pdfColors.muted },

  // ── Cover page ──
  coverPage: {
    paddingTop: 72,
    paddingHorizontal: 48,
    fontFamily: pdfFonts.regular,
    color: pdfColors.ink,
  },
  coverTitle: {
    fontSize: 36,
    fontFamily: pdfFonts.bold,
    letterSpacing: -0.5,
    lineHeight: 1.1,
  },
  coverSubtitle: {
    fontSize: 14,
    color: pdfColors.muted,
    marginBottom: 56,
  },
  coverAccount: {
    fontSize: 13,
    color: pdfColors.muted,
    lineHeight: 1.3,
  },
  coverPeriod: {
    fontSize: 12,
    color: pdfColors.subtle,
    lineHeight: 1.3,
  },
  coverHeroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 40,
  },
  coverHeroCell: {
    width: '50%',
    paddingVertical: 16,
    paddingRight: 16,
  },
  coverHeroLabel: {
    fontSize: 9,
    color: pdfColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  coverHeroValue: {
    fontSize: 28,
    fontFamily: pdfFonts.bold,
    letterSpacing: -0.5,
  },
  coverMeta: {
    marginTop: 72,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: pdfColors.divider,
  },
  coverMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 9,
    color: pdfColors.muted,
  },

  // ── Section ──
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: pdfFonts.bold,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: pdfColors.muted,
  },

  // ── Table ──
  table: { borderTopWidth: 1, borderTopColor: pdfColors.divider },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: pdfColors.surface,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.divider,
    fontSize: 8,
    fontFamily: pdfFonts.bold,
    color: pdfColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.divider,
  },
  tableRowAlt: { backgroundColor: pdfColors.surface },
  tableTotalsRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: pdfColors.ink,
    fontFamily: pdfFonts.bold,
  },
  cell: { fontSize: 8 },
  cellBold: { fontSize: 8, fontFamily: pdfFonts.bold },
  cellRight: { textAlign: 'right' },
  cellNumeric: {
    fontSize: 8,
    textAlign: 'right',
    // tabular figures for alignment
    fontFeatureSettings: '"tnum"',
  },

  // ── Stats grid ──
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statsCell: {
    width: '33.33%',
    paddingVertical: 8,
    paddingRight: 12,
  },
  statsCellLabel: {
    fontSize: 8,
    color: pdfColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  statsCellValue: {
    fontSize: 12,
    fontFamily: pdfFonts.bold,
    fontFeatureSettings: '"tnum"',
  },

  // ── Footer band ──
  footerBand: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: pdfColors.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: pdfColors.muted,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 36,
    fontSize: 7,
    color: pdfColors.muted,
  },

  // ── Watermark ──
  watermarkWrap: {
    position: 'absolute',
    top: 280,
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: 'rotate(-30deg)',
  },
  watermarkText: {
    fontSize: 96,
    fontFamily: pdfFonts.bold,
    color: pdfColors.watermark,
    letterSpacing: 8,
  },
});

export const pnlColor = (value: number): string =>
  value > 0 ? pdfColors.success : value < 0 ? pdfColors.danger : pdfColors.muted;
