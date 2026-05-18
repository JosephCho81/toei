import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
import path from 'path'

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
  lcPaymentTotalKrw: number
  importAmountKrw: number
  fxGainLossKrw: number
  lcFeeItems: { itemName: string; amountKrw: number }[]
  lcFeeTotalKrw: number
  additionalCostKrw: number
  fxBurdenA1Pct: number
  a1BurdenKrw: number
  a1BurdenWithVatKrw: number
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

const GREEN = '#2E7D32'
const GREEN_LIGHT = '#388E3C'
const GRAY_BG = '#f7f9fc'
const BORDER = '#A5D6A7'
const TEXT = '#333333'
const MUTED = '#5a6778'
const WHITE = '#ffffff'
const GREEN_GAIN = '#16a34a'
const RED = '#dc2626'

const s = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansKR',
    fontSize: 10,
    color: TEXT,
    paddingTop: 36,
    paddingBottom: 60,
    paddingLeft: 40,
    paddingRight: 40,
  },
  header: {
    backgroundColor: GREEN,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLogo: {
    height: 40,
    width: 80,
    objectFit: 'contain',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  companyName: {
    color: WHITE,
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 5,
    textAlign: 'center',
  },
  docTitle: {
    color: WHITE,
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 8.5,
    color: GREEN_LIGHT,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 3,
  },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
  },
  rowOdd: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 26,
    alignItems: 'center',
  },
  rowEven: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 26,
    alignItems: 'center',
    backgroundColor: GRAY_BG,
  },
  lastRowOdd: {
    flexDirection: 'row',
    minHeight: 26,
    alignItems: 'center',
  },
  lastRowEven: {
    flexDirection: 'row',
    minHeight: 26,
    alignItems: 'center',
    backgroundColor: GRAY_BG,
  },
  cellLabel: {
    width: '42%',
    paddingLeft: 10,
    paddingRight: 8,
    paddingTop: 6,
    paddingBottom: 6,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    color: MUTED,
    fontWeight: 700,
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
  fxGainText: {
    color: GREEN_GAIN,
    fontWeight: 700,
  },
  fxLossText: {
    color: RED,
    fontWeight: 700,
  },
  summaryBox: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: GREEN,
    padding: 14,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalBox: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    padding: 12,
    marginTop: 12,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  grandTotalDivider: {
    borderTopWidth: 1,
    borderTopColor: '#A5D6A7',
    marginTop: 6,
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: GREEN,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 700,
    color: GREEN,
  },
  paidView: {
    backgroundColor: GREEN_GAIN,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 3,
    paddingBottom: 3,
    alignSelf: 'flex-start',
  },
  unpaidView: {
    backgroundColor: RED,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 3,
    paddingBottom: 3,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: WHITE,
    fontSize: 9,
    fontWeight: 700,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
    fontSize: 8,
    color: '#9aa3b0',
  },
  disclaimer: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'right',
    marginBottom: 10,
  },
  itemsTable: {
    borderWidth: 1,
    borderColor: BORDER,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    backgroundColor: GREEN,
    minHeight: 20,
    alignItems: 'center',
  },
  itemsHeaderCell: {
    color: WHITE,
    fontSize: 7.5,
    fontWeight: 700,
    paddingLeft: 5,
    paddingRight: 3,
    paddingTop: 4,
    paddingBottom: 4,
  },
  itemsDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 20,
    alignItems: 'center',
  },
  itemsDataRowEven: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 20,
    alignItems: 'center',
    backgroundColor: GRAY_BG,
  },
  itemsDataRowLast: {
    flexDirection: 'row',
    minHeight: 20,
    alignItems: 'center',
  },
  itemsDataRowLastEven: {
    flexDirection: 'row',
    minHeight: 20,
    alignItems: 'center',
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
})

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

export function ClosingPdfDocument({ data }: { data: ClosingPdfData }) {
  const fxIsGain = data.fxGainLossKrw >= 0
  const fxLabel = fxIsGain
    ? `환차익 (A1 유리, ${data.fxBurdenA1Pct}% 수령)`
    : `환차손 (A1 불리, ${data.fxBurdenA1Pct}% 부담)`

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
        <Text style={s.sectionLabel}>기본 정보</Text>
        <View style={s.table}>
          <Row label="회 차" value={data.roundLabel} />
          <Row label="제조사명" value={data.manufacturerName} even isLast />
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
                    <Text style={[s.itemsCell, { width: '20%' }]}>{item.unitPriceUsd.toFixed(2)}</Text>
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
            <Text style={s.sectionLabel}>중간정산 내역</Text>
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

        <Text style={s.sectionLabel}>LC 결제비용 및 환차손익</Text>
        <View style={s.table}>
          <Row
            label={`원금×통관환율 (${data.customsExchangeRate.toLocaleString('ko-KR')}원/$)`}
            value={krw(data.importAmountKrw)}
          />
          <Row label="LC 결제비용" value={krw(data.lcPaymentTotalKrw)} even />
          <Row
            label={fxLabel}
            value={krwSigned(data.fxGainLossKrw)}
            isLast
            valueStyle={fxIsGain ? s.fxGainText : s.fxLossText}
          />
        </View>

        <Text style={s.sectionLabel}>LC 수수료</Text>
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

        <Text style={s.sectionLabel}>분담 비율 및 에이원 부담분</Text>
        <View style={s.table}>
          <Row label="추가비용 합계 (VAT 별도)" value={krwSigned(data.additionalCostKrw)} />
          <Row
            label={`에이원 부담 비율`}
            value={`${data.fxBurdenA1Pct}% (토에이 ${100 - data.fxBurdenA1Pct}%)`}
            even
          />
          <Row label="에이원 부담분 (VAT 별도)" value={krwSigned(data.a1BurdenKrw)} />
          <Row label="에이원 부담분 + VAT (VAT 포함)" value={krwSigned(data.a1BurdenWithVatKrw)} even isLast />
        </View>

        <Text style={s.sectionLabel}>클로징 추가비용 (A+B+C)</Text>
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

        <Text style={s.sectionLabel}>최종 정산액</Text>
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

        <View style={s.footer}>
          <Text>발행일: {data.issuedAt}</Text>
          <Text>발행자: ㈜한국에이원</Text>
        </View>
      </Page>
    </Document>
  )
}
