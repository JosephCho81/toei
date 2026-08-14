/**
 * 품목 소계·합계와 토에이 측 자료 금액 대조 계산.
 * 금액 비교는 부동소수 오차로 오탐이 나면 안 되므로 1/10000 USD 정수 단위로 계산한다.
 */

const SCALE = 10_000 // unit_price_usd numeric(15,4) 와 동일한 소수점 4자리

/** USD 실수를 1/10000 단위 정수로. 입력이 비었거나 숫자가 아니면 0. */
function toScaled(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (n == null || !Number.isFinite(n)) return 0
  return Math.round(n * SCALE)
}

function fromScaled(scaled: number): number {
  return scaled / SCALE
}

export interface ItemAmountInput {
  unit_price_usd: number | string | null
  quantity: number | string | null
}

/** 품목 1행 소계 (단가 × 수량). */
export function itemSubtotalUsd(item: ItemAmountInput): number {
  const qty = typeof item.quantity === 'string' ? parseInt(item.quantity, 10) : item.quantity
  if (qty == null || !Number.isFinite(qty)) return 0
  return fromScaled(toScaled(item.unit_price_usd) * qty)
}

/** 품목 합계 (Σ 단가 × 수량). */
export function itemsTotalUsd(items: ItemAmountInput[]): number {
  const scaled = items.reduce((sum, item) => {
    const qty = typeof item.quantity === 'string' ? parseInt(item.quantity, 10) : item.quantity
    if (qty == null || !Number.isFinite(qty)) return sum
    return sum + toScaled(item.unit_price_usd) * qty
  }, 0)
  return fromScaled(scaled)
}

export type AmountDiffStatus = 'match' | 'minor' | 'mismatch' | 'empty'

export interface AmountDiff {
  /** 입력금액 − 품목합계. 양수면 토에이 자료가 더 큼. */
  diffUsd: number
  /** 품목합계 대비 차이 비율(%). 품목합계가 0이면 null. */
  diffPct: number | null
  status: AmountDiffStatus
}

/** 소수점 오차 수준(0.005 USD 미만)은 일치로 본다. */
const MATCH_TOLERANCE_SCALED = 50      // 0.005 USD
/** 1 USD 미만 차이는 경고(반올림 등 가능성), 그 이상은 오류. */
const MINOR_TOLERANCE_SCALED = SCALE   // 1 USD

/** 토에이 입력금액과 품목합계를 비교한다. 입력금액이 없으면 status='empty'. */
export function compareAmount(
  itemsTotal: number,
  enteredAmount: number | string | null | undefined,
): AmountDiff {
  const entered = typeof enteredAmount === 'string'
    ? (enteredAmount.trim() === '' ? null : parseFloat(enteredAmount))
    : enteredAmount
  if (entered == null || !Number.isFinite(entered)) {
    return { diffUsd: 0, diffPct: null, status: 'empty' }
  }

  const diffScaled = toScaled(entered) - toScaled(itemsTotal)
  const abs = Math.abs(diffScaled)
  const status: AmountDiffStatus =
    abs < MATCH_TOLERANCE_SCALED ? 'match'
    : abs < MINOR_TOLERANCE_SCALED ? 'minor'
    : 'mismatch'

  const totalScaled = toScaled(itemsTotal)
  return {
    diffUsd: fromScaled(diffScaled),
    diffPct: totalScaled === 0 ? null : (diffScaled / totalScaled) * 100,
    status,
  }
}

/** '+$1,234.00' / '-$12.50' 형태 차액 문자열. */
export function formatDiffUsd(diff: number): string {
  const abs = Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  return `${diff >= 0 ? '+' : '-'}$${abs}`
}
