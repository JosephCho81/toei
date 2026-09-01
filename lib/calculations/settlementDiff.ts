import { calculateInterim, type CostItem, type RoundingPolicy, type VatMode } from './interim.ts'

export interface InterimDiffInput {
  confirmedKrw: number | null
  importAmountUsd: number | null
  customsExchangeRate: number | null
  marginRatePct: number | null
  costItems: CostItem[]
  roundingPolicy: RoundingPolicy
  vatMode: VatMode
}

/**
 * 확정금액 − 시스템 재계산값. 재계산에 필요한 값이 하나라도 없으면 null.
 *
 * 재계산은 반드시 `calculateInterim` 을 그대로 호출한다 —
 * 여기서 공식을 다시 쓰면 절사·항목 부가세·수입부가세 공제가 빠져
 * 없는 차액을 만들어 내고, 그것이 「검증 이슈」로 화면에 뜬다.
 */
export function interimDiffKrw(input: InterimDiffInput): number | null {
  const { confirmedKrw, importAmountUsd, customsExchangeRate } = input
  if (confirmedKrw == null || importAmountUsd == null || customsExchangeRate == null) return null

  const calc = calculateInterim({
    importAmountUsd,
    customsExchangeRate,
    marginRatePct: input.marginRatePct ?? 0,
    costItems: input.costItems,
    roundingPolicy: input.roundingPolicy,
    vatMode: input.vatMode,
  })
  return confirmedKrw - calc.confirmedKrw
}
