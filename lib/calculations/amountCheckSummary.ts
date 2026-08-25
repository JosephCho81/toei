/**
 * 거래목록에서 '이 차수는 토에이 자료와 다르다'를 한눈에 보여주기 위한 요약.
 * 표시 대상은 차액이 있거나 차액 사유 메모가 적힌 대조행뿐이다(담당자 확인).
 */
import { compareAmount, itemsTotalUsd, type AmountDiff, type ItemAmountInput } from './itemTotals.ts'

export interface AmountCheckInput {
  label: string
  amount_usd: number | string | null
  note: string | null
}

export interface AmountCheckEntry {
  label: string
  amountUsd: number | null
  note: string | null
  diff: AmountDiff
}

/** mismatch(빨강) > minor(주황) > note(메모만) > none(표시 없음) */
export type AmountCheckLevel = 'none' | 'note' | 'minor' | 'mismatch'

export interface AmountCheckSummary {
  level: AmountCheckLevel
  itemsTotalUsd: number
  /** 표시할 항목만 — 금액이 일치하고 메모도 없으면 제외 */
  entries: AmountCheckEntry[]
}

const RANK: Record<AmountCheckLevel, number> = { none: 0, note: 1, minor: 2, mismatch: 3 }

export function summarizeAmountChecks(
  items: ItemAmountInput[],
  checks: AmountCheckInput[],
): AmountCheckSummary {
  const total = itemsTotalUsd(items)
  const entries: AmountCheckEntry[] = []
  let level: AmountCheckLevel = 'none'

  for (const c of checks) {
    const diff = compareAmount(total, c.amount_usd)
    const note = c.note?.trim() ? c.note.trim() : null
    const own: AmountCheckLevel =
      diff.status === 'mismatch' ? 'mismatch'
      : diff.status === 'minor' ? 'minor'
      : note ? 'note'
      : 'none'
    if (own === 'none') continue

    const amount = typeof c.amount_usd === 'string'
      ? (c.amount_usd.trim() === '' ? null : parseFloat(c.amount_usd))
      : c.amount_usd
    entries.push({
      label: c.label,
      amountUsd: amount != null && Number.isFinite(amount) ? amount : null,
      note,
      diff,
    })
    if (RANK[own] > RANK[level]) level = own
  }

  return { level, itemsTotalUsd: total, entries }
}
