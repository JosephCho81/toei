import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
import path from 'path'
import { pdfStyles, GREEN, GREEN_LIGHT, GRAY_BG, BORDER, TEXT, MUTED, WHITE } from './pdfStyles'

Font.register({
  family: 'NotoSansKR',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/notosanskr/v39/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLQ.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/notosanskr/v39/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzg01eLQ.ttf',
      fontWeight: 700,
    },
  ],
})

const CI_A1 = path.join(process.cwd(), 'public', 'CI_a1korea.png')
const CI_TOEI = path.join(process.cwd(), 'public', 'CI_toei.png')

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
  costItems: { itemName: string; amountKrw: number; groupType: string; isImportVat: boolean }[]
  forwardingQuotes: { itemName: string; quoteAmountKrw: number | null; actualAmountKrw: number | null }[]
}

const s = {
  ...pdfStyles,
  cellLabel: {
    width: '38%',
    paddingLeft: 10,
    paddingRight: 8,
    paddingTop: 6,
    paddingBottom: 6,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    color: MUTED,
    fontWeight: 700 as const,
    fontSize: 9,
  },
  cellValue: {
    width: '62%',
    paddingLeft: 10,
    paddingRight: 8,
    paddingTop: 6,
    paddingBottom: 6,
  },
}

function krw(n: number): string {
  return n.toLocaleString('ko-KR') + '원'
}

