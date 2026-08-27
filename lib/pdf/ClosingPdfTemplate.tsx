import { Document, Page, Text, View, Font, Image } from '@react-pdf/renderer'
import path from 'path'
import { pdfStyles, GREEN, GREEN_LIGHT, GRAY_BG, BORDER, TEXT, MUTED, WHITE, GREEN_GAIN, RED } from './pdfStyles'

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

export interface ClosingPdfData {
  roundLabel: string
  manufacturerName: string
  customsExchangeRate: number
  bokExchangeRate: number | null
  closingDate: string | null
  lcPaymentTotalKrw: number
  importAmountKrw: number
  importAmountUsd?: number
  vatAmountKrw?: number
  fxGainLossKrw: number
  lcFeeItems: { itemName: string; amountKrw: number }[]
  lcFeeTotalKrw: number
  additionalCostKrw: number
  fxBurdenA1Pct: number
  a1BurdenKrw: number
  a1BurdenWithVatKrw: number
  /** 'exclusive' = 공급가(부담분+추가비용) + 부가세 10%. 'inclusive' = 구방식 */
  vatMode: 'inclusive' | 'exclusive'
  supplyAmountKrw: number
  outputVatKrw: number
  closingCostItems: { itemName: string; amountKrw: number }[]
  closingCostsTotalKrw: number
  confirmedAmountKrw: number
  directionLabel: string
  isPaid: boolean
  issuedAt: string
  items: { spec: string; color: string; size: string; unitPriceUsd: number; quantity: number; unit: string }[]
  interimRate: number | null
  interimConfirmedKrw: number | null
  grandTotalKrw: number | null
  shippingItems: { itemName: string; amountKrw: number }[]
  customsItems: { itemName: string; amountKrw: number }[]
  customsDetailItems: { itemName: string; amountKrw: number }[]
  forwardingQuotes: { itemName: string; quoteAmountKrw: number | null; actualAmountKrw: number | null }[]
}

const s = {
  ...pdfStyles,
  cellLabel: {
    width: '42%',
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
  cellLabelIndent: {
    width: '42%',
    paddingLeft: 22,
    paddingRight: 8,
    paddingTop: 5,
    paddingBottom: 5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    color: MUTED,
    fontSize: 9,
  },
  cellValue: {
    width: '58%',
    paddingLeft: 10,
    paddingRight: 8,
    paddingTop: 6,
    paddingBottom: 6,
  },
  fxGainText: { color: GREEN_GAIN, fontWeight: 700 as const },
  fxLossText: { color: RED, fontWeight: 700 as const },
  grandTotalBox: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    padding: 12,
    marginTop: 12,
  },
  grandTotalRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 4,
  },
  grandTotalDivider: {
    borderTopWidth: 1,
    borderTopColor: '#A5D6A7',
    marginTop: 6,
    marginBottom: 6,
  },
  itemsTable: { borderWidth: 1, borderColor: BORDER },
  itemsHeaderRow: {
    flexDirection: 'row' as const,
    backgroundColor: GREEN,
    minHeight: 20,
    alignItems: 'center' as const,
  },
  itemsHeaderCell: {
    color: WHITE,
    fontSize: 7.5,
    fontWeight: 700 as const,
    paddingLeft: 5,
    paddingRight: 3,
    paddingTop: 4,
    paddingBottom: 4,
  },
  itemsDataRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 20,
    alignItems: 'center' as const,
  },
  itemsDataRowEven: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 20,
    alignItems: 'center' as const,
    backgroundColor: GRAY_BG,
  },
  itemsDataRowLast: {
    flexDirection: 'row' as const,
    minHeight: 20,
    alignItems: 'center' as const,
  },
  itemsDataRowLastEven: {
    flexDirection: 'row' as const,
    minHeight: 20,
    alignItems: 'center' as const,
    backgroundColor: GRAY_BG,
  },
  itemsCell: {
    fontSize: 8.5,
    paddingLeft: 5,
    paddingRight: 3,
    paddingTop: 4,
    paddingBottom: 4,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  itemsCellLast: {
    fontSize: 8.5,
    paddingLeft: 5,
    paddingRight: 3,
    paddingTop: 4,
    paddingBottom: 4,
  },
}

function krw(n: number): string {
  return n.toLocaleString('ko-KR') + '원'
}

function krwSigned(n: number): string {
  const prefix = n >= 0 ? '+' : ''
  return prefix + n.toLocaleString('ko-KR') + '원'
}

