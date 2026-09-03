import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { loadPaymentsData } from '@/lib/data/payments'
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
 * ?edit=1 이면 담당자 모드가 되어 입력·수정 버튼이 붙는다.
 * (인증이 켜지면 view/edit 는 쿼리스트링이 아니라 로그인 역할에서 정한다.)
 */
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; edit?: string }>
}) {
  const sp = await searchParams
  const view = sp.view === 'a1' ? 'a1' : 'toei'
  const editable = sp.edit === '1'

  const today = new Date().toISOString().slice(0, 10)
  const supabase = await createClient()
  const { rows, summary, alerts } = await loadPaymentsData(supabase, today)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1B5E20' }}>지급 현황</h2>
          <p className="text-xs text-muted-foreground">
            {today} 기준 · 중간정산 {rows.filter((r) => r.billedKrw != null).length}차수
            {editable && ' · 담당자 모드'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border text-xs">
            {(['toei', 'a1'] as const).map((v) => (
              <Link
                key={v}
                href={`/payments?view=${v}${editable ? '&edit=1' : ''}`}
                className={cn(
                  'px-3 py-1.5',
                  view === v ? 'bg-emerald-700 font-semibold text-white' : 'hover:bg-muted',
                )}
              >
                {v === 'toei' ? '토에이 시점' : '에이원 시점'}
              </Link>
            ))}
          </div>
          <Link
            href={`/payments?view=${view}${editable ? '' : '&edit=1'}`}
            className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
          >
            {editable ? '읽기 전용으로' : '입력 모드'}
          </Link>
        </div>
      </div>

      <PaymentAlerts alerts={alerts} editable={editable} />

      <PaymentKpis summary={summary} view={view} />

      <PaymentTable rows={rows} editable={editable} />

      <div className="space-y-1.5 rounded-md border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        {summary.lastPayment && (
          <p>
            <span className="font-semibold text-foreground">최근 지급</span>
            {' · '}{summary.lastPayment.roundLabel}{' '}
            <span className="font-mono text-foreground">
              {Math.round(summary.lastPayment.amountKrw).toLocaleString('ko-KR')}원
            </span>
            {' · '}{summary.lastPayment.paidAt}
          </p>
        )}
        <p>
          <span className="font-semibold text-foreground">최종정산(클로징)</span>
          {' · '}미정산 {summary.closingOpenCount}차수 순액{' '}
          <span className="font-mono text-foreground">
            {Math.round(summary.closingBalanceKrw).toLocaleString('ko-KR')}원
          </span>
          {'. '}창고 보관료·기타 입출금은 정산과 별개로{' '}
          <Link href="/payments/ledger" className="underline underline-offset-2">통장 원장</Link>
          에서 봅니다.
        </p>
        {summary.calcDiffCount > 0 && (
          <p>
            <span className="font-semibold text-foreground">검산 차이</span>
            {' · '}실제 청구액과 시스템 확정값이 어긋나는 차수 {summary.calcDiffCount}건 (순
            <span className="font-mono text-foreground">
              {Math.round(summary.calcDiffKrw).toLocaleString('ko-KR')}원
            </span>
            ). 미지급이 아니라 계산 차이이며,{' '}
            <Link href="/verification" className="underline underline-offset-2">검증 리포트</Link>
            에서 다룹니다.
          </p>
        )}
      </div>
    </div>
  )
}
