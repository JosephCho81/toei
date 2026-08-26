import { applyRounding } from './interim.ts'
import { calcImportAmountKrw } from './helpers.ts'
export type { RoundingPolicy } from './interim.ts'
import type { RoundingPolicy } from './interim.ts'

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

/**
 * LC 수수료 1행에서 환산에 필요한 부분만. UI 입력이라 금액·환율이 전부 문자열이다.
 */
export interface LcFeeRateInput {
  currency: 'KRW' | 'USD'
  use_custom_rate: boolean
  exchange_rate: string
}

/**
 * 이 행의 환산에 실제로 쓸 환율.
 * 고시환율이 아닌 은행 자체 매도환율로 결제 후 청구되는 건이 있어 행마다 환율을 덮어쓸 수 있다.
 */
export function feeExchangeRate(row: LcFeeRateInput, bokRate: number): number {
  if (!row.use_custom_rate) return bokRate
  const rate = parseFloat(row.exchange_rate)
  return Number.isFinite(rate) && rate > 0 ? rate : 0
}

/** 별도 환율을 켜놓고 환율을 비워둔 행 — 0원으로 굳어버리므로 저장을 막아야 한다. */
export function feeRateMissing(row: LcFeeRateInput): boolean {
  return row.currency === 'USD' && row.use_custom_rate && feeExchangeRate(row, 0) <= 0
}
