import { cn } from '@/lib/utils'
import { formatKrw, formatDiff } from '@/lib/utils/format'
import type { CompRow, RoundResult } from '@/lib/verification/compare'

const ICON: Record<CompRow['status'], string> = {
  ok: '✅', minor: '⚠️', bad: '🔴', src_only: '←', db_only: '→',
}

const ROW_BG: Record<CompRow['status'], string> = {
  ok: '',
  minor: 'bg-amber-50/60 dark:bg-amber-950/20',
  bad: 'bg-red-50/70 dark:bg-red-950/20',
  src_only: 'bg-sky-50/50 dark:bg-sky-950/20',
  db_only: 'bg-muted/30',
}

function Amount({ value }: { value: number | null }) {
  return value !== null
    ? <>{formatKrw(value)}</>
    : <span className="text-muted-foreground">-</span>
}

function CompRows({ rows }: { rows: CompRow[] }) {
  return (
    <>
      {rows.map((row, i) => (
        <tr key={i} className={cn('border-t', ROW_BG[row.status])}>
          <td className="px-3 py-1.5 font-mono whitespace-nowrap">{row.name}</td>
          <td className="px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap">
            <Amount value={row.srcAmt} />
          </td>
          <td className="px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap">
            <Amount value={row.dbAmt} />
          </td>
          <td className={cn(
            'px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap',
            row.status === 'bad' ? 'text-red-600 font-semibold'
              : row.status === 'minor' ? 'text-amber-600'
              : 'text-muted-foreground',
          )}>
            {row.diff !== null ? formatDiff(row.diff) : '-'}
          </td>
          <td className="px-3 py-1.5 text-center">{ICON[row.status]}</td>
        </tr>
      ))}
    </>
  )
}

function GroupHeader({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={5} className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/20 border-t">
        {label}
      </td>
    </tr>
  )
}

function EmptyRow({ text, className }: { text: string; className?: string }) {
  return (
    <tr className="border-t">
      <td colSpan={5} className={cn('px-3 py-1.5 text-muted-foreground', className)}>{text}</td>
    </tr>
  )
}

function summaryLabel(round: RoundResult): string {
  if (round.badCount > 0) return `${round.badCount}개 불일치`
  if (round.srcOnlyCount > 0) return `DB미입력 ${round.srcOnlyCount}개`
  if (round.minorCount > 0) return `${round.minorCount}개 소액차이`
  if (!round.hasInvoice) return '인보이스 없음'
  return round.customsParseFailed ? '전체 일치 (통관서파싱불가)' : '전체 일치'
}

export function RoundAccordion({ round }: { round: RoundResult }) {
  const icon = round.badCount > 0 || round.srcOnlyCount > 0 ? '🔴'
    : round.minorCount > 0 || round.customsParseFailed ? '⚠️'
    : '✅'

  return (
    <details className="group border rounded-lg overflow-hidden">
      <summary className={cn(
        'flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-muted/40',
        'select-none list-none [&::-webkit-details-marker]:hidden',
      )}>
        <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{round.roundNo}차</span>
        <span className="text-sm font-medium">{icon} {summaryLabel(round)}</span>
        {round.dbOnlyCount > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">DB전용 {round.dbOnlyCount}개</span>
        )}
      </summary>

      <div className="overflow-x-auto border-t">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/30 text-left">
              {['항목명', '원본문서값', 'DB 입력값', '차이'].map((h, i) => (
                <th key={h} className={cn('px-3 py-1.5 font-medium whitespace-nowrap', i > 0 && 'text-right')}>
                  {h}
                </th>
              ))}
              <th className="px-3 py-1.5 font-medium text-center w-10">상태</th>
            </tr>
          </thead>
          <tbody>
            <GroupHeader label="[인보이스 항목]" />
            {round.invoiceRows.length > 0
              ? <CompRows rows={round.invoiceRows} />
              : <EmptyRow text={round.hasInvoice ? '항목 없음' : '인보이스 없음'} />}

            <GroupHeader label="[통관 항목]" />
            {round.customsParseFailed
              ? <EmptyRow text="통관서 파싱불가" className="text-amber-600 font-medium" />
              : round.customsRows.length > 0
                ? <CompRows rows={round.customsRows} />
                : <EmptyRow text="항목 없음" />}
          </tbody>
        </table>
      </div>
    </details>
  )
}
