import { Text, View } from '@react-pdf/renderer'
import { GREEN, GRAY_BG, BORDER, MUTED, WHITE, GREEN_GAIN, RED } from '../pdfStyles'
import { krw, krwSigned } from '../parts'
import { s } from './styles'
import type { ClosingPdfData } from './types'

export function FlowSection({ data, fxIsGain, additionalCost, nonVatCostsTotal }: {
  data: ClosingPdfData
  fxIsGain: boolean
  additionalCost: number
  nonVatCostsTotal: number
}) {
  return (
    <>
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
    </>
  )
}
