import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { loadPaymentsData, roundName } from '@/lib/data/payments'
import { PaymentKpis } from '@/components/payments/PaymentKpis'
import { PaymentAlerts } from '@/components/payments/PaymentAlerts'
import { PaymentTable } from '@/components/payments/PaymentTable'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: '지급 현황',
}

/**
 * 양사 대표가 보는 첫 화면.
 *
 * ?view=a1 로 관점을 뒤집는다 — 같은 금액을 토에이는 미지급으로, 에이원은 미수로 읽는다.
 * 입력 모드는 두지 않는다. 담당자가 쓰려고 화면을 갈아타야 하면 결국 엑셀로 돌아간다 —
 * 표에서 차수를 펴면 그 자리에서 입력·수정한다.
 */
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const view = (await searchParams).view === 'a1' ? 'a1' : 'toei'

  const today = new Date().toISOString().slice(0, 10)
  const supabase = await createClient()
  const { rows, summary, alerts } = await loadPaymentsData(supabase, today)

  const billed = rows.filter((r) => r.billedKrw != null).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1B5E20' }}>지급 현황</h2>
          <p className="text-sm text-muted-foreground">
            {today} 기준 · 전체 {rows.length}차수 중 청구 완료 {billed}차수
          </p>
        </div>

        <div className="inline-flex overflow-hidden rounded-md border text-sm">
          {(['toei', 'a1'] as const).map((v) => (
            <Link
              key={v}
              href={`/payments?view=${v}`}
              className={cn(
                'px-3 py-1.5',
                view === v ? 'bg-slate-800 font-semibold text-white' : 'hover:bg-muted',
              )}
            >
              {v === 'toei' ? '토에이 시점' : '에이원 시점'}
            </Link>
          ))}
        </div>
      </div>

      <PaymentAlerts alerts={alerts} />

      <PaymentKpis summary={summary} view={view} />

      <PaymentTable rows={rows} view={view} />

      <div className="space-y-1.5 rounded-md border bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
        {summary.lastPayment && (
          <p>
            <span className="font-semibold text-foreground">최근 지급</span>
            {' · '}{roundName(summary.lastPayment)}{' '}
            <span className="tabular-nums text-foreground">
              {Math.round(summary.lastPayment.amountKrw).toLocaleString('ko-KR')}원
            </span>
            {' · '}{summary.lastPayment.paidAt}
          </p>
        )}
        {/* 부호 대신 방향을 말로 적는다 — 「-15,935,688원」은 누가 누구에게 줄 돈인지 알 수 없다. */}
        <p>
          <span className="font-semibold text-foreground">최종정산</span>
          {' · '}아직 정산되지 않은 {summary.closingOpenCount}차수를 서로 상계하면{' '}
          <span className="tabular-nums text-foreground">
            {Math.abs(Math.round(summary.closingBalanceKrw)).toLocaleString('ko-KR')}원
          </span>
          {'을 '}
          {summary.closingBalanceKrw >= 0
            ? (view === 'toei' ? '토에이가 더 내야 합니다' : '에이원이 더 받을 금액입니다')
            : (view === 'toei' ? '토에이가 돌려받을 금액입니다' : '에이원이 돌려줄 금액입니다')}
          {'. 창고 보관료 같은 그 밖의 입출금은 '}
          <Link href="/payments/ledger" className="underline underline-offset-2">통장 원장</Link>
          에서 봅니다.
        </p>
      </div>
    </div>
  )
}
