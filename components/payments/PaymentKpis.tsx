import { cn } from '@/lib/utils'
import type { PaymentSummary } from '@/lib/data/payments'

/**
 * 대표가 5초 안에 읽는 네 숫자.
 *
 * 돈의 방향은 하나다 — **한국에이원 → 토에이산교**. 중간정산·최종정산 모두
 * 양수면 에이원이 토에이에 낼 돈이다(리포트·PDF 의 「한국에이원 → 토에이산교 지급」과 같다).
 * 그래서 토에이 시점에서는 미수금, 에이원 시점에서는 미지급금으로 읽는다.
 * 관점에 따라 라벨만 바뀌고 금액은 같다 — 화면을 두 벌 만들면 두 벌이 어긋난다.
 *
 * 색은 기일 경과 하나에만 쓴다. 네 장을 다 칠하면 어느 것이 급한지 알 수 없다.
 */
export function PaymentKpis({
  summary,
  view,
}: {
  summary: PaymentSummary
  view: 'toei' | 'a1'
}) {
  const toei = view === 'toei'
  const krw = (n: number) => Math.round(n).toLocaleString('ko-KR')

  const cards = [
    {
      label: toei ? '미수금' : '미지급금',
      value: summary.balanceKrw,
      sub: `청구 누계 ${krw(summary.billedKrw)}원 · `
        + `${toei ? '입금' : '지급'} 누계 ${krw(summary.paidKrw)}원`,
      alert: false,
    },
    {
      label: '기일 경과',
      value: summary.overdueKrw,
      sub: summary.overdueCount > 0
        ? `${summary.overdueCount}개 차수 · 최장 ${summary.maxDelayDays.toLocaleString('ko-KR')}일 경과`
        : '없습니다',
      alert: summary.overdueKrw > 0,
    },
    {
      label: toei ? '90일 내 회수 예정' : '90일 내 지급 예정',
      value: summary.next90Krw,
      sub: summary.nextDue
        ? `${summary.next90Count}개 차수 · 가장 이른 기일 ${summary.nextDue.dueDate}`
        : '없습니다',
      alert: false,
    },
    {
      label: '청구 예정',
      value: summary.plannedKrw,
      sub: summary.plannedCount > 0 ? `${summary.plannedCount}개 차수 · 아직 청구 전` : '없습니다',
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
            {krw(c.value)}
            <span className="ml-0.5 text-sm font-normal text-muted-foreground">원</span>
          </div>
          <div className="mt-1 break-keep text-sm leading-snug text-muted-foreground">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}
