// 최종 수익률 계산 (클로징 완료 후에만 의미 있음)
export function calculateProfitRate(params: {
  importAmountUsd: number
  marginRatePct: number
  customsExchangeRate: number
  totalInterimCostKrw: number
  fxBurdenA1Krw: number
}): number | null {
  const { importAmountUsd, marginRatePct, customsExchangeRate, totalInterimCostKrw, fxBurdenA1Krw } = params

  if (!importAmountUsd || !marginRatePct || !customsExchangeRate) return null

  const salesAmountKrw = Math.round(importAmountUsd * customsExchangeRate * (1 + marginRatePct / 100))
  const totalCostKrw = totalInterimCostKrw + fxBurdenA1Krw
  const profitKrw = salesAmountKrw - totalCostKrw

  if (salesAmountKrw === 0) return null
  return (profitKrw / salesAmountKrw) * 100
}
