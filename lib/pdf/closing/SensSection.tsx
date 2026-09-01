import { Text, View } from '@react-pdf/renderer'
import { GREEN, GRAY_BG, BORDER, TEXT, WHITE, RED } from '../pdfStyles'
import { s } from './styles'
import type { SensScenario } from '../closingSensitivity'

export function SensSection({ sensScenarios }: { sensScenarios: SensScenario[] | null }) {
  return (
    <>
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
    </>
  )
}