function usd(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fdate(s: string | null): string {
  return s ?? '-'
}

function Row({
  label,
  value,
  even,
  isLast,
}: {
  label: string
  value: string
  even?: boolean
  isLast?: boolean
}) {
  const rowStyle = isLast
    ? (even ? s.lastRowEven : s.lastRowOdd)
    : (even ? s.rowEven : s.rowOdd)
  return (
    <View style={rowStyle}>
      <View style={s.cellLabel}><Text>{label}</Text></View>
      <View style={s.cellValue}><Text>{value}</Text></View>
    </View>
  )
}

function PaidRow({ isPaid, even, isLast }: { isPaid: boolean; even?: boolean; isLast?: boolean }) {
  const rowStyle = isLast
    ? (even ? s.lastRowEven : s.lastRowOdd)
    : (even ? s.rowEven : s.rowOdd)
  return (
    <View style={rowStyle}>
      <View style={s.cellLabel}><Text>지불여부</Text></View>
      <View style={s.cellValue}>
        <View style={isPaid ? s.paidView : s.unpaidView}>
          <Text style={s.badgeText}>{isPaid ? '지불완료' : '미지불'}</Text>
        </View>
      </View>
    </View>
  )
}

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
  const shippingItems = data.costItems.filter((c) => c.groupType === 'shipping')
  const customsItems = data.costItems.filter((c) => c.groupType !== 'shipping')
  const itemsTotal = data.costItems.reduce((s, c) => s + c.amountKrw, 0)
  const exclusive = data.vatMode !== 'inclusive'
  const importVatKrw = data.costItems.reduce((s, c) => s + (c.isImportVat ? c.amountKrw : 0), 0)
  const subTotal = data.importAmountKrw + itemsTotal

  const direction = data.confirmedAmountKrw >= 0
    ? '한국에이원 → 토에이산교 지급'
    : '토에이산교 → 한국에이원 지급'

  const marginSuffix = data.marginRatePct
    ? ` × ${(1 + data.marginRatePct / 100).toFixed(2)}(마진율 1+${data.marginRatePct}%)`
    : ''
  const importFormula = `$${data.importAmountUsd.toLocaleString('en-US')} × ${data.customsExchangeRate.toLocaleString('ko-KR')}원${marginSuffix}`

  const allCostRows = [
    { itemName: '수입금액 (원화환산)', formula: importFormula, amountKrw: data.importAmountKrw, indent: false },
    ...shippingItems.map((c) => ({ itemName: c.itemName, formula: '', amountKrw: c.amountKrw, indent: true })),
    ...customsItems.map((c) => ({
      itemName: c.itemName,
      formula: exclusive && c.isImportVat ? '수입부가세 — 매입세액공제분이라 공급가에서 제외' : '',
      amountKrw: c.amountKrw,
      indent: true,
    })),
    ...(exclusive
      ? [
          { itemName: '수입부가세 차감', formula: '공급가 계산에서 제외', amountKrw: -importVatKrw, indent: false },
          { itemName: '공급가 (부가세 별도)', formula: '', amountKrw: data.supplyAmountKrw, indent: false },
          { itemName: '부가세', formula: '공급가 x 10%', amountKrw: data.outputVatKrw, indent: false },
        ]
      : []),
  ]

  const systemSubTotal = exclusive
    ? data.supplyAmountKrw + data.outputVatKrw
    : data.importAmountKrw + itemsTotal
  const confirmedDiff = data.confirmedAmountKrw - systemSubTotal

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Image src={CI_A1} style={s.headerLogo} />
          <View style={s.headerCenter}>
            <Text style={s.companyName}>㈜한국에이원 ↔ 토에이산교</Text>
            <Text style={s.docTitle}>LC 거래 중간정산 내역</Text>
          </View>
          <Image src={CI_TOEI} style={s.headerLogo} />
        </View>

        <Text style={s.disclaimer}>{exclusive ? '※ 공급가는 부가세 별도이며, 합계 = 공급가 + 부가세(10%) 입니다. 통관 시 납부한 수입부가세는 청구 대상이 아닙니다.' : '※ 모든 금액은 부가세 별도 기준입니다.'}</Text>

        <Text style={s.sectionLabel}>섹션 1 — 거래 기본 정보</Text>
        <View style={s.table}>
          <Row label="회 차" value={data.roundLabel} />
          <Row label="제조사명" value={data.manufacturerName} even />
          <Row label="수입금액 (USD)" value={usd(data.importAmountUsd)} />
          <Row label="L/C 개설일" value={fdate(data.lcOpenDate)} even />
          <Row label="통관일" value={fdate(data.customsDate)} />
          <Row label="통관환율" value={`${data.customsExchangeRate.toLocaleString('ko-KR')}원/$`} even isLast />
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

        {/* 원가 구성 비율 */}
        <View>
          <Text style={s.sectionLabel}>원가 구성 비율</Text>
          <View style={{ borderWidth: 1, borderColor: BORDER, padding: 8, backgroundColor: GRAY_BG }}>
            {(() => {
              const total = data.importAmountKrw + itemsTotal
              if (total <= 0) return null
              const segs = [
                { label: '수입원가', amount: data.importAmountKrw, color: GREEN },
                { label: '통관/운송비', amount: itemsTotal, color: '#f97316' },
              ].filter(s => s.amount > 0)
              return (
                <View>
                  {segs.map((seg, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: 3, alignItems: 'center' }}>
                      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: seg.color, marginRight: 6 }} />
                      <Text style={{ fontSize: 8, color: MUTED, width: 80 }}>{seg.label}</Text>
                      <Text style={{ fontSize: 8, color: seg.color, fontWeight: 700, width: 40, textAlign: 'right' }}>
                        {Math.round(seg.amount / total * 100)}%
                      </Text>
                      <Text style={{ fontSize: 8, color: MUTED, marginLeft: 8 }}>
                        ({seg.amount.toLocaleString('ko-KR')}원)
                      </Text>
                    </View>
                  ))}
                </View>
              )
            })()}
          </View>
        </View>

        <View style={s.footer}>
          <Text>발행일: {data.issuedAt}</Text>
          <Text>발행자: ㈜한국에이원</Text>
        </View>
      </Page>

      {/* 결재 도장 페이지 */}
      <Page size="A4" style={s.page}>
        <View style={{ backgroundColor: GREEN, padding: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Image src={CI_A1} style={{ height: 40, width: 80, objectFit: 'contain' }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: WHITE, fontSize: 9, fontWeight: 700, textAlign: 'center' }}>㈜한국에이원 ↔ 토에이산교</Text>
            <Text style={{ color: WHITE, fontSize: 14, fontWeight: 700, textAlign: 'center', marginTop: 5 }}>{data.roundLabel} — 결재 확인</Text>
          </View>
          <Image src={CI_TOEI} style={{ height: 40, width: 80, objectFit: 'contain' }} />
        </View>
        <View style={{ marginTop: 40 }}>
          <Text style={{ fontSize: 9, color: MUTED, textAlign: 'center', marginBottom: 10 }}>결재</Text>
          <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: '#9ca3af' }}>
            <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#9ca3af' }}>
              <Text style={{ fontSize: 9, textAlign: 'center', paddingTop: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#9ca3af', color: MUTED }}>담당자</Text>
              <View style={{ height: 80 }} />
            </View>
            <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#9ca3af' }}>
              <Text style={{ fontSize: 9, textAlign: 'center', paddingTop: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#9ca3af', color: MUTED }}>확인자</Text>
              <View style={{ height: 80 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, textAlign: 'center', paddingTop: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#9ca3af', color: MUTED }}>승인자</Text>
              <View style={{ height: 80 }} />
            </View>
          </View>
        </View>
        <View style={s.footer}>
          <Text>발행일: {data.issuedAt}</Text>
          <Text>발행자: ㈜한국에이원</Text>
        </View>
      </Page>
    </Document>
  )
}
