import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { pdfStyles, GREEN, GREEN_LIGHT, GRAY_BG, BORDER, MUTED, WHITE } from './pdfStyles'
import {
  ApprovalPage, PdfFooter, PdfHeader, Row, krw, usd, fdate, labelStyles,
} from './parts'
import { CostRatioBlock } from './CostRatioBlock'
import { buildInterimCostRows, type InterimPdfCostItem } from './interimRows'

export interface InterimPdfData {
  roundLabel: string
  manufacturerName: string
  lcOpenDate: string | null
  customsDate: string | null
  importAmountUsd: number
  marginRatePct: number | null
  customsExchangeRate: number
  importAmountKrw: number
  totalCostKrw: number
  confirmedAmountKrw: number
  /** exclusive = 수입부가세를 뺀 공급가 + 매출부가세 10%. inclusive = 구방식 */
  vatMode: 'inclusive' | 'exclusive'
  supplyAmountKrw: number
  outputVatKrw: number
  isPaid: boolean
  issuedAt: string
  costItems: InterimPdfCostItem[]
  forwardingQuotes: { itemName: string; quoteAmountKrw: number | null; actualAmountKrw: number | null }[]
}

const s = pdfStyles
const rowStyles = labelStyles('38%')

const triCol = StyleSheet.create({
  table: { borderWidth: 1, borderColor: BORDER },
  headerRow: { flexDirection: 'row', backgroundColor: GREEN, minHeight: 22, alignItems: 'center' },
  headerCell: { color: WHITE, fontSize: 8.5, fontWeight: 700, paddingLeft: 8, paddingRight: 4, paddingTop: 4, paddingBottom: 4 },
  dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 22, alignItems: 'center' },
  dataRowEven: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 22, alignItems: 'center', backgroundColor: GRAY_BG },
  dataRowLast: { flexDirection: 'row', minHeight: 22, alignItems: 'center' },
  subtotalRow: { flexDirection: 'row', minHeight: 24, alignItems: 'center', backgroundColor: '#E8F5E9' },
  cellItem: { width: '38%', paddingLeft: 8, paddingRight: 4, paddingTop: 4, paddingBottom: 4, borderRightWidth: 1, borderRightColor: BORDER, fontSize: 9 },
  cellItemIndent: { width: '38%', paddingLeft: 18, paddingRight: 4, paddingTop: 4, paddingBottom: 4, borderRightWidth: 1, borderRightColor: BORDER, fontSize: 8.5, color: MUTED },
  cellFormula: { width: '34%', paddingLeft: 6, paddingRight: 4, paddingTop: 4, paddingBottom: 4, borderRightWidth: 1, borderRightColor: BORDER, fontSize: 7.5, color: MUTED },
  cellAmount: { width: '28%', paddingLeft: 4, paddingRight: 8, paddingTop: 4, paddingBottom: 4, textAlign: 'right', fontSize: 9 },
})

