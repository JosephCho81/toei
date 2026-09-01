import { Text, View } from '@react-pdf/renderer'
import { pdfStyles, GREEN, GRAY_BG, BORDER, MUTED } from './pdfStyles'

/** 수입원가 대 통관·운송비 비율. 총액이 0 이하면 아무것도 그리지 않는다. */
export function CostRatioBlock({ importAmountKrw, costsKrw }: {
  importAmountKrw: number
  costsKrw: number
}) {
  const total = importAmountKrw + costsKrw
  const segments = [
    { label: '수입원가', amount: importAmountKrw, color: GREEN },
    { label: '통관/운송비', amount: costsKrw, color: '#f97316' },
  ].filter((seg) => seg.amount > 0)
  if (total <= 0 || segments.length === 0) return null

  return (
    <View>
      <Text style={pdfStyles.sectionLabel}>원가 구성 비율</Text>
      <View style={{ borderWidth: 1, borderColor: BORDER, padding: 8, backgroundColor: GRAY_BG }}>
        {segments.map((seg) => (
          <View key={seg.label} style={{ flexDirection: 'row', marginBottom: 3, alignItems: 'center' }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: seg.color, marginRight: 6 }} />
            <Text style={{ fontSize: 8, color: MUTED, width: 80 }}>{seg.label}</Text>
            <Text style={{ fontSize: 8, color: seg.color, fontWeight: 700, width: 40, textAlign: 'right' }}>
              {Math.round((seg.amount / total) * 100)}%
            </Text>
            <Text style={{ fontSize: 8, color: MUTED, marginLeft: 8 }}>
              ({seg.amount.toLocaleString('ko-KR')}원)
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
