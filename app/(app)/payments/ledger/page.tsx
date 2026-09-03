import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: '통장 원장',
}

/**
 * 통장 입출금 원장.
 *
 * 매일 쓰는 화면이 아니다 — 지급 현황에서 차수별로 넣으면 대부분 끝나고,
 * 여기는 「한 번의 이체가 여러 차수에 걸친 건」과 「어느 차수인지 모르는 입금」만 다룬다.
 * 배분 편집 UI 는 다음 단계에서 붙인다. 지금은 무엇이 남았는지 보여주는 것까지.
 */

type Row = {
  id: string
  paid_at: string
  direction: 'out' | 'in'
  amount_krw: number | string
  bank_memo: string | null
  unallocated_krw: number | string
  unconfirmed_count: number
  allocated_krw: number | string
}

type Alloc = {
  payment_id: string
  kind: string
  amount_krw: number | string
  confirmed: boolean
  transactions: { round_label: string } | { round_label: string }[] | null
}

const KIND_LABEL: Record<string, string> = {
  interim: '중간정산', closing: '최종정산', warehouse: '창고', other: '기타',
}

function n(v: number | string | null | undefined): number {
  return v == null ? 0 : Number(v)
}

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>
}) {
  const showAll = (await searchParams).all === '1'
  const supabase = await createClient()

  const [{ data: payments }, { data: allocs }] = await Promise.all([
    supabase
      .from('v_payment_unallocated')
      .select('id, paid_at, direction, amount_krw, bank_memo, allocated_krw, unallocated_krw, unconfirmed_count')
      .order('paid_at', { ascending: false }),
    supabase
      .from('payment_allocations')
      .select('payment_id, kind, amount_krw, confirmed, transactions(round_label)'),
  ])

  const byPayment = new Map<string, Alloc[]>()
  for (const a of (allocs ?? []) as Alloc[]) {
    const list = byPayment.get(a.payment_id) ?? []
    list.push(a)
    byPayment.set(a.payment_id, list)
  }

  const all = (payments ?? []) as Row[]
  const pending = all.filter((p) => n(p.unallocated_krw) > 0 || Number(p.unconfirmed_count) > 0)
  const rows = showAll ? all : pending

  const unallocKrw = all.reduce((s, p) => s + n(p.unallocated_krw), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1B5E20' }}>통장 원장</h2>
          <p className="text-xs text-muted-foreground">
            전체 {all.length}건 · 배분이 끝나지 않은 {pending.length}건
            {unallocKrw > 0 && ` · 미배분 ${unallocKrw.toLocaleString('ko-KR')}원`}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <Link
            href={showAll ? '/payments/ledger' : '/payments/ledger?all=1'}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            {showAll ? '남은 것만 보기' : '전체 보기'}
          </Link>
          <Link href="/payments" className="rounded-md border px-3 py-1.5 hover:bg-muted">
            지급 현황
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 text-muted-foreground">
              <th className="px-3 py-2 text-left text-xs font-medium">날짜</th>
              <th className="px-3 py-2 text-left text-xs font-medium">구분</th>
              <th className="px-3 py-2 text-right text-xs font-medium">금액</th>
              <th className="px-3 py-2 text-left text-xs font-medium">배분</th>
              <th className="px-3 py-2 text-left text-xs font-medium">적요</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const list = byPayment.get(p.id) ?? []
              const unalloc = n(p.unallocated_krw)
              return (
                <tr key={p.id} className={cn('border-t', unalloc > 0 && 'bg-red-50',
                  unalloc === 0 && Number(p.unconfirmed_count) > 0 && 'bg-amber-50')}>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.paid_at}</td>
                  <td className={cn('px-3 py-2 text-xs',
                    p.direction === 'out' ? 'text-rose-800' : 'text-emerald-800')}>
                    {p.direction === 'out' ? '출금' : '입금'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {n(p.amount_krw).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {unalloc > 0 && (
                      <span className="mr-1 rounded-sm bg-red-600 px-1.5 py-0.5 font-semibold text-white">
                        미배분 {unalloc.toLocaleString('ko-KR')}원
                      </span>
                    )}
                    {list.map((a, i) => {
                      const t = Array.isArray(a.transactions) ? a.transactions[0] : a.transactions
                      return (
                        <span key={i} className={cn(
                          'mr-1 inline-block rounded-sm border px-1.5 py-0.5',
                          a.confirmed ? 'bg-card' : 'border-amber-500 bg-amber-100 text-amber-900',
                        )}>
                          {t?.round_label ?? KIND_LABEL[a.kind] ?? a.kind}
                          {' '}{n(a.amount_krw).toLocaleString('ko-KR')}
                          {!a.confirmed && ' · 확인 대기'}
                        </span>
                      )
                    })}
                    {list.length === 0 && unalloc === 0 && <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{p.bank_memo ?? '-'}</td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                배분이 끝나지 않은 건이 없습니다.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        「확인 대기」는 통장 적요에 적힌 배분을 그대로 옮겨 넣은 것으로, 담당자 확인을 아직 받지 않았습니다.
        차수별 배분을 고치는 화면은 다음 단계에서 붙입니다.
      </p>
    </div>
  )
}
