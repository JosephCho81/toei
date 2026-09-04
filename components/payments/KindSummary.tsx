import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PAID_TOLERANCE_KRW, type KindTotals } from '@/lib/data/payments'

/**
 * 중간정산 · 최종정산 · 지체상금 한 줄씩.
 *
 * 첫 화면은 **「얼마 언제」만** 답한다 — 청구가 계산과 맞는지는 각 정산 화면이 답한다.
 * 여기에 「청구−계산」을 끌어오면 대표 첫 화면이 다시 대사표가 된다.
 *
 * 세 구분을 한 표에 세우는 이유는 합계를 보여주려는 게 아니라
 * **어느 쪽에 돈이 묶여 있는지**를 한눈에 가르기 위해서다.
 */
export function KindSummary({ byKind }: { byKind: KindTotals[] }) {
  const krw = (n: number) => Math.round(n).toLocaleString('ko-KR')

  // 아직 한 건도 없는 구분은 0 만 세 칸 늘어놓게 되므로 줄이되, 통째로 감추지는 않는다 —
  // 지체상금이 사라지면 「없다」는 사실 자체가 보이지 않는다.
  const rows = byKind

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-slate-600">
            <th className="w-[22%] px-3 py-2 text-left font-semibold">구분</th>
            <th className="w-[22%] px-3 py-2 text-right font-semibold">청구액 (원)</th>
            <th className="w-[22%] px-3 py-2 text-right font-semibold">지급액 (원)</th>
            <th className="w-[22%] px-3 py-2 text-right font-semibold">미지급금 (원)</th>
            <th className="w-[12%] px-3 py-2 text-center font-semibold">남은 차수</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const unpaid = r.balanceKrw > PAID_TOLERANCE_KRW
            const empty = r.billedKrw === 0 && r.paidKrw === 0
            return (
              <tr key={r.kind} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-3 py-2">
                  <Link href={r.href} className="font-semibold underline underline-offset-2">
                    {r.label}
                  </Link>
                </td>
                {empty ? (
                  <td colSpan={4} className="px-3 py-2 text-muted-foreground">
                    아직 등록된 것이 없습니다
                  </td>
                ) : (
                  <>
                    <td className="px-3 py-2 text-right tabular-nums">{krw(r.billedKrw)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{krw(r.paidKrw)}</td>
                    {/* 부호로 방향을 말하지 않는다 — 「-15,935,839」는 누가 누구에게 줄 돈인지
                        알 수 없다. 크기는 숫자로, 방향은 말로 적는다. */}
                    <td className={cn('px-3 py-2 text-right font-semibold tabular-nums',
                      unpaid ? 'text-red-700' : 'text-slate-600')}>
                      {Math.abs(r.balanceKrw) < PAID_TOLERANCE_KRW ? '0' : krw(Math.abs(r.balanceKrw))}
                      {r.balanceKrw < -PAID_TOLERANCE_KRW && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          돌려받을 몫
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums text-slate-600">
                      {r.openCount === 0 ? '—' : `${r.openCount}개`}
                    </td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
