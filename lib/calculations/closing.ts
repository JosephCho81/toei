import { applyRounding } from './interim'
export type { RoundingPolicy } from './interim'
import type { RoundingPolicy } from './interim'

export interface ClosingCalculation {
  importAmountKrw: number
  fxGainLossKrw: number
  lcFeeTotalKrw: number
  additionalCostKrw: number
  a1BurdenKrw: number
  a1BurdenWithVatKrw: number
  closingCostsTotalKrw: number
  finalSettlementKrw: number
  roundedFinalKrw: number
}

export function calculateClosing(params: {
  lcPaymentTotalKrw: number
  importAmountUsd: number
  customsExchangeRate: number
  lcFeeItems: { amountKrw: number }[]
  fxBurdenA1Pct: number
  closingCostItems: { amountKrw: number; includesVat: boolean }[]
  roundingPolicy: RoundingPolicy
}): ClosingCalculation {
  const {
    lcPaymentTotalKrw,
    importAmountUsd,
    customsExchangeRate,
    lcFeeItems,
    fxBurdenA1Pct,
    closingCostItems,
    roundingPolicy,
  } = params

  const importAmountKrw = Math.round(importAmountUsd * customsExchangeRate)

  // 환차손익 = LC결제비용 - (수입금액USD × 통관환율)
  const fxGainLossKrw = lcPaymentTotalKrw - importAmountKrw

  // LC 수수료 합계
  const lcFeeTotalKrw = lcFeeItems.reduce((sum, item) => sum + item.amountKrw, 0)

  // 추가비용 = 환차손익 + LC수수료
  const additionalCostKrw = fxGainLossKrw + lcFeeTotalKrw

  // 에이원 부담분 (분담비율 적용)
  const a1BurdenKrw = Math.round(additionalCostKrw * (fxBurdenA1Pct / 100))
  const a1BurdenWithVatKrw = Math.round(a1BurdenKrw * 1.1)

  // 클로징 추가비용 (A+B+C) - VAT 포함 항목은 그대로 사용
  const closingCostsTotalKrw = closingCostItems.reduce((sum, item) => sum + item.amountKrw, 0)

  // 최종 정산액 = 에이원 부담분(VAT포함) + 클로징 추가비용
  const finalSettlementKrw = a1BurdenWithVatKrw + closingCostsTotalKrw

  return {
    importAmountKrw,
    fxGainLossKrw,
    lcFeeTotalKrw,
    additionalCostKrw,
    a1BurdenKrw,
    a1BurdenWithVatKrw,
    closingCostsTotalKrw,
    finalSettlementKrw,
    roundedFinalKrw: applyRounding(finalSettlementKrw, roundingPolicy),
  }
}
