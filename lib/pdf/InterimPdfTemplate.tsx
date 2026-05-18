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
  vatAmountKrw: number
  totalWithVatKrw: number
  confirmedAmountKrw: number
  isPaid: boolean
  issuedAt: string
}

const GREEN = '#2E7D32'
const GREEN_LIGHT = '#388E3C'
const GRAY_BG = '#f7f9fc'
const BORDER = '#A5D6A7'
const TEXT = '#333333'
const MUTED = '#5a6778'
const WHITE = '#ffffff'

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
    width: '38%',
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
  cellValue: {
    width: '62%',
    paddingLeft: 10,
    paddingRight: 8,
    paddingTop: 6,
    paddingBottom: 6,
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
    backgroundColor: '#16a34a',
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 3,
    paddingBottom: 3,
    alignSelf: 'flex-start',
  },
  unpaidView: {
    backgroundColor: '#dc2626',
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
})

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

export function InterimPdfDocument({ data }: { data: InterimPdfData }) {
  const marginLabel = data.marginRatePct != null
    ? `총 판매금액 (마진율 ${data.marginRatePct}%)`
    : '총 판매금액'

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

        <Text style={s.sectionLabel}>기본 정보</Text>
        <View style={s.table}>
          <Row label="회 차" value={data.roundLabel} />
          <Row label="제조사명" value={data.manufacturerName} even />
          <Row label="L/C 개설일" value={fdate(data.lcOpenDate)} />
          <Row label="지불일 (A1)" value={fdate(data.customsDate)} even isLast />
        </View>

        <Text style={s.sectionLabel}>수입 금액</Text>
        <View style={s.table}>
          <Row label="수입금액 (USD)" value={usd(data.importAmountUsd)} />
          <Row label="지정환율" value={data.customsExchangeRate.toLocaleString('ko-KR') + '원/$'} even />
          <Row label="원화 환산" value={krw(data.importAmountKrw)} isLast />
        </View>

        <Text style={s.sectionLabel}>비용 내역</Text>
        <View style={s.table}>
          <Row label="총 수입비용+관세" value={krw(data.totalCostKrw)} />
          <Row label="부가세" value={krw(data.vatAmountKrw)} even />
          <Row label={marginLabel} value={krw(data.totalWithVatKrw)} isLast />
        </View>

        <Text style={s.sectionLabel}>지불 현황</Text>
        <View style={s.table}>
          <Row label="최종 지급액" value={krw(data.confirmedAmountKrw)} />
          <PaidRow isPaid={data.isPaid} even isLast />
        </View>

        <View style={s.summaryBox}>
          <Text style={s.summaryLabel}>최종 지급액</Text>
          <Text style={s.summaryValue}>{krw(data.confirmedAmountKrw)}</Text>
        </View>

        <View style={s.footer}>
          <Text>발행일: {data.issuedAt}</Text>
          <Text>발행자: ㈜한국에이원</Text>
        </View>
      </Page>
    </Document>
  )
}
