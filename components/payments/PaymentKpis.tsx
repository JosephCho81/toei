import { cn } from '@/lib/utils'
import type { PaymentSummary } from '@/lib/data/payments'

/**
 * 대표가 5초 안에 읽는 네 숫자.
 *
 * 관점(토에이/에이원)에 따라 라벨만 바뀌고 금액은 같다 — 화면을 두 벌 만들면 두 벌이 어긋난다.
 * 색은 연체 하나에만 쓴다. 네 장을 다 칠하면 어느 것이 급한지 알 수 없다.
 */
export function PaymentKpis({
  summary,
  view,
}: {
  summary: PaymentSummary
  view: 'toei' | 'a1'
}) {
  const cards = [
    {
      label: view === 'toei' ? '아직 내지 않은 돈' : '아직 받지 못한 돈',
      value: summary.balanceKrw,
      sub: `청구 ${summary.billedKrw.toLocaleString('ko-KR')}원 · `
        + `지급 ${summary.paidKrw.toLocaleString('ko-KR')}원`,
      alert: false,
    },
    {
      label: '기일이 지난 돈',
      value: summary.overdueKrw,
      sub: summary.overdueCount > 0
        ? `${summary.overdueCount}개 차수 · 가장 오래된 건 ${summary.maxDelayDays.toLocaleString('ko-KR')}일 지남`
        : '없습니다',
      alert: summary.overdueKrw > 0,
    },
    {
      label: view === 'toei' ? '90일 안에 낼 돈' : '90일 안에 받을 돈',
      value: summary.next90Krw,
      sub: summary.nextDue
        ? `${summary.next90Count}개 차수 · 가장 이른 기일 ${summary.nextDue.dueDate}`
        : '없습니다',
      alert: false,
    },
    {
      label: '아직 청구 전',
      value: summary.plannedKrw,
      sub: summary.plannedCount > 0 ? `${summary.plannedCount}개 차수 예상액` : '없습니다',
      alert: false,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-card px-4 py-3">
          <div className="break-keep text-sm text-muted-foreground">{c.label}</div>
          <div className={cn(
            'mt-1 text-xl font-semibold tabular-nums tracking-tight',
            c.alert && 'text-red-700',
          )}>
            {Math.round(c.value).toLocaleString('ko-KR')}
            <span className="ml-0.5 text-sm font-normal text-muted-foreground">원</span>
          </div>
          <div className="mt-1 break-keep text-sm leading-snug text-muted-foreground">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}
