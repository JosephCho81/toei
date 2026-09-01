import { Page, Text, View, Font, Image } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/stylesheet'
import path from 'path'
import { pdfStyles, BORDER, MUTED } from './pdfStyles'

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

export const CI_A1 = path.join(process.cwd(), 'public', 'CI_a1korea.png')
export const CI_TOEI = path.join(process.cwd(), 'public', 'CI_toei.png')

export function krw(n: number): string {
  return n.toLocaleString('ko-KR') + '원'
}

export function krwSigned(n: number): string {
  return (n >= 0 ? '+' : '') + n.toLocaleString('ko-KR') + '원'
}

export function usd(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fdate(value: string | null): string {
  return value ?? '-'
}

/** 두 회사 CI 를 양옆에 둔 문서 머리말. */
export function PdfHeader({ title }: { title: string }) {
  return (
    <View style={pdfStyles.header}>
      <Image src={CI_A1} style={pdfStyles.headerLogo} />
      <View style={pdfStyles.headerCenter}>
        <Text style={pdfStyles.companyName}>㈜한국에이원 ↔ 토에이산교</Text>
        <Text style={pdfStyles.docTitle}>{title}</Text>
      </View>
      <Image src={CI_TOEI} style={pdfStyles.headerLogo} />
    </View>
  )
}

const cell = (width: string, paddingLeft: number, extra: object = {}) => ({
  width,
  paddingLeft,
  paddingRight: 8,
  paddingTop: 6,
  paddingBottom: 6,
  ...extra,
})

/**
 * 라벨/값 2단 표의 한 행.
 * 라벨 폭은 문서마다 다르다 — 중간정산 38% / 최종정산 42%.
 */
export function labelStyles(labelWidth: string) {
  const valueWidth = `${100 - parseFloat(labelWidth)}%`
  return {
    label: cell(labelWidth, 10, {
      borderRightWidth: 1, borderRightColor: BORDER,
      color: MUTED, fontWeight: 700 as const, fontSize: 9,
    }),
    labelIndent: cell(labelWidth, 22, {
      borderRightWidth: 1, borderRightColor: BORDER,
      color: MUTED, fontSize: 9, paddingTop: 5, paddingBottom: 5,
    }),
    value: cell(valueWidth, 10),
  }
}

function rowStyleFor(even?: boolean, isLast?: boolean) {
  return isLast
    ? (even ? pdfStyles.lastRowEven : pdfStyles.lastRowOdd)
    : (even ? pdfStyles.rowEven : pdfStyles.rowOdd)
}

export function Row({
  label, value, even, isLast, indent, valueStyle, styles,
}: {
  label: string
  value: string
  even?: boolean
  isLast?: boolean
  indent?: boolean
  valueStyle?: Style
  styles: ReturnType<typeof labelStyles>
}) {
  return (
    <View style={rowStyleFor(even, isLast)}>
      <View style={indent ? styles.labelIndent : styles.label}><Text>{label}</Text></View>
      <View style={styles.value}><Text style={valueStyle ?? {}}>{value}</Text></View>
    </View>
  )
}

export function PaidRow({
  isPaid, even, isLast, styles,
}: {
  isPaid: boolean
  even?: boolean
  isLast?: boolean
  styles: ReturnType<typeof labelStyles>
}) {
  return (
    <View style={rowStyleFor(even, isLast)}>
      <View style={styles.label}><Text>지불여부</Text></View>
      <View style={styles.value}>
        <View style={isPaid ? pdfStyles.paidView : pdfStyles.unpaidView}>
          <Text style={pdfStyles.badgeText}>{isPaid ? '지불완료' : '미지불'}</Text>
        </View>
      </View>
    </View>
  )
}

export function PdfFooter({ issuedAt }: { issuedAt: string }) {
  return (
    <View style={pdfStyles.footer}>
      <Text>발행일: {issuedAt}</Text>
      <Text>발행자: ㈜한국에이원</Text>
    </View>
  )
}

const stamp = {
  box: { flexDirection: 'row' as const, borderWidth: 1, borderColor: '#9ca3af' },
  col: { flex: 1, borderRightWidth: 1, borderRightColor: '#9ca3af' },
  colLast: { flex: 1 },
  head: {
    fontSize: 9, textAlign: 'center' as const, paddingTop: 6, paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: '#9ca3af', color: MUTED,
  },
  space: { height: 80 },
}

/** 결재 도장란. 중간·최종정산 PDF 마지막 장이 동일하다. */
export function ApprovalPage({ roundLabel, issuedAt }: { roundLabel: string; issuedAt: string }) {
  return (
    <Page size="A4" style={pdfStyles.page}>
      <PdfHeader title={`${roundLabel} — 결재 확인`} />
      <View style={{ marginTop: 40 }}>
        <Text style={{ fontSize: 9, color: MUTED, textAlign: 'center', marginBottom: 10 }}>결재</Text>
        <View style={stamp.box}>
          {['담당자', '확인자', '승인자'].map((label, i) => (
            <View key={label} style={i < 2 ? stamp.col : stamp.colLast}>
              <Text style={stamp.head}>{label}</Text>
              <View style={stamp.space} />
            </View>
          ))}
        </View>
      </View>
      <PdfFooter issuedAt={issuedAt} />
    </Page>
  )
}
