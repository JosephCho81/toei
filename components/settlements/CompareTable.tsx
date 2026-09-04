'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PAID_TOLERANCE_KRW } from '@/lib/data/payments'
import type { CompareRow, SettlementKind } from '@/lib/data/settlementCompare'

/**
 * 청구값 · 계산값 · 지불값을 한 줄에 세운 표. 세 화면이 같은 것을 쓴다.
 *
 * 세 금액의 뜻이 다르다 —
 *   청구액   실제로 보낸 청구서 금액 (사실)
 *   계산값   지금 규약으로 다시 계산한 금액 (규약)
 *   지급액   통장에서 오간 금액 (사실)
 *
 * 그래서 차이도 두 가지다. **「청구 − 계산」은 청구가 틀린 것**이고,
 * **「청구 − 지급」은 아직 안 낸 것**이다. 둘을 한 칸에 합치면 35차처럼
 * 「계산은 맞는데 청구만 554만원 적게 나간」 건을 못 찾는다.
 *
 * 색은 빨강 하나만 쓴다 — 지급 현황과 같은 규칙이다.
 * 빨강은 「덜 청구한 돈」과 「덜 들어온 돈」에만 붙는다.
 */

const TH = 'px-3 py-2.5 font-semibold whitespace-nowrap text-slate-600'
const TD = 'px-3 py-2.5 whitespace-nowrap align-middle'
const NUM = 'text-right'
const CENTER = 'text-center'
const COLS = 8

type FilterKey = 'all' | 'billMismatch' | 'open' | 'paid' | 'unbilled'

function krw(n: number | null | undefined): string {
  return n == null ? '—' : Math.round(n).toLocaleString('ko-KR')
}

