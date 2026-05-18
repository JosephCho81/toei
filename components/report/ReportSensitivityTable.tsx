import { formatKrw } from '@/lib/utils/format'

interface Props {
  bokRate: number
  importUsd: number
  importAmountKrw: number
  lcFeeTotal: number
  fxBurdenPct: number
  closingCostsTotal: number
}

const DELTAS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50]

export function ReportSensitivityTable({
  bokRate, importUsd, importAmountKrw, lcFeeTotal, fxBurdenPct, closingCostsTotal,
}: Props) {
  const scenarios = DELTAS.map(delta => {
    const simRate = bokRate + delta
    const simLcPayment = Math.round(importUsd * simRate)
    const simFxGainLoss = simLcPayment - importAmountKrw
    const simAdditional = simFxGainLoss + lcFeeTotal
    const simA1Burden = Math.round(simAdditional * (fxBurdenPct / 100))
    const simA1WithVat = Math.round(simA1Burden * 1.1)
    const simFinal = simA1WithVat + closingCostsTotal
    return { delta, simRate, simFxGainLoss, simFinal, isActual: delta === 0 }
  })

  return (
    <div className="mb-4 break-inside-avoid print:break-before-avoid">
      <p className="text-xs font-semibold text-muted-foreground mb-2">환율 민감도 분석</p>
      <p className="text-xs text-muted-foreground mb-2">
        BOK 고시환율이 달랐다면 최종 정산이 어떻게 변했을지 시뮬레이션합니다.
      </p>
      <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
        <div className="flex text-xs font-semibold bg-gray-50 border-b border-gray-200">
          <div className="w-20 px-3 py-2 text-muted-foreground">환율 변동</div>
          <div className="w-28 px-3 py-2 text-right text-muted-foreground">시뮬레이션 환율</div>
          <div className="flex-1 px-3 py-2 text-right text-muted-foreground">환차손익</div>
          <div className="flex-1 px-3 py-2 text-right text-muted-foreground">클로징 정산</div>
        </div>
        {scenarios.map(sc => (
          <div
            key={sc.delta}
            className={`flex border-b border-gray-100 last:border-0 ${
              sc.isActual ? 'bg-green-50 font-semibold' : ''
            }`}
          >
            <div className={`w-20 px-3 py-1.5 text-xs ${
              sc.delta < 0 ? 'text-red-500' : sc.delta > 0 ? 'text-blue-500' : 'text-green-700'
            }`}>
              {sc.delta === 0 ? '← 실제' : sc.delta > 0 ? `+${sc.delta}원` : `${sc.delta}원`}
            </div>
            <div className="w-28 px-3 py-1.5 text-right font-mono">
              {sc.simRate.toLocaleString('ko-KR')}원/$
            </div>
            <div className={`flex-1 px-3 py-1.5 text-right font-mono ${
              sc.simFxGainLoss >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}>
              {sc.simFxGainLoss >= 0 ? '+' : ''}{formatKrw(sc.simFxGainLoss)}
            </div>
            <div className={`flex-1 px-3 py-1.5 text-right font-mono ${
              sc.simFinal < 0 ? 'text-red-600' : sc.isActual ? 'text-green-700' : ''
            }`}>
              {sc.simFinal >= 0 ? '+' : ''}{formatKrw(sc.simFinal)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
