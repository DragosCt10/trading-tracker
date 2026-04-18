import { Text, View } from '@react-pdf/renderer';
import { pdfColors, pdfFonts } from './pdfStyles';

interface ModeBadgeProps {
  mode: 'live' | 'demo' | 'backtesting';
}

/**
 * Small inline mode badge — shown in the header band on data pages when the
 * report is a non-live snapshot. Replaces the old full-page diagonal watermark
 * which was too heavy on the cover.
 */
export function ModeBadge({ mode }: ModeBadgeProps) {
  if (mode === 'live') return null;
  const label = mode === 'demo' ? 'DEMO' : 'BACKTEST';
  return (
    <View
      style={{
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: pdfColors.accent,
        borderRadius: 4,
        paddingHorizontal: 7,
        paddingVertical: 4,
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 8,
          fontFamily: pdfFonts.bold,
          color: pdfColors.accent,
          letterSpacing: 1.2,
          lineHeight: 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
