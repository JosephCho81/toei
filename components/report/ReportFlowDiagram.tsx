interface Props {
  importAmountKrw: number
  nonVatCostsTotal: number
  vatAmountKrw: number
  interimConfirmedKrw: number
  fxGainLossKrw: number
  lcFeeTotalKrw: number
  fxBurdenPct: number
  a1BurdenKrw: number
  a1BurdenWithVatKrw: number
  closingCostsTotalKrw: number
  closingConfirmedKrw: number
  grandTotalKrw: number
}

function fmt(n: number) {
  return n.toLocaleString('ko-KR')
}

function signed(n: number) {
  return `${n >= 0 ? '+' : ''}${fmt(n)}`
}

function FlowRow({ label, value, color, indent }: {
  label: string; value: string; color?: string; indent?: boolean
}) {
  return (
    <div className={`flex justify-between items-center py-0.5 text-sm ${indent ? 'pl-6' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-medium ${color ?? ''}`}>{value}</span>
    </div>
  )
}

function FlowTotal({ label, value, colorClass }: { label: string; value: string; colorClass: string }) {
  return (
    <div className={`flex justify-between items-center px-3 py-2 rounded-md font-bold text-sm ${colorClass}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

function Arrow() {
  return <div className="text-center text-muted-foreground text-xs my-0.5">↓</div>
}

export function ReportFlowDiagram(props: Props) {
  const {
    importAmountKrw, nonVatCostsTotal, vatAmountKrw, interimConfirmedKrw,
    fxGainLossKrw, lcFeeTotalKrw, fxBurdenPct, a1BurdenKrw,
    a1BurdenWithVatKrw, closingCostsTotalKrw, closingConfirmedKrw, grandTotalKrw,
  } = props

  const fxIsGain = fxGainLossKrw >= 0
  const additionalCostKrw = fxGainLossKrw + lcFeeTotalKrw

  return (
    <div className="mb-4 break-inside-avoid">
      <p className="text-xs font-semibold text-muted-foreground mb-2">계산 플로우</p>
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-0.5">
        {/* 중간정산 계산 */}
        <FlowRow label="수입원가 (USD × 통관환율)" value={`${fmt(importAmountKrw)}원`} />
        <FlowRow label={`+ 통관/운송비`} value={`+${fmt(nonVatCostsTotal)}원`} indent />
        <FlowRow label="+ 부가세" value={`+${fmt(vatAmountKrw)}원`} indent />
        <div className="border-t border-gray-300 my-1" />
        <FlowTotal
          label="= 중간정산 확정금액"
          value={`${fmt(interimConfirmedKrw)}원`}
          colorClass="bg-green-700 text-white"
        />
        <Arrow />

        {/* 클로징 계산 */}
        <FlowRow
          label={`환율차액 (환차${fxIsGain ? '익' : '손'})`}
          value={signed(fxGainLossKrw) + '원'}
          color={fxIsGain ? 'text-blue-600' : 'text-red-600'}
        />
        <FlowRow label="+ LC 제비용" value={`+${fmt(lcFeeTotalKrw)}원`} indent />
        <FlowRow
          label="= 추가비용 합계"
          value={signed(additionalCostKrw) + '원'}
          color={additionalCostKrw < 0 ? 'text-red-600' : ''}
        />
        <FlowRow
          label={`× 에이원 분담 (${fxBurdenPct}%)`}
          value={signed(a1BurdenKrw) + '원'}
          indent
        />
        <FlowRow label="× VAT (×1.1)" value={signed(a1BurdenWithVatKrw) + '원'} indent />
        {closingCostsTotalKrw !== 0 && (
          <FlowRow label="+ 기타 미정산 비용" value={signed(closingCostsTotalKrw) + '원'} indent />
        )}
        <div className="border-t border-gray-300 my-1" />
        <FlowTotal
          label="= 클로징 정산금액"
          value={`${signed(closingConfirmedKrw)}원`}
          colorClass={closingConfirmedKrw < 0 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}
        />
        <Arrow />

        {/* 종합 */}
        <FlowRow label="중간정산 확정금액" value={`+${fmt(interimConfirmedKrw)}원`} />
        <FlowRow label="클로징 정산금액" value={`${signed(closingConfirmedKrw)}원`} />
        <div className="border-t border-gray-300 my-1" />
        <FlowTotal
          label="= 종합정산액"
          value={`${fmt(grandTotalKrw)}원`}
          colorClass="bg-green-800 text-white text-base"
        />
      </div>
    </div>
  )
}
