import { calcImportAmountKrw } from './helpers.ts'

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
  // '절사 없음'이어도 원 단위 소수점은 남기지 않는다.
  // 정산금액 컬럼이 numeric(15,0) 이라 DB 가 어차피 반올림하므로 화면과 저장값을 맞춘다.
  return Math.round(amount)
}

export function calculateInterim(params: {
  importAmountUsd: number
  customsExchangeRate: number
  marginRatePct?: number
  costItems: CostItem[]
  roundingPolicy: RoundingPolicy
}): InterimCalculation {
  const { importAmountUsd, customsExchangeRate, marginRatePct = 0, costItems, roundingPolicy } = params
  const importAmountKrw = calcImportAmountKrw(importAmountUsd, customsExchangeRate, marginRatePct)
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
