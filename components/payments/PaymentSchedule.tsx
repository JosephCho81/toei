import Link from 'next/link'
import { cn } from '@/lib/utils'
import { roundName, type MonthlyDue } from '@/lib/data/payments'

/**
 * 앞으로 넉 달, 달마다 얼마가 나가는가.
 *
 * 담당자 요청(2026-09-05): 「각 월별 결제 예정금액을 한 3-4개월 정도 알 수 있도록」.
 * 기일이 아직 오지 않은 돈을 미지급금에서 뺐으니(위 KPI), 그 돈이 어디로 갔는지
 * 이 표가 받아야 한다 — 빼기만 하고 안 보여주면 5억이 화면에서 사라진 것처럼 보인다.
 *
 * **기일이 지난 것은 여기 없다.** 그건 예정이 아니라 이미 밀린 돈이고 위 KPI 가 센다.
 * 「예상」이 붙은 금액은 아직 청구 전이라 시스템 계산값으로 잡은 것이다.
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
              <ul className="mt-1 space-y-0.5 text-sm">
                {m.rounds.map((r) => (
                  <li key={`${r.transactionId}-${r.dueDate}`} className="flex justify-between gap-2">
                    <Link
                      href={`/transactions/${r.transactionId}`}
                      className="text-muted-foreground underline underline-offset-2"
                    >
                      {roundName(r)}
                      <span className="ml-1 tabular-nums">{r.dueDate.slice(5)}</span>
                    </Link>
                    <span className="tabular-nums">
                      {r.planned && <span className="text-muted-foreground">예상 </span>}
                      {krw(r.krw)}
                    </span>
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
    </div>
  )
}
