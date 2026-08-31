import { applyRounding, computeVat } from './interim.ts'
import { calcImportAmountKrw, usdToKrw } from './helpers.ts'
export type { RoundingPolicy, VatMode } from './interim.ts'
import type { RoundingPolicy, VatMode } from './interim.ts'

export interface ClosingCalculation {
  vatMode: VatMode
  importAmountKrw: number
  fxGainLossKrw: number
  lcFeeTotalKrw: number
  additionalCostKrw: number
  a1BurdenKrw: number
  /** 구방식 표시용 — 에이원 부담분에 부가세를 곱해 뭉친 값 */
  a1BurdenWithVatKrw: number
  /** 기타 미정산 비용 원금 합계 (부담비율 적용 전) */
  closingCostsTotalKrw: number
  /** 기타 미정산 비용의 에이원 부담분 = 원금 × 부담비율 */
  a1ClosingCostsKrw: number
  /** 절사 후 공급가. exclusive = 에이원 부담분 + 기타 미정산 부담분 */
  supplyAmountKrw: number
  /** 매출부가세 = 공급가 × 10%. inclusive 모드는 0 */
  vatKrw: number
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
  vatMode?: VatMode
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
    vatMode = 'exclusive',
  } = params

  const importAmountKrw = calcImportAmountKrw(importAmountUsd, customsExchangeRate, 0)

  // 환차손익 = (수입금액USD × 통관환율) - LC결제비용
  // 실제 결제비용이 통관환율 기준액보다 크면 환차손(음수)
  const fxGainLossKrw = importAmountKrw - lcPaymentTotalKrw

  // LC 부대비용 합계 (개설·기한연장·조건변경·인수·이자·기타·환급)
  const lcFeeTotalKrw = lcFeeItems.reduce((sum, item) => sum + item.amountKrw, 0)

  // 추가비용 = LC수수료 - 환차손익 (환차손이면 부담 증가, 환차익이면 부담 감소)
  const additionalCostKrw = lcFeeTotalKrw - fxGainLossKrw

  // 에이원 부담분 (분담비율 적용). 초기엔 각 사 50%, 이후 에이원 전액 부담으로 바뀌었다.
  const a1BurdenKrw = Math.round(additionalCostKrw * (fxBurdenA1Pct / 100))
  const a1BurdenWithVatKrw = Math.round(a1BurdenKrw * 1.1)

  // 클로징 추가비용 (A+B+C) — 중간정산 이후 뒤늦게 청구된 통관·운송 실비
  const closingCostsTotalKrw = closingCostItems.reduce((sum, item) => sum + item.amountKrw, 0)

  // 기타 미정산 비용도 LC 부대비용과 동일하게 분담한다 (담당자 확정).
  // 원본 문서는 이 항목만 부담비율 밖 전액으로 뒀는데 그게 오류였다.
  const a1ClosingCostsKrw = Math.round(closingCostsTotalKrw * (fxBurdenA1Pct / 100))

  let supplyAmountKrw: number
  let vatKrw: number
  let finalSettlementKrw: number
  let roundedFinalKrw: number

  if (vatMode === 'exclusive') {
    // 공급가 = 에이원 부담분 + 기타 미정산 부담분. 절사는 여기에 건다 —
    // 합계를 절사하면 공급가 + 부가세와 어긋나 세금계산서가 맞지 않는다.
    supplyAmountKrw = applyRounding(a1BurdenKrw + a1ClosingCostsKrw, roundingPolicy)
    vatKrw = computeVat(supplyAmountKrw)
    roundedFinalKrw = supplyAmountKrw + vatKrw
    finalSettlementKrw = roundedFinalKrw
  } else {
    // 구방식: 부담분에 부가세를 곱해 뭉치고 기타 미정산 부담분은 부가세 밖에 더했다
    finalSettlementKrw = a1BurdenWithVatKrw + a1ClosingCostsKrw
    roundedFinalKrw = applyRounding(finalSettlementKrw, roundingPolicy)
    supplyAmountKrw = roundedFinalKrw
    vatKrw = 0
  }

  const grandTotalKrw = interimConfirmedKrw + roundedFinalKrw

  return {
    vatMode,
    importAmountKrw,
    fxGainLossKrw,
    lcFeeTotalKrw,
    additionalCostKrw,
    a1BurdenKrw,
    a1BurdenWithVatKrw,
    closingCostsTotalKrw,
    a1ClosingCostsKrw,
    supplyAmountKrw,
    vatKrw,
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

/**
 * LC 결제비용 입력. 결제액 일부를 다른 환율로 선지급한 경우가 있어
 * 총액과 별개로 선지급 구간을 따로 받는다. (1차 선지급금 7,040$ 사례)
 */
export interface LcPaymentInput {
  /** LC 결제비용 총액(USD) */
  totalUsd: number | null
  /** 그중 선지급분(USD). null·0 이면 선지급 없음 */
  advanceUsd: number | null
  /** 선지급분에만 적용할 환율. null 이면 미입력 */
  advanceRate: number | null
}

/** 선지급 구간이 있는 입력인가 */
export function hasAdvancePayment(p: LcPaymentInput): boolean {
  const a = p.advanceUsd
  return a != null && Number.isFinite(a) && a > 0
}

/** 선지급금을 넣어놓고 환율을 비워둔 입력 — 그 구간이 0원으로 굳으므로 저장을 막아야 한다. */
export function advanceRateMissing(p: LcPaymentInput): boolean {
  const r = p.advanceRate
  return hasAdvancePayment(p) && !(r != null && Number.isFinite(r) && r > 0)
}

/** 선지급금이 총액을 넘는 입력 — 잔액이 음수가 되어 결제비용이 뒤집힌다. */
export function advanceExceedsTotal(p: LcPaymentInput): boolean {
  return hasAdvancePayment(p) && (p.advanceUsd ?? 0) > (p.totalUsd ?? 0)
}

/**
 * LC 결제비용 원화.
 * 선지급 구간과 잔액을 각각 환산해 더한다 — 은행이 구간별로 결제해 청구하므로
 * 합계를 한 번에 환산하면 실제 청구액과 원 단위로 어긋난다.
 */
export function calcLcPaymentKrw(p: LcPaymentInput, bokRate: number): number {
  const total = p.totalUsd ?? 0
  if (!hasAdvancePayment(p)) return usdToKrw(total, bokRate)
  const advanceUsd = p.advanceUsd ?? 0
  return usdToKrw(advanceUsd, p.advanceRate) + usdToKrw(total - advanceUsd, bokRate)
}
