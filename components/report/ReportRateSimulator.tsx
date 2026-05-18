'use client'

import { useState } from 'react'

interface Props {
  bokRate: number
  importUsd: number
  importAmountKrw: number
  lcFeeTotal: number
  fxBurdenPct: number
  closingCostsTotal: number
}

function fmt(n: number) {
  return `${Math.round(Math.abs(n)).toLocaleString('ko-KR')}원`
}

function signed(n: number) {
  return `${n >= 0 ? '+' : '-'}${fmt(n)}`
}

export function ReportRateSimulator({
  bokRate, importUsd, importAmountKrw, lcFeeTotal, fxBurdenPct, closingCostsTotal,
}: Props) {
  const [simRate, setSimRate] = useState(bokRate)

  const simLcPayment = Math.round(importUsd * simRate)
  const simFxGainLoss = simLcPayment - importAmountKrw
  const simAdditional = simFxGainLoss + lcFeeTotal
  const simA1Burden = Math.round(simAdditional * (fxBurdenPct / 100))
  const simA1WithVat = Math.round(simA1Burden * 1.1)
  const simFinal = simA1WithVat + closingCostsTotal

  const isActual = simRate === bokRate
  const fxIsGain = simFxGainLoss >= 0

  return (
    <div className="mb-4 print:hidden border border-blue-200 rounded-lg p-4 bg-blue-50/40">
      <p className="text-xs font-semibold text-blue-700 mb-3">환율 시뮬레이터 (웹 전용)</p>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-muted-foreground shrink-0 w-24">클로징 환율</label>
        <input
          type="range"
          min={bokRate - 100}
          max={bokRate + 100}
          step={10}
          value={simRate}
          onChange={e => setSimRate(Number(e.target.value))}
          className="flex-1"
        />
        <span className="font-mono text-sm font-semibold w-36 text-right">
          {simRate.toLocaleString('ko-KR')}원/$
          {isActual && <span className="text-xs text-green-600 ml-1">(실제)</span>}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="bg-white rounded-md p-3 border border-gray-200">
          <p className="text-xs text-muted-foreground mb-1">환차손익</p>
          <p className={`font-mono font-bold ${fxIsGain ? 'text-blue-700' : 'text-red-700'}`}>
            {signed(simFxGainLoss)}
          </p>
          <p className={`text-xs mt-0.5 ${fxIsGain ? 'text-blue-500' : 'text-red-500'}`}>
            {fxIsGain ? '환차익' : '환차손'}
          </p>
        </div>
        <div className="bg-white rounded-md p-3 border border-gray-200">
          <p className="text-xs text-muted-foreground mb-1">에이원 부담 (VAT포함)</p>
          <p className={`font-mono font-bold ${simA1WithVat < 0 ? 'text-red-700' : ''}`}>
            {signed(simA1WithVat)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{fxBurdenPct}% 분담 × 1.1</p>
        </div>
        <div className={`rounded-md p-3 border ${
          simFinal < 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
        }`}>
          <p className="text-xs text-muted-foreground mb-1">클로징 정산</p>
          <p className={`font-mono font-bold text-base ${simFinal < 0 ? 'text-red-700' : 'text-green-700'}`}>
            {signed(simFinal)}
          </p>
        </div>
      </div>
    </div>
  )
}
