'use client'
import { cn } from '@/lib/utils'
import { formatDiffUsd } from '@/lib/calculations/itemTotals'
import type { AmountCheckLevel, AmountCheckSummary } from '@/lib/calculations/amountCheckSummary'

/** 대조금액 차이 단계별 표시 */
export const CHECK_STYLES: Record<Exclude<AmountCheckLevel, 'none'>, { row: string; badge: string; icon: string; label: string }> = {
  mismatch: {
    row: 'bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20',
    badge: 'text-red-600',
    icon: '🔴',
    label: '금액 불일치',
  },
  minor: {
    row: 'bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/20',
    badge: 'text-amber-600',
    icon: '⚠️',
    label: '금액 차이',
  },
  note: {
    row: '',
    badge: 'text-amber-600',
    icon: '📝',
    label: '검토 메모',
  },
}

export const usd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** 확장 행에 펼쳐지는 '어디가 어떻게 다른지' 상세 */
export function AmountCheckDetail({ summary }: { summary: AmountCheckSummary }) {
  if (summary.level === 'none') return null
  const style = CHECK_STYLES[summary.level]
  return (
    <div className={cn('mt-3 rounded-md border px-3 py-2 text-xs',
      summary.level === 'mismatch'
        ? 'border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/30'
        : 'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30')}>
      <p className="font-semibold mb-1">
        {style.icon} 토에이 자료 대조 — 품목 합계 {usd(summary.itemsTotalUsd)}
      </p>
      <ul className="space-y-1">
        {summary.entries.map((e, i) => (
          <li key={i} className="flex flex-wrap gap-x-3">
            <span className="font-medium">{e.label}</span>
            <span className="font-mono">{e.amountUsd != null ? usd(e.amountUsd) : '금액 미입력'}</span>
            {e.diff.status !== 'empty' && e.diff.status !== 'match' && (
              <span className={cn('font-mono', e.diff.status === 'mismatch' ? 'text-red-600 font-semibold' : 'text-amber-600')}>
                차액 {formatDiffUsd(e.diff.diffUsd)}
                {e.diff.diffPct != null && ` (${e.diff.diffPct.toFixed(2)}%)`}
              </span>
            )}
            {e.note && <span className="text-muted-foreground">사유: {e.note}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-muted-foreground">상세 수정은 해당 차수 상세보기 → 품목 명세에서.</p>
    </div>
  )
}
