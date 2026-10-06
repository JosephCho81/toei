interface Props {
  importAmountKrw: number
  interimConfirmedKrw: number
  fxGainLossKrw: number
  lcFeeTotalKrw: number
  fxBurdenPct: number
  a1BurdenKrw: number
  a1BurdenWithVatKrw: number
  closingCostsTotalKrw: number
  a1ClosingCostsKrw: number
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
      <span className={`tabular-nums font-medium ${color ?? ''}`}>{value}</span>
    </div>
  )
}

function FlowTotal({ label, value, colorClass }: { label: string; value: string; colorClass: string }) {
  return (
    <div className={`flex justify-between items-center px-3 py-2 rounded-md font-bold text-sm ${colorClass}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function Arrow() {
  return <div className="text-center text-muted-foreground text-sm my-0.5">↓</div>
}

export function ReportFlowDiagram(props: Props) {
  const {
    importAmountKrw, interimConfirmedKrw,
    fxGainLossKrw, lcFeeTotalKrw, fxBurdenPct, a1BurdenKrw,
    a1BurdenWithVatKrw, closingCostsTotalKrw, a1ClosingCostsKrw, closingConfirmedKrw, grandTotalKrw,
  } = props

  const fxIsGain = fxGainLossKrw >= 0
  const additionalCostKrw = lcFeeTotalKrw - fxGainLossKrw

  return (
    <div className="mb-4 break-inside-avoid">
      <p className="text-sm font-semibold text-muted-foreground mb-2">계산 플로우</p>
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-0.5">
        {/* 중간정산 — 관세·과세 항목 부가세가 빠져 「수입원가 + 통관/운송비 + 부가세」가 확정금액과
            맞지 않았다(담당자 2026-10-06). 덧셈처럼 보이지 않게 두 금액만 세운다. 내역은 III 절에 있다 */}
        <FlowRow label="수입금액 (USD × 통관환율)" value={`${fmt(importAmountKrw)}원`} />
        <FlowTotal
          label="중간정산 확정금액"
          value={`${fmt(interimConfirmedKrw)}원`}
          colorClass="bg-slate-100 text-slate-700"
        />
        <Arrow />

        {/* 클로징 계산 */}
        <FlowRow label="LC 제비용" value={`${fmt(lcFeeTotalKrw)}원`} />
        <FlowRow
          label={`- 환율차액 (환차${fxIsGain ? '익' : '손'})`}
          value={signed(fxGainLossKrw) + '원'}
          color={fxIsGain ? 'text-slate-600' : 'text-red-600'}
          indent
        />
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
          <FlowRow
            label={`+ 기타 미정산 비용 × ${fxBurdenPct}%`}
            value={signed(a1ClosingCostsKrw) + '원'}
            indent
          />
        )}
        <div className="border-t border-gray-300 my-1" />
        <FlowTotal
          label="= 클로징 정산금액"
          value={`${signed(closingConfirmedKrw)}원`}
          colorClass={closingConfirmedKrw < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}
        />
        <Arrow />

        {/* 종합 */}
        <FlowRow label="중간정산 확정금액" value={`+${fmt(interimConfirmedKrw)}원`} />
        <FlowRow label="클로징 정산금액" value={`${signed(closingConfirmedKrw)}원`} />
        <div className="border-t border-gray-300 my-1" />
        <FlowTotal
          label="= 종합정산액"
          value={`${fmt(grandTotalKrw)}원`}
          colorClass="bg-slate-100 text-slate-700 text-base"
        />
      </div>
    </div>
  )
}
