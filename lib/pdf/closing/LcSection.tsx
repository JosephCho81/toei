import { Text, View } from '@react-pdf/renderer'
import { MUTED } from '../pdfStyles'
import { Row, krw, krwSigned } from '../parts'
import { s, rowStyles } from './styles'
import type { ClosingPdfData } from './types'

export function LcSection({ data, fxIsGain, fxLabel, exclusive }: {
  data: ClosingPdfData
  fxIsGain: boolean
  fxLabel: string
  exclusive: boolean
}) {
  return (
    <>
        <Text style={s.sectionLabel}>섹션 3 — LC 결제 내역</Text>
        <View style={s.table}>
          <View style={s.rowOdd}>
            <View style={rowStyles.label}>
              <Text>{`원금×통관환율 (${data.customsExchangeRate.toLocaleString('ko-KR')}원/$)`}</Text>
            </View>
            <View style={rowStyles.value}>
              <Text>{krw(data.importAmountKrw)}</Text>
              {data.importAmountUsd ? (
                <Text style={{ fontSize: 7, color: MUTED, marginTop: 1 }}>
                  {`$${data.importAmountUsd.toLocaleString('en-US')}(수입금액USD) × ${data.customsExchangeRate.toLocaleString('ko-KR')}원 = ${data.importAmountKrw.toLocaleString('ko-KR')}원`}
                </Text>
              ) : null}
            </View>
          </View>
          <Row label="LC 결제비용" value={krw(data.lcPaymentTotalKrw)} even styles={rowStyles} />
          <View style={s.lastRowOdd}>
            <View style={rowStyles.label}><Text style={fxIsGain ? s.fxGainText : s.fxLossText}>{fxLabel}</Text></View>
            <View style={rowStyles.value}>
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
              styles={rowStyles} />
            )
          })}
          <Row
            label="LC 수수료 합계"
            value={krw(data.lcFeeTotalKrw)}
            even={data.lcFeeItems.length % 2 === 1}
            isLast
          styles={rowStyles} />
        </View>

        <Text style={s.sectionLabel}>섹션 4 — 추가비용 및 분담</Text>
        <View style={s.table}>
          <View style={s.rowOdd}>
            <View style={rowStyles.label}><Text>추가비용 합계 (VAT 별도)</Text></View>
            <View style={rowStyles.value}>
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
          styles={rowStyles} />
          <View style={s.rowOdd}>
            <View style={rowStyles.label}><Text>에이원 부담분 (VAT 별도)</Text></View>
            <View style={rowStyles.value}>
              <Text>{krwSigned(data.a1BurdenKrw)}</Text>
              <Text style={{ fontSize: 7, color: MUTED, marginTop: 1 }}>
                {`추가비용 ${krwSigned(data.additionalCostKrw)} × ${data.fxBurdenA1Pct}%(에이원분담) = ${krwSigned(data.a1BurdenKrw)}`}
              </Text>
            </View>
          </View>
          {exclusive ? (
            <>
              <View style={s.rowEven}>
                <View style={rowStyles.label}><Text>공급가 (부가세 별도)</Text></View>
                <View style={rowStyles.value}>
                  <Text>{krwSigned(data.supplyAmountKrw)}</Text>
                  <Text style={{ fontSize: 7, color: MUTED, marginTop: 1 }}>
                    {`에이원 부담분 ${krwSigned(data.a1BurdenKrw)}${data.closingCostsTotalKrw !== 0 ? ` + 기타 미정산 부담분 ${krwSigned(data.a1ClosingCostsKrw)}` : ''}`}
                  </Text>
                </View>
              </View>
              <View style={s.lastRowOdd}>
                <View style={rowStyles.label}><Text>부가세 (공급가 x 10%)</Text></View>
                <View style={rowStyles.value}>
                  <Text>{krwSigned(data.outputVatKrw)}</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={s.lastRowEven}>
              <View style={rowStyles.label}><Text>에이원 부담분 + VAT (VAT 포함)</Text></View>
              <View style={rowStyles.value}>
                <Text>{krwSigned(data.a1BurdenWithVatKrw)}</Text>
                <Text style={{ fontSize: 7, color: MUTED, marginTop: 1 }}>
                  {`VAT별도 ${krwSigned(data.a1BurdenKrw)} × 1.1(VAT 10%) = ${krwSigned(data.a1BurdenWithVatKrw)}`}
                </Text>
              </View>
            </View>
          )}
        </View>
    </>
  )
}
