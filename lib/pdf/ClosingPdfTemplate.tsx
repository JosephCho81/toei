import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

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
  shippingItems: { itemName: string; amountKrw: number }[]
  customsItems: { itemName: string; amountKrw: number }[]
}

const NAVY = '#1e3a5f'
const NAVY_LIGHT = '#2a4f7a'
const GRAY_BG = '#f7f9fc'
const BORDER = '#d0d7e3'
const TEXT = '#333333'
const MUTED = '#5a6778'
const WHITE = '#ffffff'
const GREEN = '#16a34a'
const RED = '#dc2626'

const BLUE_DARK = '#1e3a5f'

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
    backgroundColor: NAVY,
    padding: 18,
    marginBottom: 20,
  },
  companyName: {
    color: WHITE,
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 8,
  },
  docTitle: {
    color: WHITE,
    fontSize: 15,
    fontWeight: 700,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 8.5,
    color: NAVY_LIGHT,
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
    color: GREEN,
    fontWeight: 700,
  },
  fxLossText: {
    color: RED,
    fontWeight: 700,
  },
  summaryBox: {
    backgroundColor: '#e8eef7',
    borderWidth: 1.5,
    borderColor: NAVY,
    padding: 14,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: NAVY,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 700,
    color: NAVY,
  },
  paidView: {
    backgroundColor: GREEN,
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
  itemsTable: {
    borderWidth: 1,
    borderColor: BORDER,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    backgroundColor: BLUE_DARK,
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
          <Text style={s.companyName}>㈜한국에이원</Text>
          <Text style={s.docTitle}>A1 KOREA, LC 거래 최종정산 내역</Text>
        </View>

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
          <Row label="추가비용 합계" value={krwSigned(data.additionalCostKrw)} />
          <Row
            label={`에이원 부담 비율`}
            value={`${data.fxBurdenA1Pct}% (토에이 ${100 - data.fxBurdenA1Pct}%)`}
            even
          />
          <Row label="에이원 부담분" value={krwSigned(data.a1BurdenKrw)} />
          <Row label="에이원 부담분 + VAT" value={krwSigned(data.a1BurdenWithVatKrw)} even isLast />
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
            label="추가비용 소계"
            value={krw(data.closingCostsTotalKrw)}
            even={data.closingCostItems.length % 2 === 1}
            isLast
          />
        </View>

        <Text style={s.sectionLabel}>최종 정산액</Text>
        <View style={s.table}>
          <Row label="정산 방향" value={data.directionLabel} />
          <Row label="최종 정산액" value={krwSigned(data.confirmedAmountKrw)} even />
          <PaidRow isPaid={data.isPaid} isLast />
        </View>

        <View style={s.summaryBox}>
          <View>
            <Text style={s.summaryLabel}>🏁 최종 정산</Text>
            <Text style={{ fontSize: 10, color: NAVY_LIGHT, marginTop: 4 }}>{data.directionLabel}</Text>
          </View>
          <Text style={s.summaryValue}>₩ {Math.abs(data.confirmedAmountKrw).toLocaleString('ko-KR')}</Text>
        </View>

        <View style={s.footer}>
          <Text>발행일: {data.issuedAt}</Text>
          <Text>발행자: ㈜한국에이원</Text>
        </View>
      </Page>
    </Document>
  )
}
