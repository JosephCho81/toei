import { cn } from '@/lib/utils'
import type { PaymentSummary } from '@/lib/data/payments'

/**
 * 대표가 5초 안에 읽는 네 숫자.
 * 관점(토에이/에이원)에 따라 라벨만 바뀌고 금액은 같다 — 화면을 두 벌 만들면 두 벌이 어긋난다.
 */
export function PaymentKpis({
  summary,
  view,
}: {
  summary: PaymentSummary
  view: 'toei' | 'a1'
}) {
  const balanceLabel = view === 'toei' ? '미지급 잔액' : '미수 잔액'
  const nextLabel = view === 'toei' ? '90일 내 결제' : '90일 내 회수 예정'

  const cards = [
    {
      label: balanceLabel,
      value: summary.balanceKrw,
      sub: `청구 ${summary.billedKrw.toLocaleString('ko-KR')} − 지급 ${summary.paidKrw.toLocaleString('ko-KR')}`,
      tone: '',
    },
    {
      label: '연체',
      value: summary.overdueKrw,
      sub: summary.overdueCount > 0
        ? `${summary.overdueCount}개 차수 · 최장 ${summary.maxDelayDays.toLocaleString('ko-KR')}일`
          + (summary.overpaidCount > 0
              ? ` · 별도 초과 지급 ${summary.overpaidKrw.toLocaleString('ko-KR')}원`
              : '')
        : '없음',
      tone: summary.overdueKrw > 0 ? 'crit' : '',
    },
    {
      label: nextLabel,
      value: summary.next90Krw,
      sub: summary.nextDue
        ? `${summary.next90Count}개 차수 · 가장 이른 건 ${summary.nextDue.dueDate?.slice(5)} (D${summary.nextDue.delayDays})`
        : '예정 없음',
      tone: summary.next90Krw > 0 ? 'warn' : '',
    },
    {
      label: '청구 예정',
      value: summary.plannedKrw,
      sub: summary.plannedCount > 0
        ? `${summary.plannedCount}개 차수 · 아직 청구 전`
        : '없음',
      tone: '',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={cn('bg-card px-4 py-3', c.tone === 'crit' && 'bg-red-50')}>
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground">{c.label}</div>
          <div className={cn(
            'mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight',
            c.tone === 'crit' && 'text-red-700',
            c.tone === 'warn' && 'text-amber-700',
            c.tone === 'ok' && 'text-emerald-700',
          )}>
            {Math.round(c.value).toLocaleString('ko-KR')}
            <span className="ml-0.5 font-sans text-xs font-normal text-muted-foreground">원</span>
          </div>
          <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}
