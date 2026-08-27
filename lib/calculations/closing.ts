import { applyRounding, computeVat } from './interim.ts'
import { calcImportAmountKrw } from './helpers.ts'
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
  closingCostsTotalKrw: number
  /** 절사 후 공급가. exclusive = 에이원 부담분 + 클로징 추가비용 */
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

  let supplyAmountKrw: number
  let vatKrw: number
  let finalSettlementKrw: number
  let roundedFinalKrw: number

  if (vatMode === 'exclusive') {
    // 공급가 = 에이원 부담분 + 클로징 추가비용. 절사는 여기에 건다 —
    // 합계를 절사하면 공급가 + 부가세와 어긋나 세금계산서가 맞지 않는다.
    supplyAmountKrw = applyRounding(a1BurdenKrw + closingCostsTotalKrw, roundingPolicy)
    vatKrw = computeVat(supplyAmountKrw)
    roundedFinalKrw = supplyAmountKrw + vatKrw
    finalSettlementKrw = roundedFinalKrw
  } else {
    // 구방식: 부담분에 부가세를 곱해 뭉치고 클로징 추가비용은 부가세 밖에 더했다
    finalSettlementKrw = a1BurdenWithVatKrw + closingCostsTotalKrw
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
