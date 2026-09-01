'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/NumberInput'
import { TableCell, TableRow } from '@/components/ui/table'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDiffUsd, type AmountDiff, type AmountDiffStatus } from '@/lib/calculations/itemTotals'
import type { CheckRow } from '@/lib/data/transactionItems'

export const DIFF_STYLES: Record<AmountDiffStatus, { row: string; text: string; icon: string }> = {
  match: { row: 'bg-emerald-50/60 dark:bg-emerald-950/20', text: 'text-emerald-600', icon: '✅' },
  minor: { row: 'bg-amber-50/60 dark:bg-amber-950/20', text: 'text-amber-600', icon: '⚠️' },
  mismatch: { row: 'bg-red-50/70 dark:bg-red-950/20', text: 'text-red-600 font-semibold', icon: '🔴' },
  empty: { row: '', text: 'text-muted-foreground', icon: '' },
}

export const usdLabel = (v: number) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function diffLabel(diff: AmountDiff): string {
  if (diff.status === 'empty') return '-'
  const pct = diff.diffPct != null && diff.status !== 'match' ? ` (${diff.diffPct.toFixed(2)}%)` : ''
  return `${DIFF_STYLES[diff.status].icon} ${formatDiffUsd(diff.diffUsd)}${pct}`
}

export interface CheckDiff { check: CheckRow; diff: AmountDiff }

type Field = keyof Omit<CheckRow, '_key' | 'id'>

/** 품목 합계와 토에이 자료 금액을 맞대는 행 — 합계 바로 아래에 붙는다. */
export function AmountCheckRow({ check, diff, isLocked, onUpdate, onRemove }: {
  check: CheckRow
  diff: AmountDiff
  isLocked: boolean
  onUpdate: (field: Field, value: string) => void
  onRemove: () => void
}) {
  const style = DIFF_STYLES[diff.status]
  return (
    <TableRow className={cn('border-t-2', style.row)}>
      <TableCell colSpan={4} className="p-1">
        {isLocked
          ? <span className="text-sm px-2">{check.label}</span>
          : <Input className="h-7 text-xs" value={check.label} placeholder="예: 토에이 입력금액"
              onChange={(e) => onUpdate('label', e.target.value)} />}
      </TableCell>
      <TableCell className="p-1" colSpan={2}>
        {isLocked
          ? <span className="text-sm px-2 block text-right">
              {check.amount_usd ? usdLabel(parseFloat(check.amount_usd)) : '-'}
            </span>
          : <NumberInput className="h-7 text-xs text-right font-mono" value={check.amount_usd}
              placeholder="금액 입력(USD)" onValueChange={(v) => onUpdate('amount_usd', v)} />}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">USD</TableCell>
      <TableCell className={cn('text-right text-sm pr-3 whitespace-nowrap', style.text)}>
        {diffLabel(diff)}
      </TableCell>
      {!isLocked && (
        <TableCell className="p-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  )
}

export function AmountCheckNoteRow({ check, diff, isLocked, colSpan, onUpdate }: {
  check: CheckRow
  diff: AmountDiff
  isLocked: boolean
  colSpan: number
  onUpdate: (field: Field, value: string) => void
}) {
  if (isLocked && !check.note) return null
  return (
    <TableRow className={cn('border-t-0', DIFF_STYLES[diff.status].row)}>
      <TableCell colSpan={colSpan} className="px-3 pb-2 pt-0">
        {isLocked ? (
          <p className="text-xs text-muted-foreground">차액 사유: {check.note}</p>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">차액 사유</span>
            <Input className="h-6 text-xs" value={check.note}
              placeholder="차이가 나는 이유 / 검토 결과 입력"
              onChange={(e) => onUpdate('note', e.target.value)} />
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}