function Row({
  label,
  value,
  even,
  isLast,
  indent,
  valueStyle,
}: {
  label: string
  value: string
  even?: boolean
  isLast?: boolean
  indent?: boolean
  valueStyle?: typeof s.fxGainText | typeof s.fxLossText
}) {
  const rowStyle = isLast
    ? (even ? s.lastRowEven : s.lastRowOdd)
    : (even ? s.rowEven : s.rowOdd)
  const labelStyle = indent ? s.cellLabelIndent : s.cellLabel
  return (
    <View style={rowStyle}>
      <View style={labelStyle}><Text>{label}</Text></View>
      <View style={s.cellValue}><Text style={valueStyle ?? {}}>{value}</Text></View>
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

const SENS_DELTAS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50]

function buildSensScenarios(bokRate: number, importAmountUsd: number, importAmountKrw: number, lcFeeTotal: number, burdenPct: number, extraCosts: number) {
  return SENS_DELTAS.map(delta => {
    const simRate = bokRate + delta
    const simLc = Math.round(importAmountUsd * simRate)
    const simFx = importAmountKrw - simLc
    const simA1 = Math.round((lcFeeTotal - simFx) * (burdenPct / 100))
    const simFinal = Math.round(simA1 * 1.1) + extraCosts
    return { delta, simRate, simFx, simFinal, isActual: delta === 0 }
  })
}

export function ClosingPdfDocument({ data }: { data: ClosingPdfData }) {
  const fxIsGain = data.fxGainLossKrw >= 0
  const fxLabel = fxIsGain
    ? `환차익 (A1 유리, ${data.fxBurdenA1Pct}% 수령)`
    : `환차손 (A1 불리, ${data.fxBurdenA1Pct}% 부담)`
  const additionalCost = data.lcFeeTotalKrw - data.fxGainLossKrw
  const exclusive = data.vatMode !== 'inclusive'
  const nonVatCostsTotal = [...data.shippingItems, ...data.customsItems].reduce((s, r) => s + r.amountKrw, 0)
  const sensScenarios = data.bokExchangeRate != null && data.importAmountUsd
    ? buildSensScenarios(data.bokExchangeRate, data.importAmountUsd, data.importAmountKrw, data.lcFeeTotalKrw, data.fxBurdenA1Pct, data.closingCostsTotalKrw)
    : null

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Image src={CI_A1} style={s.headerLogo} />
          <View style={s.headerCenter}>
            <Text style={s.companyName}>㈜한국에이원 ↔ 토에이산교</Text>
            <Text style={s.docTitle}>LC 거래 최종정산 내역</Text>
          </View>
          <Image src={CI_TOEI} style={s.headerLogo} />
        </View>

        <Text style={s.disclaimer}>※ 모든 금액은 부가세 별도 기준입니다.</Text>
        <Text style={s.sectionLabel}>섹션 1 — 기본 정보</Text>
        <View style={s.table}>
          <Row label="회 차" value={data.roundLabel} />
          <Row label="제조사명" value={data.manufacturerName} even isLast />
        </View>

        <Text style={s.sectionLabel}>섹션 2 — 환율 정보</Text>
        <View style={s.table}>
          <Row
            label="통관환율 (입고시)"
            value={`${data.customsExchangeRate.toLocaleString('ko-KR')}원/$`}
          />
          <Row
            label="클로징환율 (L/C 결제)"
            value={data.bokExchangeRate != null ? `${data.bokExchangeRate.toLocaleString('ko-KR')}원/$` : '-'}
            even
          />
          <Row
            label="LC 결제일"
            value={data.closingDate ?? '-'}
            isLast
          />
        </View>

        {data.items.length > 0 && (
          <View>
            <Text style={s.sectionLabel}>수입 품목 내역</Text>
            <View style={s.itemsTable}>
              <View style={s.itemsHeaderRow}>
                <Text style={[s.itemsHeaderCell, { width: '26%' }]}>스펙</Text>
                <Text style={[s.itemsHeaderCell, { width: '18%', borderLeftWidth: 1, borderLeftColor: BORDER }]}>색상</Text>
                <Text style={[s.itemsHeaderCell, { width: '12%', borderLeftWidth: 1, borderLeftColor: BORDER }]}>사이즈</Text>
                <Text style={[s.itemsHeaderCell, { width: '20%', borderLeftWidth: 1, borderLeftColor: BORDER }]}>단가(USD)</Text>
                <Text style={[s.itemsHeaderCell, { width: '13%', borderLeftWidth: 1, borderLeftColor: BORDER }]}>수량</Text>
                <Text style={[s.itemsHeaderCell, { width: '11%', borderLeftWidth: 1, borderLeftColor: BORDER }]}>단위</Text>
              </View>
              {data.items.map((item, i) => {
                const isLast = i === data.items.length - 1
                const isEven = i % 2 === 1
                const rowStyle = isLast
                  ? (isEven ? s.itemsDataRowLastEven : s.itemsDataRowLast)
                  : (isEven ? s.itemsDataRowEven : s.itemsDataRow)
                return (
                  <View key={i} style={rowStyle}>
                    <Text style={[s.itemsCell, { width: '26%' }]}>{item.spec}</Text>
                    <Text style={[s.itemsCell, { width: '18%' }]}>{item.color}</Text>
                    <Text style={[s.itemsCell, { width: '12%' }]}>{item.size}</Text>
                    <Text style={[s.itemsCell, { width: '20%' }]}>{item.unitPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    <Text style={[s.itemsCell, { width: '13%' }]}>{item.quantity.toLocaleString('ko-KR')}</Text>
                    <Text style={[s.itemsCellLast, { width: '11%' }]}>{item.unit}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {data.interimRate != null && (
          <View>
            <Text style={s.sectionLabel}>중간정산 내역 (참고)</Text>
            <View style={s.table}>
              <Row label="통관환율" value={`${data.interimRate.toLocaleString('ko-KR')}원/$`} />
              {data.shippingItems.map((item, i) => (
                <Row key={`sh-${i}`} label={item.itemName} value={krw(item.amountKrw)} even={(i + 1) % 2 === 1} indent />
              ))}
              {data.shippingItems.length > 0 && (
                <Row
                  label="해상운임 소계"
                  value={krw(data.shippingItems.reduce((acc, r) => acc + r.amountKrw, 0))}
                  even={(data.shippingItems.length + 1) % 2 === 1}
                />
              )}
              {data.customsItems.map((item, i) => {
                const offset = 1 + data.shippingItems.length + (data.shippingItems.length > 0 ? 1 : 0)
                return (
                  <Row key={`cu-${i}`} label={item.itemName} value={krw(item.amountKrw)} even={(offset + i) % 2 === 1} indent />
                )
              })}
              {data.customsItems.length > 0 && (
                <Row
                  label="통관비용 소계"
                  value={krw(data.customsItems.reduce((acc, r) => acc + r.amountKrw, 0))}
                  even={(1 + data.shippingItems.length + (data.shippingItems.length > 0 ? 1 : 0) + data.customsItems.length) % 2 === 1}
                />
              )}
              <Row
                label="중간정산 확정금액"
                value={data.interimConfirmedKrw != null ? krwSigned(data.interimConfirmedKrw) : '-'}
                isLast
              />
            </View>
          </View>
        )}

        <Text style={s.sectionLabel}>섹션 3 — LC 결제 내역</Text>
        <View style={s.table}>
          <View style={s.rowOdd}>
            <View style={s.cellLabel}>
              <Text>{`원금×통관환율 (${data.customsExchangeRate.toLocaleString('ko-KR')}원/$)`}</Text>
            </View>
            <View style={s.cellValue}>
              <Text>{krw(data.importAmountKrw)}</Text>
              {data.importAmountUsd ? (
                <Text style={{ fontSize: 7, color: MUTED, marginTop: 1 }}>
                  {`$${data.importAmountUsd.toLocaleString('en-US')}(수입금액USD) × ${data.customsExchangeRate.toLocaleString('ko-KR')}원 = ${data.importAmountKrw.toLocaleString('ko-KR')}원`}
                </Text>
              ) : null}
            </View>
          </View>
          <Row label="LC 결제비용" value={krw(data.lcPaymentTotalKrw)} even />
          <View style={s.lastRowOdd}>
            <View style={s.cellLabel}><Text style={fxIsGain ? s.fxGainText : s.fxLossText}>{fxLabel}</Text></View>
            <View style={s.cellValue}>
              <Text style={fxIsGain ? s.fxGainText : s.fxLossText}>{krwSigned(data.fxGainLossKrw)}</Text>
              <Text style={{ fontSize: 7, color: MUTED, marginTop: 1 }}>
                {`원금×통관환율 ${data.importAmountKrw.toLocaleString('ko-KR')}원 - LC결제 ${data.lcPaymentTotalKrw.toLocaleString('ko-KR')}원 = ${krwSigned(data.fxGainLossKrw)}`}
              </Text>
            </View>
          </View>
        </View>

        <Text style={s.sectionLabel}>LC 수수료 내역</Text>
        <View style={s.table}>
          {data.lcFeeItems.map((item, i) => {
            const isLastItem = i === data.lcFeeItems.length - 1 && i > 0
            return (
              <Row
                key={i}
                label={item.itemName}
                value={krw(item.amountKrw)}
                even={i % 2 === 1}
                indent
                isLast={isLastItem}
              />
            )
          })}
          <Row
            label="LC 수수료 합계"
            value={krw(data.lcFeeTotalKrw)}
            even={data.lcFeeItems.length % 2 === 1}
            isLast
          />
        </View>

        <Text style={s.sectionLabel}>섹션 4 — 추가비용 및 분담</Text>
        <View style={s.table}>
          <View style={s.rowOdd}>
            <View style={s.cellLabel}><Text>추가비용 합계 (VAT 별도)</Text></View>
            <View style={s.cellValue}>
              <Text>{krwSigned(data.additionalCostKrw)}</Text>
              <Text style={{ fontSize: 7, color: MUTED, marginTop: 1 }}>
                {`LC제비용 ${krwSigned(data.lcFeeTotalKrw)} - 환차${fxIsGain ? '익' : '손'} ${krwSigned(data.fxGainLossKrw)} = ${krwSigned(data.additionalCostKrw)}`}
              </Text>
            </View>
          </View>
          <Row
            label={`에이원 부담 비율`}
            value={`${data.fxBurdenA1Pct}% (토에이 ${100 - data.fxBurdenA1Pct}%)`}
            even
          />
          <View style={s.rowOdd}>
            <View style={s.cellLabel}><Text>에이원 부담분 (VAT 별도)</Text></View>
            <View style={s.cellValue}>
              <Text>{krwSigned(data.a1BurdenKrw)}</Text>
              <Text style={{ fontSize: 7, color: MUTED, marginTop: 1 }}>
                {`추가비용 ${krwSigned(data.additionalCostKrw)} × ${data.fxBurdenA1Pct}%(에이원분담) = ${krwSigned(data.a1BurdenKrw)}`}
              </Text>
            </View>
          </View>
          {exclusive ? (
            <>
              <View style={s.rowEven}>
                <View style={s.cellLabel}><Text>공급가 (부가세 별도)</Text></View>
                <View style={s.cellValue}>
                  <Text>{krwSigned(data.supplyAmountKrw)}</Text>
                  <Text style={{ fontSize: 7, color: MUTED, marginTop: 1 }}>
                    {`에이원 부담분 ${krwSigned(data.a1BurdenKrw)}${data.closingCostsTotalKrw !== 0 ? ` + 기타 미정산 ${krwSigned(data.closingCostsTotalKrw)}` : ''}`}
                  </Text>
                </View>
              </View>
              <View style={s.lastRowOdd}>
                <View style={s.cellLabel}><Text>부가세 (공급가 x 10%)</Text></View>
                <View style={s.cellValue}>
                  <Text>{krwSigned(data.outputVatKrw)}</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={s.lastRowEven}>
              <View style={s.cellLabel}><Text>에이원 부담분 + VAT (VAT 포함)</Text></View>
              <View style={s.cellValue}>
                <Text>{krwSigned(data.a1BurdenWithVatKrw)}</Text>
                <Text style={{ fontSize: 7, color: MUTED, marginTop: 1 }}>
                  {`VAT별도 ${krwSigned(data.a1BurdenKrw)} × 1.1(VAT 10%) = ${krwSigned(data.a1BurdenWithVatKrw)}`}
                </Text>
              </View>
            </View>
          )}
        </View>

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
              />
            )
          })}
          <Row
            label="추가비용 소계 (VAT 별도)"
            value={krw(data.closingCostsTotalKrw)}
            even={data.closingCostItems.length % 2 === 1}
            isLast
          />
        </View>

        {data.customsDetailItems.length > 0 && (
          <View>
            <Text style={s.sectionLabel}>통관 세부내역</Text>
            <View style={s.table}>
              {data.customsDetailItems.map((item, i) => {
                const isLast = i === data.customsDetailItems.length - 1
                return (
                  <Row key={`cd-${i}`} label={item.itemName} value={krw(item.amountKrw)} even={i % 2 === 1} indent isLast={isLast} />
                )
              })}
              <Row
                label="통관비용 합계"
                value={krw(data.customsDetailItems.reduce((s, r) => s + r.amountKrw, 0))}
                even={data.customsDetailItems.length % 2 === 1}
                isLast
              />
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

        <Text style={s.sectionLabel}>섹션 6 — 종합 정산</Text>
        {/* 최종정산 계산 breakdown */}
        <View style={{ borderWidth: 1, borderColor: BORDER, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 22, alignItems: 'center', backgroundColor: GRAY_BG }}>
            <Text style={{ flex: 1, paddingLeft: 10, fontSize: 8.5, color: MUTED }}>
              {exclusive ? '에이원 부담 (VAT 별도)' : '에이원 부담 (VAT 포함)'}
            </Text>
            <Text style={{ width: '40%', textAlign: 'right', paddingRight: 10, fontSize: 8.5 }}>
              {krwSigned(exclusive ? data.a1BurdenKrw : data.a1BurdenWithVatKrw)}
            </Text>
          </View>
          {data.closingCostItems.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 20, alignItems: 'center' }}>
              <Text style={{ flex: 1, paddingLeft: 20, fontSize: 8, color: MUTED }}>+ {item.itemName}</Text>
              <Text style={{ width: '40%', textAlign: 'right', paddingRight: 10, fontSize: 8, color: MUTED }}>{krwSigned(item.amountKrw)}</Text>
            </View>
          ))}
          {data.closingCostItems.length > 0 && (
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 20, alignItems: 'center' }}>
              <Text style={{ flex: 1, paddingLeft: 10, fontSize: 8, color: MUTED }}>기타 미정산 합계</Text>
              <Text style={{ width: '40%', textAlign: 'right', paddingRight: 10, fontSize: 8, color: MUTED }}>{krwSigned(data.closingCostsTotalKrw)}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', minHeight: 24, alignItems: 'center', backgroundColor: '#E8F5E9' }}>
            <Text style={{ flex: 1, paddingLeft: 10, fontSize: 9, color: GREEN, fontWeight: 700 }}>= 최종 정산금액</Text>
            <Text style={{ width: '40%', textAlign: 'right', paddingRight: 10, fontSize: 9, color: GREEN, fontWeight: 700 }}>{krwSigned(data.confirmedAmountKrw)}</Text>
          </View>
        </View>
        <View style={s.table}>
          <Row label="정산 방향" value={data.directionLabel} />
          <Row label="최종 정산액" value={krwSigned(data.confirmedAmountKrw)} even />
          <PaidRow isPaid={data.isPaid} isLast />
        </View>

        <View style={s.summaryBox}>
          <View>
            <Text style={s.summaryLabel}>최종 정산</Text>
            <Text style={{ fontSize: 10, color: GREEN_LIGHT, marginTop: 4 }}>{data.directionLabel}</Text>
          </View>
          <Text style={s.summaryValue}>₩ {Math.abs(data.confirmedAmountKrw).toLocaleString('ko-KR')}</Text>
        </View>

        {data.grandTotalKrw != null && data.interimConfirmedKrw != null && (
          <View style={s.grandTotalBox}>
            <Text style={{ fontSize: 9, fontWeight: 700, color: '#1B5E20', marginBottom: 8 }}>
              최종 종합 정산 (중간 + 클로징)
            </Text>
            <View style={s.grandTotalRow}>
              <Text style={{ fontSize: 9, color: '#2E7D32' }}>중간정산 확정금액</Text>
              <Text style={{ fontSize: 9, color: '#2E7D32', fontWeight: 700 }}>
                {krw(data.interimConfirmedKrw)}
              </Text>
            </View>
            <View style={s.grandTotalRow}>
              <Text style={{ fontSize: 9, color: '#2E7D32' }}>클로징 정산액</Text>
              <Text style={{ fontSize: 9, color: '#2E7D32', fontWeight: 700 }}>
                {krwSigned(data.confirmedAmountKrw)}
              </Text>
            </View>
            <View style={s.grandTotalDivider} />
            <View style={s.grandTotalRow}>
              <Text style={{ fontSize: 10, fontWeight: 700, color: '#1B5E20' }}>최종 합계</Text>
              <Text style={{ fontSize: 11, fontWeight: 700, color: '#1B5E20' }}>
                {krw(data.grandTotalKrw)}
              </Text>
            </View>
            <Text style={{ fontSize: 8, color: '#388E3C', marginTop: 4 }}>
              {data.grandTotalKrw >= 0 ? '한국에이원 → 토에이산교 지급' : '토에이산교 → 한국에이원 지급'}
            </Text>
          </View>
        )}

        {/* 계산 플로우 (중간정산 → 클로징 → 종합) */}
        {data.interimConfirmedKrw != null && data.grandTotalKrw != null && (
          <View>
            <Text style={s.sectionLabel}>계산 플로우 요약</Text>
            <View style={[s.table, { backgroundColor: '#f9fafb' }]}>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 22, alignItems: 'center' }}>
                <View style={{ flex: 1, paddingLeft: 10, paddingTop: 4, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 8.5, color: MUTED }}>수입원가 (USD×통관환율)</Text>
                </View>
                <View style={{ width: '40%', paddingRight: 10, paddingTop: 4, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 8.5, textAlign: 'right' }}>{krw(data.importAmountKrw)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 22, alignItems: 'center', backgroundColor: GRAY_BG }}>
                <View style={{ flex: 1, paddingLeft: 20, paddingTop: 4, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 8, color: MUTED }}>+ 통관/운송비</Text>
                </View>
                <View style={{ width: '40%', paddingRight: 10, paddingTop: 4, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 8, textAlign: 'right', color: MUTED }}>+{nonVatCostsTotal.toLocaleString('ko-KR')}원</Text>
                </View>
              </View>
              {data.vatAmountKrw != null && (
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 22, alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingLeft: 20, paddingTop: 4, paddingBottom: 4 }}>
                    <Text style={{ fontSize: 8, color: MUTED }}>+ 부가세</Text>
                  </View>
                  <View style={{ width: '40%', paddingRight: 10, paddingTop: 4, paddingBottom: 4 }}>
                    <Text style={{ fontSize: 8, textAlign: 'right', color: MUTED }}>+{data.vatAmountKrw.toLocaleString('ko-KR')}원</Text>
                  </View>
                </View>
              )}
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 24, alignItems: 'center', backgroundColor: GREEN }}>
                <View style={{ flex: 1, paddingLeft: 10, paddingTop: 4, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 9, color: WHITE, fontWeight: 700 }}>= 중간정산 확정금액</Text>
                </View>
                <View style={{ width: '40%', paddingRight: 10, paddingTop: 4, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 9, textAlign: 'right', color: WHITE, fontWeight: 700 }}>{krw(data.interimConfirmedKrw!)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 22, alignItems: 'center' }}>
                <View style={{ flex: 1, paddingLeft: 20, paddingTop: 4, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 8, color: MUTED }}>LC수수료</Text>
                </View>
                <View style={{ width: '40%', paddingRight: 10, paddingTop: 4, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 8, textAlign: 'right', color: MUTED }}>{krwSigned(data.lcFeeTotalKrw)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 22, alignItems: 'center', backgroundColor: GRAY_BG }}>
                <View style={{ flex: 1, paddingLeft: 20, paddingTop: 4, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 8, color: fxIsGain ? GREEN_GAIN : RED }}>{`- 환차${fxIsGain ? '익' : '손'}`}</Text>
                </View>
                <View style={{ width: '40%', paddingRight: 10, paddingTop: 4, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 8, textAlign: 'right', color: fxIsGain ? GREEN_GAIN : RED }}>{krwSigned(data.fxGainLossKrw)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 22, alignItems: 'center', backgroundColor: GRAY_BG }}>
                <View style={{ flex: 1, paddingLeft: 20, paddingTop: 4, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 8, color: MUTED }}>× 에이원 분담 ({data.fxBurdenA1Pct}%) + VAT</Text>
                </View>
                <View style={{ width: '40%', paddingRight: 10, paddingTop: 4, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 8, textAlign: 'right', color: MUTED }}>{krwSigned(data.a1BurdenWithVatKrw)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 24, alignItems: 'center', backgroundColor: additionalCost < 0 ? '#FEE2E2' : '#FEF9C3' }}>
                <View style={{ flex: 1, paddingLeft: 10, paddingTop: 4, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: 700, color: additionalCost < 0 ? RED : '#92400E' }}>= 클로징 정산금액</Text>
                </View>
                <View style={{ width: '40%', paddingRight: 10, paddingTop: 4, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 9, textAlign: 'right', fontWeight: 700, color: additionalCost < 0 ? RED : '#92400E' }}>{krwSigned(data.confirmedAmountKrw)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', minHeight: 26, alignItems: 'center', backgroundColor: '#1B5E20' }}>
                <View style={{ flex: 1, paddingLeft: 10, paddingTop: 5, paddingBottom: 5 }}>
                  <Text style={{ fontSize: 10, fontWeight: 700, color: WHITE }}>= 종합정산액</Text>
                </View>
                <View style={{ width: '40%', paddingRight: 10, paddingTop: 5, paddingBottom: 5 }}>
                  <Text style={{ fontSize: 10, textAlign: 'right', fontWeight: 700, color: WHITE }}>{krw(data.grandTotalKrw!)}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 환율 민감도 분석 */}
        {sensScenarios && (
          <View break>
            <Text style={s.sectionLabel}>환율 민감도 분석 (BOK 고시환율 시나리오)</Text>
            <View style={{ borderWidth: 1, borderColor: BORDER }}>
              <View style={{ flexDirection: 'row', backgroundColor: GREEN, minHeight: 18, alignItems: 'center' }}>
                <Text style={{ width: '20%', paddingLeft: 6, fontSize: 7.5, color: WHITE, fontWeight: 700 }}>환율 변동</Text>
                <Text style={{ width: '30%', textAlign: 'right', paddingRight: 8, fontSize: 7.5, color: WHITE, fontWeight: 700 }}>시뮬레이션 환율</Text>
                <Text style={{ width: '25%', textAlign: 'right', paddingRight: 8, fontSize: 7.5, color: WHITE, fontWeight: 700 }}>환차손익</Text>
                <Text style={{ flex: 1, textAlign: 'right', paddingRight: 8, fontSize: 7.5, color: WHITE, fontWeight: 700 }}>클로징 정산</Text>
              </View>
              {sensScenarios.map((sc, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    borderBottomWidth: i < sensScenarios.length - 1 ? 1 : 0,
                    borderBottomColor: BORDER,
                    minHeight: 18,
                    alignItems: 'center',
                    backgroundColor: sc.isActual ? '#E8F5E9' : i % 2 === 1 ? GRAY_BG : WHITE,
                  }}
                >
                  <Text style={{ width: '20%', paddingLeft: 6, fontSize: 7.5, color: sc.delta === 0 ? GREEN : sc.delta < 0 ? RED : '#1565C0', fontWeight: sc.isActual ? 700 : 400 }}>
                    {sc.delta === 0 ? '← 실제' : sc.delta > 0 ? `+${sc.delta}원` : `${sc.delta}원`}
                  </Text>
                  <Text style={{ width: '30%', textAlign: 'right', paddingRight: 8, fontSize: 7.5 }}>
                    {sc.simRate.toLocaleString('ko-KR')}원/$
                  </Text>
                  <Text style={{ width: '25%', textAlign: 'right', paddingRight: 8, fontSize: 7.5, color: sc.simFx >= 0 ? '#1565C0' : RED }}>
                    {sc.simFx >= 0 ? '+' : ''}{sc.simFx.toLocaleString('ko-KR')}원
                  </Text>
                  <Text style={{ flex: 1, textAlign: 'right', paddingRight: 8, fontSize: 7.5, color: sc.simFinal < 0 ? RED : sc.isActual ? GREEN : TEXT, fontWeight: sc.isActual ? 700 : 400 }}>
                    {sc.simFinal >= 0 ? '+' : ''}{sc.simFinal.toLocaleString('ko-KR')}원
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={s.footer}>
          <Text>발행일: {data.issuedAt}</Text>
          <Text>발행자: ㈜한국에이원</Text>
        </View>
      </Page>

      {/* 결재 도장 페이지 */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Image src={CI_A1} style={s.headerLogo} />
          <View style={s.headerCenter}>
            <Text style={s.companyName}>㈜한국에이원 ↔ 토에이산교</Text>
            <Text style={s.docTitle}>{data.roundLabel} — 결재 확인</Text>
          </View>
          <Image src={CI_TOEI} style={s.headerLogo} />
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