/** 부호를 앞에 붙여 방향을 보여준다. 차이 열에서만 쓴다. */
function signed(n: number): string {
  const v = Math.round(n)
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('ko-KR')}`
}

export function CompareTable({
  rows,
  kind,
  view,
}: {
  rows: CompareRow[]
  kind: SettlementKind
  view: 'toei' | 'a1'
}) {
  const toei = view === 'toei'
  const [filter, setFilter] = useState<FilterKey>('all')
  const [open, setOpen] = useState<Set<string>>(new Set())

  const FILTERS: { key: FilterKey; label: string; test: (r: CompareRow) => boolean }[] = useMemo(() => [
    { key: 'all', label: '전체', test: () => true },
    {
      key: 'billMismatch',
      label: '청구 ≠ 계산',
      test: (r) => !r.legacyVatMode && r.billVsCalcKrw != null
        && Math.abs(r.billVsCalcKrw) >= PAID_TOLERANCE_KRW,
    },
    {
      key: 'open',
      label: '미수',
      test: (r) => r.balanceKrw != null && Math.abs(r.balanceKrw) >= PAID_TOLERANCE_KRW,
    },
    {
      key: 'paid',
      label: '완납',
      test: (r) => r.balanceKrw != null && Math.abs(r.balanceKrw) < PAID_TOLERANCE_KRW,
    },
    { key: 'unbilled', label: '청구 전', test: (r) => r.invoicedKrw == null },
  ], [])

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, rows.filter(f.test).length])) as Record<FilterKey, number>,
    [rows, FILTERS],
  )
  const visible = useMemo(
    () => rows.filter(FILTERS.find((f) => f.key === filter)!.test),
    [rows, filter, FILTERS],
  )

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-md border bg-slate-50 px-4 py-6 text-center text-sm text-muted-foreground">
        아직 등록된 {kind === 'penalty' ? '지체상금' : '정산'}이 없습니다.
      </p>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex overflow-hidden rounded-md border text-sm">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'border-l px-3 py-1.5 first:border-l-0',
                filter === f.key ? 'bg-slate-800 font-semibold text-white' : 'hover:bg-muted',
              )}
            >
              {f.label}
              <span className={cn('ml-1.5 tabular-nums', filter === f.key ? 'text-slate-300' : 'text-muted-foreground')}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          차수를 누르면 계산 내역과 {toei ? '입금' : '지급'} 회차가 열립니다.
        </p>
      </div>

      <div className="mt-2 overflow-x-auto rounded-md border">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className={cn(TH, CENTER, 'w-[9%]')}>차수</th>
              <th className={cn(TH, NUM, 'w-[15%]')}>청구액 (원)</th>
              <th className={cn(TH, NUM, 'w-[15%]')}>계산값 (원)</th>
              <th className={cn(TH, NUM, 'w-[13%]')}>청구−계산</th>
              <th className={cn(TH, NUM, 'w-[15%]')}>{toei ? '입금액' : '지급액'} (원)</th>
              <th className={cn(TH, NUM, 'w-[13%]')}>{toei ? '미수금' : '미지급금'}</th>
              <th className={cn(TH, CENTER, 'w-[12%]')}>기일</th>
              <th className={cn(TH, CENTER, 'w-[8%]')}>상태</th>
            </tr>
          </thead>

          {visible.map((r, i) => {
            const rowId = `${r.transactionId}-${r.incurredOn ?? ''}`
            const isOpen = open.has(rowId)
            const zebra = i % 2 === 1 ? 'bg-slate-50/60' : ''
            const billGap = r.billVsCalcKrw
            const underBilled = !r.legacyVatMode && billGap != null && billGap < -PAID_TOLERANCE_KRW
            const unpaid = r.balanceKrw != null && r.balanceKrw > PAID_TOLERANCE_KRW

            return (
              <tbody key={rowId} className="border-t">
                <tr
                  className={cn('group cursor-pointer hover:bg-slate-100/70', zebra)}
                  onClick={() => toggle(rowId)}
                >
                  <td className={cn(TD, CENTER, 'font-semibold')}>
                    <span className="inline-flex items-center gap-1">
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-slate-400" />
                        : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      {r.roundNo != null ? `${r.roundNo}차` : r.roundLabel}
                    </span>
                  </td>

                  <td className={cn(TD, NUM, 'tabular-nums')}>
                    {r.invoicedKrw != null ? krw(r.invoicedKrw)
                      : <span className="text-muted-foreground">청구 전</span>}
                  </td>

                  <td className={cn(TD, NUM, 'tabular-nums text-slate-600')}>
                    {r.calcKrw != null ? krw(r.calcKrw)
                      : <span className="text-muted-foreground">—</span>}
                  </td>

                  {/* 청구가 계산과 다른 것은 미지급이 아니라 청구 오류다. 빨강은 덜 청구한 쪽에만. */}
                  <td className={cn(TD, NUM, 'tabular-nums font-semibold',
                    underBilled ? 'text-red-700' : 'text-slate-600')}>
                    {r.legacyVatMode ? <span className="text-muted-foreground">구방식</span>
                      : billGap == null ? <span className="text-muted-foreground">—</span>
                      : Math.abs(billGap) < PAID_TOLERANCE_KRW ? '0'
                      : signed(billGap)}
                  </td>

                  <td className={cn(TD, NUM, 'tabular-nums')}>
                    {r.installments.length === 0
                      ? <span className="text-muted-foreground">—</span>
                      : krw(r.paidKrw)}
                  </td>

                  {/* 부호로 방향을 말하지 않는다. 크기는 숫자로, 방향은 말로. */}
                  <td className={cn(TD, NUM, 'tabular-nums font-semibold',
                    unpaid ? 'text-red-700' : 'text-slate-600')}>
                    {r.balanceKrw == null ? '—'
                      : Math.abs(r.balanceKrw) < PAID_TOLERANCE_KRW ? '0'
                      : krw(Math.abs(r.balanceKrw))}
                    {r.balanceKrw != null && r.balanceKrw < -PAID_TOLERANCE_KRW && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {toei ? '돌려줄 몫' : '돌려받을 몫'}
                      </span>
                    )}
                  </td>

                  <td className={cn(TD, CENTER, 'tabular-nums text-slate-600')}>
                    {r.dueDate ?? '미정'}
                  </td>

                  <td className={cn(TD, CENTER, 'text-slate-600')}>
                    {r.invoicedKrw == null ? '청구 전'
                      : r.balanceKrw != null && Math.abs(r.balanceKrw) < PAID_TOLERANCE_KRW ? '완납'
                      : r.balanceKrw != null && r.balanceKrw < 0 ? '초과 수령'
                      : '미수'}
                  </td>
                </tr>

                {isOpen && (
                  <tr>
                    <td colSpan={COLS} className="border-l-4 border-slate-300 bg-slate-100/70 px-6 py-3">
                      <RowDetail row={r} toei={toei} />
                    </td>
                  </tr>
                )}
              </tbody>
            )
          })}
        </table>
      </div>
    </>
  )
}

/**
 * 펼친 한 줄의 속. 「왜 틀렸는가」가 여기 있어야 한다 —
 * 표에서 −5,544,437 만 보고는 계산이 틀렸는지 청구가 틀렸는지 알 수 없다.
 */
function RowDetail({ row, toei }: { row: CompareRow; toei: boolean }) {
  const bill = row.billVsCalcKrw
  const confirm = row.confirmVsCalcKrw

  return (
    <div className="space-y-3 text-sm">
      {row.reason && (
        <p>
          <span className="font-semibold">사유</span>
          {' · '}{row.reason}
          {row.incurredOn && <span className="text-muted-foreground"> (발생 {row.incurredOn})</span>}
        </p>
      )}

      {/* 세 금액을 나란히 — 어느 것이 어긋났는지는 여기서만 갈린다 */}
      <table className="w-full max-w-xl border-collapse">
        <tbody>
          <Line label="실제 청구액" value={row.invoicedKrw} note="청구서로 보낸 금액" />
          <Line label="담당자 확정금액" value={row.confirmedKrw} note="확정한 금액" />
          <Line label="시스템 계산값" value={row.calcKrw} note="현재 규약으로 다시 계산" />
          <Line label={toei ? '입금액' : '지급액'} value={row.paidKrw} note="통장에서 오간 금액" />
        </tbody>
      </table>

      {row.legacyVatMode ? (
        <p className="text-muted-foreground">
          구방식(부가세 미분리)으로 확정된 정산이라 계산값과 직접 비교할 수 없습니다.
          재입력하면 현재 규약으로 넘어갑니다.
        </p>
      ) : (
        <>
          {bill != null && Math.abs(bill) >= PAID_TOLERANCE_KRW && (
            <p className={bill < 0 ? 'text-red-700' : 'text-slate-700'}>
              {bill < 0
                ? `계산값보다 ${krw(-bill)}원 적게 청구됐습니다 — 청구서를 확인해야 합니다`
                : `계산값보다 ${krw(bill)}원 많이 청구됐습니다 — 청구서를 확인해야 합니다`}
              {confirm != null && Math.abs(confirm) < PAID_TOLERANCE_KRW
                && ' (확정금액은 계산값과 일치하므로 계산이 아니라 청구가 어긋난 것입니다)'}
            </p>
          )}
          {confirm != null && Math.abs(confirm) >= PAID_TOLERANCE_KRW && (
            <p className="text-muted-foreground">
              확정금액과 계산값이 {krw(Math.abs(confirm))}원 다릅니다 — 항목 입력이나 규약 적용을 확인해야 합니다.
            </p>
          )}
        </>
      )}

      {row.installments.length > 0 ? (
        <table className="w-full max-w-2xl border-collapse">
          <tbody>
            {row.installments.map((inst, i) => (
              <tr key={inst.paymentId || i} className="border-b border-slate-200 last:border-0">
                <td className="w-12 py-1.5 pr-3 text-muted-foreground">{i + 1}회</td>
                <td className="w-28 py-1.5 pr-3 tabular-nums">{inst.paidAt}</td>
                <td className="w-40 py-1.5 pr-3 text-right tabular-nums">
                  {inst.direction === 'in' && <span className="text-muted-foreground">환급 </span>}
                  {krw(Math.abs(inst.amountKrw))}
                </td>
                <td className="py-1.5 text-muted-foreground">
                  {!inst.confirmed && '여러 차수를 묶은 이체 — 확인 대기'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-muted-foreground">아직 {toei ? '입금' : '지급'} 기록이 없습니다.</p>
      )}

      <p>
        <Link href={`/transactions/${row.transactionId}`} className="underline underline-offset-2">
          거래 상세 보기
        </Link>
        {' · '}
        <Link href="/payments" className="underline underline-offset-2">
          지급 입력은 지급 현황에서
        </Link>
      </p>
    </div>
  )
}

function Line({ label, value, note }: { label: string; value: number | null; note: string }) {
  return (
    <tr className="border-b border-slate-200 last:border-0">
      <td className="w-40 py-1.5 pr-3 text-muted-foreground">{label}</td>
      <td className="w-40 py-1.5 pr-3 text-right font-semibold tabular-nums">
        {value == null ? '—' : `${krw(value)}원`}
      </td>
      <td className="py-1.5 text-muted-foreground">{note}</td>
    </tr>
  )
}