export function InterimPdfDocument({ data }: { data: InterimPdfData }) {
  const itemsTotal = data.costItems.reduce((sum, c) => sum + c.amountKrw, 0)
  const exclusive = data.vatMode !== 'inclusive'
  const subTotal = data.importAmountKrw + itemsTotal

  const direction = data.confirmedAmountKrw >= 0
    ? '한국에이원 → 토에이산교 지급'
    : '토에이산교 → 한국에이원 지급'

  const marginSuffix = data.marginRatePct
    ? ` × ${(1 + data.marginRatePct / 100).toFixed(2)}(마진율 1+${data.marginRatePct}%)`
    : ''
  const importFormula = `$${data.importAmountUsd.toLocaleString('en-US')} × ${data.customsExchangeRate.toLocaleString('ko-KR')}원${marginSuffix}`

  const allCostRows = buildInterimCostRows({
    costItems: data.costItems,
    importAmountKrw: data.importAmountKrw,
    importFormula,
    exclusive,
    supplyAmountKrw: data.supplyAmountKrw,
    outputVatKrw: data.outputVatKrw,
  })

  const systemSubTotal = exclusive
    ? data.supplyAmountKrw + data.outputVatKrw
    : data.importAmountKrw + itemsTotal
  const confirmedDiff = data.confirmedAmountKrw - systemSubTotal

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PdfHeader title="LC 거래 중간정산 내역" />

        <Text style={s.disclaimer}>{exclusive ? '※ 공급가는 부가세 별도이며, 합계 = 공급가 + 부가세(10%) 입니다. 통관 시 납부한 수입부가세는 청구 대상이 아닙니다.' : '※ 모든 금액은 부가세 별도 기준입니다.'}</Text>

        <Text style={s.sectionLabel}>섹션 1 — 거래 기본 정보</Text>
        <View style={s.table}>
          <Row label="회 차" value={data.roundLabel} styles={rowStyles} />
          <Row label="제조사명" value={data.manufacturerName} even styles={rowStyles} />
          <Row label="수입금액 (USD)" value={usd(data.importAmountUsd)} styles={rowStyles} />
          <Row label="L/C 개설일" value={fdate(data.lcOpenDate)} even styles={rowStyles} />
          <Row label="통관일" value={fdate(data.customsDate)} styles={rowStyles} />
          <Row label="통관환율" value={`${data.customsExchangeRate.toLocaleString('ko-KR')}원/$`} even isLast styles={rowStyles} />
        </View>

        <Text style={s.sectionLabel}>섹션 2 — 수입 원가 계산</Text>
        <View style={triCol.table}>
          <View style={triCol.headerRow}>
            <Text style={[triCol.headerCell, { width: '38%' }]}>항목</Text>
            <Text style={[triCol.headerCell, { width: '34%', borderLeftWidth: 1, borderLeftColor: '#A5D6A7' }]}>계산식</Text>
            <Text style={[triCol.headerCell, { width: '28%', borderLeftWidth: 1, borderLeftColor: '#A5D6A7', textAlign: 'right' }]}>금액 (KRW)</Text>
          </View>
          {allCostRows.map((row, i) => {
            const isLast = i === allCostRows.length - 1
            const isEven = i % 2 === 1
            const rowStyle = isLast ? triCol.dataRowLast : (isEven ? triCol.dataRowEven : triCol.dataRow)
            const cellItemStyle = row.indent ? triCol.cellItemIndent : triCol.cellItem
            return (
              <View key={i} style={rowStyle}>
                <Text style={cellItemStyle}>{row.itemName}</Text>
                <Text style={triCol.cellFormula}>{row.formula}</Text>
                <Text style={[triCol.cellAmount, { fontWeight: row.indent ? 400 : 400 }]}>{row.amountKrw.toLocaleString('ko-KR')}원</Text>
              </View>
            )
          })}
          <View style={triCol.subtotalRow}>
            <Text style={[triCol.cellItem, { color: GREEN, fontWeight: 700 }]}>소계</Text>
            <Text style={triCol.cellFormula} />
            <Text style={[triCol.cellAmount, { color: GREEN, fontWeight: 700 }]}>{subTotal.toLocaleString('ko-KR')}원</Text>
          </View>
        </View>

        {data.forwardingQuotes.length > 0 && (
          <View>
            <Text style={s.sectionLabel}>섹션 3 — 포워딩 견적</Text>
            <View style={[triCol.table, { marginBottom: 4 }]}>
              <View style={triCol.headerRow}>
                <Text style={[triCol.headerCell, { width: '40%' }]}>항목</Text>
                <Text style={[triCol.headerCell, { width: '30%', borderLeftWidth: 1, borderLeftColor: '#A5D6A7', textAlign: 'right' }]}>견적금액</Text>
                <Text style={[triCol.headerCell, { width: '30%', borderLeftWidth: 1, borderLeftColor: '#A5D6A7', textAlign: 'right' }]}>실청구액</Text>
              </View>
              {data.forwardingQuotes.map((r, i) => {
                const isLast = i === data.forwardingQuotes.length - 1
                const isEven = i % 2 === 1
                const rowStyle = isLast ? triCol.dataRowLast : (isEven ? triCol.dataRowEven : triCol.dataRow)
                return (
                  <View key={i} style={rowStyle}>
                    <Text style={[triCol.cellItem, { width: '40%' }]}>{r.itemName}</Text>
                    <Text style={[triCol.cellAmount, { width: '30%' }]}>
                      {r.quoteAmountKrw != null ? r.quoteAmountKrw.toLocaleString('ko-KR') + '원' : '-'}
                    </Text>
                    <Text style={[triCol.cellAmount, { width: '30%' }]}>
                      {r.actualAmountKrw != null ? r.actualAmountKrw.toLocaleString('ko-KR') + '원' : '-'}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        <Text style={s.sectionLabel}>섹션 4 — 중간정산 확정금액</Text>
        {/* 시스템 계산 vs 확정 비교 */}
        <View style={{ borderWidth: 1, borderColor: BORDER, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 22, alignItems: 'center', backgroundColor: GRAY_BG }}>
            <Text style={{ flex: 1, paddingLeft: 10, fontSize: 8.5, color: MUTED }}>소계 (시스템 계산)</Text>
            <Text style={{ width: '40%', textAlign: 'right', paddingRight: 10, fontSize: 8.5 }}>{systemSubTotal.toLocaleString('ko-KR')}원</Text>
          </View>
          <View style={{ flexDirection: 'row', minHeight: 22, alignItems: 'center', backgroundColor: '#E8F5E9' }}>
            <View style={{ flex: 1, paddingLeft: 10, paddingTop: 3, paddingBottom: 3 }}>
              <Text style={{ fontSize: 8.5, color: GREEN, fontWeight: 700 }}>확정금액 (수기입력 엑셀 기준)</Text>
              {Math.abs(confirmedDiff) > 0 && (
                <Text style={{ fontSize: 7.5, color: '#ea580c', marginTop: 1 }}>
                  ※ 시스템 대비 {confirmedDiff > 0 ? '+' : ''}{confirmedDiff.toLocaleString('ko-KR')}원 차이
                </Text>
              )}
            </View>
            <Text style={{ width: '40%', textAlign: 'right', paddingRight: 10, fontSize: 9, color: GREEN, fontWeight: 700 }}>{krw(data.confirmedAmountKrw)}</Text>
          </View>
        </View>
        <View style={s.summaryBox}>
          <View>
            <Text style={s.summaryLabel}>중간정산 확정금액</Text>
            <Text style={{ fontSize: 9, color: GREEN_LIGHT, marginTop: 4 }}>{direction}</Text>
          </View>
          <Text style={s.summaryValue}>{krw(Math.abs(data.confirmedAmountKrw))}</Text>
        </View>

        <CostRatioBlock importAmountKrw={data.importAmountKrw} costsKrw={itemsTotal} />

        <PdfFooter issuedAt={data.issuedAt} />
      </Page>

      <ApprovalPage roundLabel={data.roundLabel} issuedAt={data.issuedAt} />
    </Document>
  )
}
