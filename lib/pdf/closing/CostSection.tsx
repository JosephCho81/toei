import { Text, View } from '@react-pdf/renderer'
import { BORDER } from '../pdfStyles'
import { Row, krw } from '../parts'
import { s, rowStyles } from './styles'
import type { ClosingPdfData } from './types'

export function CostSection({ data }: { data: ClosingPdfData }) {
  return (
    <>
        <Text style={s.sectionLabel}>섹션 5 — 기타 미정산 비용 (A+B+C)</Text>
        <View style={s.table}>
          {data.closingCostItems.map((item, i) => {
            const prefix = String.fromCharCode(65 + i) + ')'
            const isLastItem = i === data.closingCostItems.length - 1 && i > 0
            return (
              <Row
                key={i}
                label={`${prefix} ${item.itemName}`}
                value={krw(item.amountKrw)}
                even={i % 2 === 1}
                indent
                isLast={isLastItem}
              styles={rowStyles} />
            )
          })}
          <Row
            label="추가비용 소계 (VAT 별도)"
            value={krw(data.closingCostsTotalKrw)}
            even={data.closingCostItems.length % 2 === 1}
            isLast
          styles={rowStyles} />
        </View>

        {data.customsDetailItems.length > 0 && (
          <View>
            <Text style={s.sectionLabel}>통관 세부내역</Text>
            <View style={s.table}>
              {data.customsDetailItems.map((item, i) => {
                const isLast = i === data.customsDetailItems.length - 1
                return (
                  <Row key={`cd-${i}`} label={item.itemName} value={krw(item.amountKrw)} even={i % 2 === 1} indent isLast={isLast} styles={rowStyles} />
                )
              })}
              <Row
                label="통관비용 합계"
                value={krw(data.customsDetailItems.reduce((s, r) => s + r.amountKrw, 0))}
                even={data.customsDetailItems.length % 2 === 1}
                isLast
               styles={rowStyles} />
            </View>
          </View>
        )}

        {data.forwardingQuotes.length > 0 && (
          <View>
            <Text style={s.sectionLabel}>포워딩 세부내역</Text>
            <View style={[s.itemsTable, { marginBottom: 4 }]}>
              <View style={s.itemsHeaderRow}>
                <Text style={[s.itemsHeaderCell, { width: '40%' }]}>항목</Text>
                <Text style={[s.itemsHeaderCell, { width: '30%', borderLeftWidth: 1, borderLeftColor: BORDER, textAlign: 'right' }]}>견적금액</Text>
                <Text style={[s.itemsHeaderCell, { width: '30%', borderLeftWidth: 1, borderLeftColor: BORDER, textAlign: 'right' }]}>실청구액</Text>
              </View>
              {data.forwardingQuotes.map((r, i) => {
                const isLast = i === data.forwardingQuotes.length - 1
                const isEven = i % 2 === 1
                const rowStyle = isLast
                  ? (isEven ? s.itemsDataRowLastEven : s.itemsDataRowLast)
                  : (isEven ? s.itemsDataRowEven : s.itemsDataRow)
                return (
                  <View key={i} style={rowStyle}>
                    <Text style={[s.itemsCell, { width: '40%' }]}>{r.itemName}</Text>
                    <Text style={[s.itemsCell, { width: '30%', textAlign: 'right' }]}>
                      {r.quoteAmountKrw != null ? r.quoteAmountKrw.toLocaleString('ko-KR') + '원' : '-'}
                    </Text>
                    <Text style={[s.itemsCellLast, { width: '30%', textAlign: 'right' }]}>
                      {r.actualAmountKrw != null ? r.actualAmountKrw.toLocaleString('ko-KR') + '원' : '-'}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}
    </>
  )
}
