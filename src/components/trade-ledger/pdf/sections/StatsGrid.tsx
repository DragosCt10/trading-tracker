import { Text, View } from '@react-pdf/renderer';
import { pdfStyles } from '../pdfStyles';

export interface StatsGridItem {
  label: string;
  formatted: string;
}

interface StatsGridProps {
  title: string;
  items: StatsGridItem[];
}

export function StatsGrid({ title, items }: StatsGridProps) {
  if (items.length === 0) return null;
  return (
    <View style={pdfStyles.section}>
      <Text style={pdfStyles.sectionTitle}>{title}</Text>
      <View style={pdfStyles.statsGrid}>
        {items.map((it) => (
          <View key={it.label} style={pdfStyles.statsCell}>
            <Text style={pdfStyles.statsCellLabel}>{it.label}</Text>
            <Text style={pdfStyles.statsCellValue}>{it.formatted}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
