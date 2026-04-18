import { Text, View } from '@react-pdf/renderer';
import { pdfStyles, pnlColor } from '../pdfStyles';
import { formatPdfCurrency } from '../pdfHelpers';
import type { LedgerTotals } from '@/utils/tradeLedger/buildRunningBalance';

interface AccountSummaryProps {
  totals: LedgerTotals;
  currency: string;
}

export function AccountSummary({ totals, currency }: AccountSummaryProps) {
  const pnl = totals.realizedPnL;
  return (
    <View style={pdfStyles.section}>
      <Text style={pdfStyles.sectionTitle}>Account Summary</Text>
      <View style={pdfStyles.table}>
        <View style={pdfStyles.tableHeader}>
          <Text style={{ flex: 2 }}>Item</Text>
          <Text style={[{ flex: 1 }, pdfStyles.cellRight]}>Amount</Text>
        </View>
        <View style={pdfStyles.tableRow}>
          <Text style={[pdfStyles.cell, { flex: 2 }]}>Opening balance</Text>
          <Text style={[pdfStyles.cellNumeric, { flex: 1 }]}>
            {formatPdfCurrency(totals.openingBalance, currency)}
          </Text>
        </View>
        <View style={[pdfStyles.tableRow, pdfStyles.tableRowAlt]}>
          <Text style={[pdfStyles.cell, { flex: 2 }]}>
            Realized P&amp;L (period)
          </Text>
          <Text
            style={[pdfStyles.cellNumeric, { flex: 1, color: pnlColor(pnl) }]}
          >
            {formatPdfCurrency(pnl, currency)}
          </Text>
        </View>
        <View style={pdfStyles.tableTotalsRow}>
          <Text style={[pdfStyles.cellBold, { flex: 2 }]}>Closing balance</Text>
          <Text style={[pdfStyles.cellNumeric, pdfStyles.cellBold, { flex: 1 }]}>
            {formatPdfCurrency(totals.closingBalance, currency)}
          </Text>
        </View>
      </View>
    </View>
  );
}
