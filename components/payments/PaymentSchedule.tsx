import Link from 'next/link'
import { cn } from '@/lib/utils'
import { DUE_GRACE_DAYS, roundName, type MonthlyDue } from '@/lib/data/payments'

/**
 * 이번 달부터 넉 달, 달마다 얼마가 나가는가.
 *
 * 담당자 요청(2026-09-05): 「각 월별 결제 예정금액을 한 3-4개월 정도 알 수 있도록」.
 *
 * **이번 달 안에서 기일이 지난 건도 들어 있다** (담당자 2026-09-10:
 * 「날자 지난 것도 넣어주시고 일정 기간 이상 지나갔는데 지급 다 안 된 건은 빨간색 표시」).
 * 빼 두면 기일이 오늘을 지나는 순간 그 달 표에서 사라져, 아직 나가야 할 돈이 화면에서 없어진다.
 *
 * **빨강은 유예(7일)를 넘긴 줄에만 붙는다.** 영업일 3~4일 차이로 늦는 것은 연체가 아니라
 * 계산서 일정·휴일·금액 검토다. 기일에 붙자마자 빨개지면 정상인 줄까지 물들어
 * 정작 밀린 돈이 묻힌다.
 *
 * 금액은 **아직 나가야 할 돈**이다. 일부가 이미 나간 차수는 그 달에 나갈 총액을 밑에 적는다.
 */
export function PaymentSchedule({
  months,
  laterKrw,
  laterCount,
}: {
  months: MonthlyDue[]
  laterKrw: number
  laterCount: number
}) {
  const krw = (n: number) => Math.round(n).toLocaleString('ko-KR')
  const total = months.reduce((s, m) => s + m.totalKrw, 0)

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b bg-slate-50 px-3 py-2">
        <span className="text-sm font-semibold">월별 결제 예정</span>
        <span className="text-sm text-muted-foreground">
          넉 달 합계 <b className="tabular-nums text-foreground">{krw(total)}</b>원
          {laterCount > 0 && ` · 그 이후 ${laterCount}개 차수 ${krw(laterKrw)}원`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {months.map((m) => (
          <div key={m.month} className="bg-card px-3 py-2.5">
            <div className="text-sm text-muted-foreground">{m.month.replace('-', '년 ')}월</div>
            <div className={cn('mt-0.5 text-lg font-semibold tabular-nums tracking-tight',
              m.totalKrw === 0 && 'text-muted-foreground')}>
              {krw(m.totalKrw)}
              <span className="ml-0.5 text-sm font-normal text-muted-foreground">원</span>
            </div>

            {m.rounds.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">예정된 결제가 없습니다</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {m.rounds.map((r) => (
                  <li key={`${r.transactionId}-${r.dueDate}`}>
                    <div className="flex justify-between gap-2">
                      <Link
                        href={`/transactions/${r.transactionId}`}
                        className={cn('underline underline-offset-2',
                          r.pastGrace ? 'font-semibold text-red-700' : 'text-muted-foreground')}
                      >
                        {roundName(r)}
                        <span className="ml-1 tabular-nums">{r.dueDate.slice(5)}</span>
                      </Link>
                      <span className={cn('tabular-nums', r.pastGrace && 'font-semibold text-red-700')}>
                        {r.planned && <span className="text-muted-foreground">예상 </span>}
                        {krw(r.krw)}
                      </span>
                    </div>

                    {/* 손댈 줄에만 한 문장. 문장이 없으면 일정대로 도는 중이라는 뜻이다. */}
                    {r.pastGrace ? (
                      <p className="text-sm text-red-700">
                        {krw(r.krw)}원 지급 필요 (기일 {DUE_GRACE_DAYS}일 경과)
                      </p>
                    ) : r.krw !== r.basisKrw ? (
                      <p className="text-sm text-muted-foreground">
                        이 달 총액 {krw(r.basisKrw)}원 중 남은 금액입니다
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            {m.plannedKrw !== 0 && m.billedKrw !== 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                청구분 {krw(m.billedKrw)} · 예상 {krw(m.plannedKrw)}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="border-t bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
        기일에서 {DUE_GRACE_DAYS}일까지는 계산서 일정·휴일로 늦어질 수 있어 빨강을 붙이지 않습니다.
        「예상」은 아직 청구값을 넣지 않아 계산값으로 잡은 금액입니다.
      </p>
    </div>
  )
}
