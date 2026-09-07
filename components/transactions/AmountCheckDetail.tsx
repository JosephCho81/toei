'use client'
import { cn } from '@/lib/utils'
import { formatDiffUsd } from '@/lib/calculations/itemTotals'
import type { AmountCheckLevel, AmountCheckSummary } from '@/lib/calculations/amountCheckSummary'

/**
 * 대조금액 차이 단계별 표시.
 *
 * 줄 전체를 칠하지 않는다 — 왼쪽 세로선 하나로 표시한다. 빨강은 「금액이 안 맞는다」
 * 하나에만 쓰고, 나머지는 회색이다. 이모지도 쓰지 않는다: 40줄 표에서 🔴⚠️📝 가
 * 섞이면 그림이 글자를 밀어낸다.
 */
export const CHECK_STYLES: Record<Exclude<AmountCheckLevel, 'none'>, { row: string; badge: string; label: string }> = {
  mismatch: {
    row: 'border-l-4 border-l-red-600',
    badge: 'text-red-700',
    label: '금액 불일치',
  },
  minor: {
    row: 'border-l-4 border-l-slate-400',
    badge: 'text-muted-foreground',
    label: '금액 차이',
  },
  note: {
    row: '',
    badge: 'text-muted-foreground',
    label: '검토 메모',
  },
}

export const usd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** 확장 행에 펼쳐지는 '어디가 어떻게 다른지' 상세 */
export function AmountCheckDetail({ summary }: { summary: AmountCheckSummary }) {
  if (summary.level === 'none') return null
  const style = CHECK_STYLES[summary.level]
  return (
    <div className={cn('mt-3 rounded-md border bg-white px-3 py-2 text-sm',
      summary.level === 'mismatch' && 'border-red-300')}>
      <p className="mb-1 font-semibold">
        토에이 자료 대조 — 품목 합계 {usd(summary.itemsTotalUsd)}
      </p>
      <ul className="space-y-1">
        {summary.entries.map((e, i) => (
          <li key={i} className="flex flex-wrap gap-x-3">
            <span className="font-medium">{e.label}</span>
            <span className="tabular-nums">{e.amountUsd != null ? usd(e.amountUsd) : '금액 미입력'}</span>
            {e.diff.status !== 'empty' && e.diff.status !== 'match' && (
              <span className={cn('tabular-nums', e.diff.status === 'mismatch' ? 'font-semibold text-red-700' : 'text-muted-foreground')}>
                차액 {formatDiffUsd(e.diff.diffUsd)}
                {e.diff.diffPct != null && ` (${e.diff.diffPct.toFixed(2)}%)`}
              </span>
            )}
            {e.note && <span className="text-muted-foreground">사유: {e.note}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-muted-foreground">상세 수정은 해당 차수 상세보기 → 품목 명세에서 합니다.</p>
    </div>
  )
}
