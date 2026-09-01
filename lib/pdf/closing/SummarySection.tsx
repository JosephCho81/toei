import { Text, View } from '@react-pdf/renderer'
import { GREEN, GREEN_LIGHT, GRAY_BG, BORDER, MUTED } from '../pdfStyles'
import { Row, PaidRow, krw, krwSigned } from '../parts'
import { s, rowStyles } from './styles'
import type { ClosingPdfData } from './types'

export function SummarySection({ data, exclusive }: { data: ClosingPdfData; exclusive: boolean }) {
  return (
    <>
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
            <>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 20, alignItems: 'center' }}>
                <Text style={{ flex: 1, paddingLeft: 10, fontSize: 8, color: MUTED }}>기타 미정산 합계</Text>
                <Text style={{ width: '40%', textAlign: 'right', paddingRight: 10, fontSize: 8, color: MUTED }}>{krwSigned(data.closingCostsTotalKrw)}</Text>
              </View>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 20, alignItems: 'center' }}>
                <Text style={{ flex: 1, paddingLeft: 20, fontSize: 8, color: MUTED }}>{`× 에이원 분담 (${data.fxBurdenA1Pct}%)`}</Text>
                <Text style={{ width: '40%', textAlign: 'right', paddingRight: 10, fontSize: 8, color: MUTED }}>{krwSigned(data.a1ClosingCostsKrw)}</Text>
              </View>
            </>
          )}
          <View style={{ flexDirection: 'row', minHeight: 24, alignItems: 'center', backgroundColor: '#E8F5E9' }}>
            <Text style={{ flex: 1, paddingLeft: 10, fontSize: 9, color: GREEN, fontWeight: 700 }}>= 최종 정산금액</Text>
            <Text style={{ width: '40%', textAlign: 'right', paddingRight: 10, fontSize: 9, color: GREEN, fontWeight: 700 }}>{krwSigned(data.confirmedAmountKrw)}</Text>
          </View>
        </View>
        <View style={s.table}>
          <Row label="정산 방향" value={data.directionLabel} styles={rowStyles} />
          <Row label="최종 정산액" value={krwSigned(data.confirmedAmountKrw)} even styles={rowStyles} />
          <PaidRow isPaid={data.isPaid} isLast styles={rowStyles} />
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
    </>
  )
}
