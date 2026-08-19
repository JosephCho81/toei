import { applyRounding } from './interim'
import { calcImportAmountKrw } from './helpers'
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
  interimConfirmedKrw: number
  grandTotalKrw: number
}

export function calculateClosing(params: {
  lcPaymentTotalKrw: number
  importAmountUsd: number
  customsExchangeRate: number
  lcFeeItems: { amountKrw: number }[]
  fxBurdenA1Pct: number
  closingCostItems: { amountKrw: number; includesVat: boolean }[]
  roundingPolicy: RoundingPolicy
  interimConfirmedKrw: number
}): ClosingCalculation {
  const {
    lcPaymentTotalKrw,
    importAmountUsd,
    customsExchangeRate,
    lcFeeItems,
    fxBurdenA1Pct,
    closingCostItems,
    roundingPolicy,
    interimConfirmedKrw,
  } = params

  const importAmountKrw = calcImportAmountKrw(importAmountUsd, customsExchangeRate, 0)

  // 환차손익 = (수입금액USD × 통관환율) - LC결제비용
  // 실제 결제비용이 통관환율 기준액보다 크면 환차손(음수)
  const fxGainLossKrw = importAmountKrw - lcPaymentTotalKrw

  // LC 수수료 합계
  const lcFeeTotalKrw = lcFeeItems.reduce((sum, item) => sum + item.amountKrw, 0)

  // 추가비용 = LC수수료 - 환차손익 (환차손이면 부담 증가, 환차익이면 부담 감소)
  const additionalCostKrw = lcFeeTotalKrw - fxGainLossKrw

  // 에이원 부담분 (분담비율 적용)
  const a1BurdenKrw = Math.round(additionalCostKrw * (fxBurdenA1Pct / 100))
  const a1BurdenWithVatKrw = Math.round(a1BurdenKrw * 1.1)

  // 클로징 추가비용 (A+B+C) - VAT 포함 항목은 그대로 사용
  const closingCostsTotalKrw = closingCostItems.reduce((sum, item) => sum + item.amountKrw, 0)

  // 최종 정산액 = 에이원 부담분(VAT포함) + 클로징 추가비용
  const finalSettlementKrw = a1BurdenWithVatKrw + closingCostsTotalKrw

  const roundedFinalKrw = applyRounding(finalSettlementKrw, roundingPolicy)
  const grandTotalKrw = interimConfirmedKrw + roundedFinalKrw

  return {
    importAmountKrw,
    fxGainLossKrw,
    lcFeeTotalKrw,
    additionalCostKrw,
    a1BurdenKrw,
    a1BurdenWithVatKrw,
    closingCostsTotalKrw,
    finalSettlementKrw,
    roundedFinalKrw,
    interimConfirmedKrw,
    grandTotalKrw,
  }
}
