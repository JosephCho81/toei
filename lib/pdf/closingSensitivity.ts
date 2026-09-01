import { calculateClosing, calcLcPaymentKrw, type RoundingPolicy, type VatMode } from '../calculations/closing.ts'
import { krwToUsd } from '../calculations/helpers.ts'

/** 클로징환율 ±50원 구간의 민감도 시뮬레이션. */
const SENS_DELTAS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50]

export interface SensInput {
  bokExchangeRate: number
  importAmountUsd: number
  customsExchangeRate: number
  /** LC 결제비용 총액(USD). 없으면 저장된 원화를 클로징환율로 역산해 쓴다. */
  lcPaymentTotalUsd: number | null
  lcPaymentTotalKrw: number
  advancePaymentUsd: number | null
  advanceExchangeRate: number | null
  lcFeeTotalKrw: number
  closingCostsTotalKrw: number
  fxBurdenA1Pct: number
  roundingPolicy: RoundingPolicy
  vatMode: VatMode
}

export interface SensScenario {
  delta: number
  simRate: number
  simFx: number
  simFinal: number
  isActual: boolean
}

/**
 * 환율만 바꿔 정산을 다시 돌린다.
 * 공식을 여기서 다시 쓰지 않고 `calculateClosing` 을 그대로 호출한다 —
 * 절사·부가세·기타비용 부담비율이 본 정산과 어긋나면 시뮬레이션이 거짓말을 한다.
 * (LC 부대비용은 환율과 무관하다고 보고 고정한다)
 */
export function buildSensScenarios(input: SensInput): SensScenario[] | null {
  const totalUsd = input.lcPaymentTotalUsd
    ?? krwToUsd(input.lcPaymentTotalKrw, input.bokExchangeRate)
  if (totalUsd == null || totalUsd === 0) return null

  return SENS_DELTAS.map((delta) => {
    const simRate = input.bokExchangeRate + delta
    const simLcKrw = calcLcPaymentKrw({
      totalUsd,
      advanceUsd: input.advancePaymentUsd,
      advanceRate: input.advanceExchangeRate,
    }, simRate)

    const calc = calculateClosing({
      lcPaymentTotalKrw: simLcKrw,
      importAmountUsd: input.importAmountUsd,
      customsExchangeRate: input.customsExchangeRate,
      lcFeeItems: [{ amountKrw: input.lcFeeTotalKrw }],
      fxBurdenA1Pct: input.fxBurdenA1Pct,
      closingCostItems: [{ amountKrw: input.closingCostsTotalKrw }],
      roundingPolicy: input.roundingPolicy,
      interimConfirmedKrw: 0,
      vatMode: input.vatMode,
    })

    return {
      delta,
      simRate,
      simFx: calc.fxGainLossKrw,
      simFinal: calc.roundedFinalKrw,
      isActual: delta === 0,
    }
  })
}
