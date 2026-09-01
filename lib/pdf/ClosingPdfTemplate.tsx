import { Document, Page, Text, View } from '@react-pdf/renderer'
import { ApprovalPage, PdfFooter, PdfHeader, Row } from './parts'
import { buildSensScenarios } from './closingSensitivity'
import { s, rowStyles } from './closing/styles'
import { ItemsSection } from './closing/ItemsSection'
import { LcSection } from './closing/LcSection'
import { CostSection } from './closing/CostSection'
import { SummarySection } from './closing/SummarySection'
import { FlowSection } from './closing/FlowSection'
import { SensSection } from './closing/SensSection'
import type { ClosingPdfData } from './closing/types'

export type { ClosingPdfData }

export function ClosingPdfDocument({ data }: { data: ClosingPdfData }) {
  const fxIsGain = data.fxGainLossKrw >= 0
  const fxLabel = fxIsGain
    ? `환차익 (A1 유리, ${data.fxBurdenA1Pct}% 수령)`
    : `환차손 (A1 불리, ${data.fxBurdenA1Pct}% 부담)`
  const additionalCost = data.lcFeeTotalKrw - data.fxGainLossKrw
  const exclusive = data.vatMode !== 'inclusive'
  const nonVatCostsTotal = [...data.shippingItems, ...data.customsItems].reduce((s, r) => s + r.amountKrw, 0)
  const sensScenarios = data.bokExchangeRate != null && data.importAmountUsd
    ? buildSensScenarios({
        bokExchangeRate: data.bokExchangeRate,
        importAmountUsd: data.importAmountUsd,
        customsExchangeRate: data.customsExchangeRate,
        lcPaymentTotalUsd: data.lcPaymentTotalUsd,
        lcPaymentTotalKrw: data.lcPaymentTotalKrw,
        advancePaymentUsd: data.advancePaymentUsd,
        advanceExchangeRate: data.advanceExchangeRate,
        lcFeeTotalKrw: data.lcFeeTotalKrw,
        closingCostsTotalKrw: data.closingCostsTotalKrw,
        fxBurdenA1Pct: data.fxBurdenA1Pct,
        roundingPolicy: data.roundingPolicy,
        vatMode: data.vatMode,
      })
    : null

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PdfHeader title="LC 거래 최종정산 내역" />

        <Text style={s.disclaimer}>※ 모든 금액은 부가세 별도 기준입니다.</Text>
        <Text style={s.sectionLabel}>섹션 1 — 기본 정보</Text>
        <View style={s.table}>
          <Row label="회 차" value={data.roundLabel} styles={rowStyles} />
          <Row label="제조사명" value={data.manufacturerName} even isLast styles={rowStyles} />
        </View>

        <Text style={s.sectionLabel}>섹션 2 — 환율 정보</Text>
        <View style={s.table}>
          <Row
            label="통관환율 (입고시)"
            value={`${data.customsExchangeRate.toLocaleString('ko-KR')}원/$`}
          styles={rowStyles} />
          <Row
            label="클로징환율 (L/C 결제)"
            value={data.bokExchangeRate != null ? `${data.bokExchangeRate.toLocaleString('ko-KR')}원/$` : '-'}
            even
          styles={rowStyles} />
          <Row
            label="LC 결제일"
            value={data.closingDate ?? '-'}
            isLast
          styles={rowStyles} />
        </View>

        <ItemsSection data={data} />

        <LcSection data={data} fxIsGain={fxIsGain} fxLabel={fxLabel} exclusive={exclusive} />

        <CostSection data={data} />

        <SummarySection data={data} exclusive={exclusive} />

        <FlowSection
          data={data}
          fxIsGain={fxIsGain}
          additionalCost={additionalCost}
          nonVatCostsTotal={nonVatCostsTotal}
        />

        <SensSection sensScenarios={sensScenarios} />

        <PdfFooter issuedAt={data.issuedAt} />
      </Page>

      <ApprovalPage roundLabel={data.roundLabel} issuedAt={data.issuedAt} />
    </Document>
  )
}
