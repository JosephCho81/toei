export type RoundingPolicy = 'floor_100' | 'floor_10' | 'none'

export interface CostItem {
  amountKrw: number
  isVatTaxable: boolean
  vatAmountKrw: number
}

export interface InterimCalculation {
  importAmountKrw: number   // import × rate × (1 + margin/100)
  totalCostKrw: number
  vatAmountKrw: number      // (importAmountKrw + totalCostKrw) × 10%
  totalWithVatKrw: number
  roundedTotalKrw: number
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
  vatIncludedInTotal?: boolean
}): InterimCalculation {
  const { importAmountUsd, customsExchangeRate, marginRatePct = 0, costItems, roundingPolicy } = params

  const importAmountKrw = Math.round(importAmountUsd * customsExchangeRate * (1 + marginRatePct / 100))

  const totalCostKrw = costItems.reduce((sum, item) => sum + item.amountKrw, 0)
  const vatAmountKrw = Math.round((importAmountKrw + totalCostKrw) * 0.1)
  const totalWithVatKrw = importAmountKrw + totalCostKrw + vatAmountKrw

  return {
    importAmountKrw,
    totalCostKrw,
    vatAmountKrw,
    totalWithVatKrw,
    roundedTotalKrw: applyRounding(totalWithVatKrw, roundingPolicy),
  }
}

export function computeVat(amountKrw: number): number {
  return Math.round(amountKrw * 0.1)
}
