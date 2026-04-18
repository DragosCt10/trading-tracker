import { Text, View } from '@react-pdf/renderer';
import { pdfStyles } from '../pdfStyles';
import { ModeBadge } from '../Watermark';
import { PdfLogo } from '../PdfLogo';
import { formatPdfPeriod } from '../pdfHelpers';

interface HeroStat {
  label: string;
  value: string;
}

interface CoverPageProps {
  traderName: string;
  accountLabel: string;
  period: { start: string; end: string };
  heroStats: HeroStat[];
  generatedAt: Date;
  referenceCode: string;
  mode: 'live' | 'demo' | 'backtesting';
}

export function CoverPage({
  traderName,
  accountLabel,
  period,
  heroStats,
  generatedAt,
  referenceCode,
  mode,
}: CoverPageProps) {
  return (
    <View style={pdfStyles.coverPage}>
      {/* Brand lockup — logo + wordmark + badge centered on the same optical axis */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <PdfLogo size={28} />
          <Text style={pdfStyles.brand}>AlphaStats</Text>
        </View>
        <ModeBadge mode={mode} />
      </View>
      <Text style={[pdfStyles.smallMuted, { marginTop: 4, marginBottom: 72 }]}>
        Trade Ledger · Statement
      </Text>

      {/* Title block — wrap each line in its own View with explicit paddingBottom.
          react-pdf's Text margin collapses weirdly at large font sizes; Views
          give us a reliable block layout so the big title never crashes into
          the account/period lines below. */}
      <View style={{ paddingBottom: 14 }}>
        <Text style={pdfStyles.coverTitle}>{traderName}</Text>
      </View>
      <View style={{ paddingBottom: 4 }}>
        <Text style={pdfStyles.coverAccount}>{accountLabel}</Text>
      </View>
      <View style={{ paddingBottom: 40 }}>
        <Text style={pdfStyles.coverPeriod}>
          {formatPdfPeriod(period.start, period.end)}
        </Text>
      </View>

      <View style={pdfStyles.coverHeroGrid}>
        {heroStats.map((s) => (
          <View key={s.label} style={pdfStyles.coverHeroCell}>
            <Text style={pdfStyles.coverHeroLabel}>{s.label}</Text>
            <Text style={pdfStyles.coverHeroValue}>{s.value}</Text>
          </View>
        ))}
      </View>

      <View style={pdfStyles.coverMeta}>
        <View style={pdfStyles.coverMetaRow}>
          <Text>Generated</Text>
          <Text>{generatedAt.toISOString().slice(0, 19).replace('T', ' ')} UTC</Text>
        </View>
        <View style={pdfStyles.coverMetaRow}>
          <Text>Reference</Text>
          <Text>{referenceCode}</Text>
        </View>
      </View>
    </View>
  );
}
