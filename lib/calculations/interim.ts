export type RoundingPolicy = 'floor_100' | 'floor_10' | 'none'

export interface CostItem {
  amountKrw: number
}

export interface InterimCalculation {
  importAmountKrw: number   // USD × 환율 × (1 + margin/100)
  totalCostKrw: number      // 운송비 + 관세 + 기타 합계
  confirmedKrw: number      // importAmountKrw + totalCostKrw
}

export function applyRounding(amount: number, policy: RoundingPolicy): number {
  if (policy === 'floor_100') return Math.floor(amount / 100) * 100
  if (policy === 'floor_10') return Math.floor(amount / 10) * 10
  return amount
}

export function calculateInterim(params: {
  importAmountUsd: number
  customsExchangeRate: number
  marginRatePct?: number
  costItems: CostItem[]
  roundingPolicy: RoundingPolicy
}): InterimCalculation {
  const { importAmountUsd, customsExchangeRate, marginRatePct = 0, costItems, roundingPolicy } = params
  const importAmountKrw = Math.round(importAmountUsd * customsExchangeRate * (1 + marginRatePct / 100))
  const totalCostKrw = costItems.reduce((sum, item) => sum + item.amountKrw, 0)
  const confirmedKrw = importAmountKrw + totalCostKrw
  return {
    importAmountKrw,
    totalCostKrw,
    confirmedKrw: applyRounding(confirmedKrw, roundingPolicy),
  }
}

export function computeVat(amountKrw: number): number {
  return Math.round(amountKrw * 0.1)
}
