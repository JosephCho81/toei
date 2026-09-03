'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react'
import { PaymentDialog, type PaymentDraft } from './PaymentDialog'
import { PAID_TOLERANCE_KRW, roundName, type Installment, type PaymentRow } from '@/lib/data/payments'

/**
 * 차수별 지급 현황.
 *
 * 읽는 사람이 둘이다 — 양사 대표(한눈에 「얼마 남았나」)와 담당자(빨리 입력).
 * 그래서 기본은 차수당 한 줄이고, 줄을 누르면 그 차수의 지급 내역과 입력 버튼이 열린다.
 * 입력 모드를 따로 두지 않는다. 모드를 나누면 담당자가 매번 화면을 갈아타야 한다.
 *
 * 색은 빨강 하나만 쓴다. 손댈 곳이 빨강이고 나머지는 전부 회색조다.
 * 상태마다 색을 주면 44줄이 전부 물들어 정작 연체가 묻힌다.
 * 「검산차」·「배분 확인 대기」 같은 내부 용어는 표에 올리지 않고 펼친 상세에만 둔다.
 *
 * 글자는 크기 하나(text-sm)·서체 하나(본문 sans)다. 위계는 굵기와 색으로 낸다.
 * 금액 자릿수는 등폭 서체가 아니라 tabular-nums 로 맞춘다.
 */

/** 표의 열 수 — 펼친 상세가 가로로 다 차지하려면 이 값을 쓴다. */
const COLS = 8

type FilterKey = 'all' | 'attention' | 'open' | 'paid' | 'unbilled' | 'closing'

const FILTERS: { key: FilterKey; label: string; test: (r: PaymentRow) => boolean }[] = [
  { key: 'all', label: '전체', test: () => true },
  {
    key: 'attention',
    label: '확인 필요',
    test: (r) =>
      r.state === 'no_record' || r.state === 'overdue' || r.state === 'overpaid' ||
      (r.billedKrw == null && r.paidKrw !== 0),
  },
  { key: 'open', label: '미납', test: (r) => r.billedKrw != null && r.state !== 'paid' },
  { key: 'paid', label: '완납', test: (r) => r.state === 'paid' },
  { key: 'unbilled', label: '청구 전', test: (r) => r.billedKrw == null },
  { key: 'closing', label: '최종정산 남음', test: (r) => hasOpenClosing(r) },
]

/** 최종정산에 아직 오갈 돈이 남았는가. */
function hasOpenClosing(r: PaymentRow): boolean {
  return r.closingBilledKrw != null && Math.abs(r.closingBalanceKrw) >= PAID_TOLERANCE_KRW
}

function krw(n: number | null | undefined): string {
  return n == null ? '—' : Math.round(n).toLocaleString('ko-KR')
}

function usd(n: number | null): string {
  return n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function dayGap(from: string | null, to: string): number | null {
  if (!from) return null
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}

/** 대표가 읽는 한 마디. 내부 용어를 쓰지 않는다. */
function statusText(r: PaymentRow): string {
  const d = r.delayDays
  switch (r.state) {
    case 'paid': return '완납'
    case 'overpaid': return '초과 지급'
    case 'no_record':
    case 'overdue': return d != null ? `연체 ${d.toLocaleString('ko-KR')}일` : '연체'
    case 'due_soon':
    case 'upcoming': return d != null ? `기일 ${-d}일 남음` : '지급 예정'
    case 'unbilled': return r.paidKrw !== 0 ? '청구액 미등록' : '청구 전'
  }
}

/**
 * 손대야 할 줄에만 붙는 한 문장. 붙지 않았으면 문제가 없다는 뜻이다.
 * 화면에서 빨강은 이 문장과 그 줄의 잔액, 두 곳뿐이다.
 */
function issueText(r: PaymentRow): string | null {
  if (r.billedKrw == null) {
    return r.paidKrw !== 0
      ? `지급 ${krw(r.paidKrw)}원이 나갔으나 청구액이 등록되지 않아 대조할 기준이 없습니다`
      : null
  }
  if (r.state === 'no_record') return '지급 기록이 없습니다'
  if (r.state === 'overdue') {
    const last = r.installments.at(-1)
    return `${krw(r.balanceKrw)}원이 덜 나갔습니다`
      + (last ? ` (마지막 지급 ${last.paidAt})` : '')
  }
  if (r.state === 'overpaid') {
    return `청구액보다 ${krw(-r.balanceKrw)}원 더 나갔습니다 — 상계 여부 확인이 필요합니다`
  }
  return null
}

const TH = 'px-3 py-2.5 font-semibold whitespace-nowrap text-slate-600'
const TD = 'px-3 py-2.5 whitespace-nowrap align-middle'

export function PaymentTable({
  rows,
  view,
}: {
  rows: PaymentRow[]
  /** 같은 금액을 토에이는 미지급으로, 에이원은 미수로 읽는다 */
  view: 'toei' | 'a1'
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState<PaymentDraft | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, rows.filter(f.test).length])) as Record<FilterKey, number>,
    [rows],
  )
  const visible = useMemo(() => rows.filter(FILTERS.find((f) => f.key === filter)!.test), [rows, filter])

  const balanceLabel = view === 'toei' ? '미지급' : '미수'

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function remove(paymentId: string, label: string) {
    if (!confirm(`${label} 지급 기록을 삭제합니다. 되돌릴 수 없습니다.`)) return
    setBusy(paymentId)
    const res = await fetch(`/api/payments/${paymentId}`, { method: 'DELETE' })
    setBusy(null)
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: '삭제하지 못했습니다' }))
      alert(error)
      return
    }
    router.refresh()
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
          금액은 중간정산 기준입니다 · 차수를 누르면 지급 내역이 열리고, 거기서 바로 입력·수정합니다.
        </p>
      </div>

      <div className="mt-2 overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className={cn(TH, 'text-left w-24')}>차수</th>
              <th className={cn(TH, 'text-right w-32')}>수입금액 (USD)</th>
              <th className={cn(TH, 'text-right w-40')}>청구금액 (원)</th>
              <th className={cn(TH, 'text-right w-40')}>지급액 (원)</th>
              <th className={cn(TH, 'text-right w-36')}>{balanceLabel} (원)</th>
              <th className={cn(TH, 'text-left w-28')}>기일</th>
              <th className={cn(TH, 'text-left w-full')}>상태</th>
              <th className={cn(TH, 'w-12')} />
            </tr>
          </thead>

          {visible.map((r, i) => {
            const isOpen = open.has(r.transactionId)
            const issue = issueText(r)
            const zebra = i % 2 === 1 ? 'bg-slate-50/60' : ''

            return (
              <tbody key={r.transactionId} className="border-t">
                <tr
                  className={cn('group cursor-pointer hover:bg-slate-100/70', zebra)}
                  onClick={() => toggle(r.transactionId)}
                >
                  <td className={cn(TD, 'font-semibold')}>
                    <span className="inline-flex items-center gap-1">
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-slate-400" />
                        : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      {roundName(r)}
                    </span>
                  </td>
                  <td className={cn(TD, 'text-right tabular-nums text-slate-600')}>{usd(r.importAmountUsd)}</td>
                  <td className={cn(TD, 'text-right tabular-nums')}>
                    {r.billedKrw != null ? krw(r.billedKrw) : (
                      <span className="text-muted-foreground">
                        {r.plannedKrw == null ? '—' : `(${krw(r.plannedKrw)})`}
                      </span>
                    )}
                  </td>
                  <td className={cn(TD, 'text-right tabular-nums')}>
                    {r.installments.length === 0
                      ? <span className="text-muted-foreground">—</span>
                      : krw(r.paidKrw)}
                  </td>
                  <td className={cn(TD, 'text-right font-semibold tabular-nums',
                    // 빨강은 「덜 나간 돈」에만. 초과 지급은 확인 대상이지 연체가 아니다.
                    r.state === 'no_record' || r.state === 'overdue' ? 'text-red-700' : 'text-slate-600')}>
                    {r.billedKrw == null ? '—'
                      : Math.abs(r.balanceKrw) < PAID_TOLERANCE_KRW ? '0'
                      : r.balanceKrw < 0 ? `+${krw(-r.balanceKrw)}`
                      : krw(r.balanceKrw)}
                  </td>
                  <td className={cn(TD, 'tabular-nums text-slate-600')}>{r.dueDate ?? '미정'}</td>
                  <td className={TD}>
                    {statusText(r)}
                    {r.installments.length > 1 && (
                      <span className="text-muted-foreground"> · {r.installments.length}회 분할</span>
                    )}
                  </td>
                  <td className={cn(TD, 'text-right')}>
                    <button
                      type="button"
                      aria-label={`${roundName(r)} 지급 입력`}
                      title="지급 입력"
                      onClick={(e) => { e.stopPropagation(); setDraft({ mode: 'create', row: r }) }}
                      className="rounded-sm border bg-white p-1 text-slate-500 opacity-0 transition-opacity hover:bg-slate-100 focus:opacity-100 group-hover:opacity-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>

                {issue && (
                  <tr className={cn('cursor-pointer', zebra)} onClick={() => toggle(r.transactionId)}>
                    <td />
                    <td
                      colSpan={COLS - 1}
                      className={cn('px-3 pb-2.5',
                        r.state === 'overpaid' ? 'text-muted-foreground' : 'text-red-700')}
                    >
                      {issue}
                    </td>
                  </tr>
                )}

                {isOpen && (
                  <tr>
                    <td colSpan={COLS} className="border-l-4 border-slate-300 bg-slate-100/70 px-6 py-3">
                      <RoundDetail
                        row={r}
                        onAdd={() => setDraft({ mode: 'create', row: r })}
                        onEdit={(inst) => setDraft({ mode: 'edit', row: r, installment: inst })}
                        onDelete={remove}
                        busy={busy}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            )
          })}
        </table>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        차수 {rows.length}개를 최근 차수부터 보여줍니다 (맨 아래가 1차).
        괄호 친 청구금액은 아직 청구 전인 예상액입니다.
        1,000원 미만 차이는 절사로 보아 완납으로 봅니다.
      </p>

      {draft && (
        <PaymentDialog
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={() => { setDraft(null); router.refresh() }}
        />
      )}
    </>
  )
}

/**
 * 펼친 한 차수의 속.
 * 대표에게는 「나눠 낸 돈이 청구액과 맞는가」의 근거이고, 담당자에게는 입력·수정·삭제 자리다.
 */
function RoundDetail({
  row,
  onAdd,
  onEdit,
  onDelete,
  busy,
}: {
  row: PaymentRow
  onAdd: () => void
  onEdit: (inst: Installment) => void
  onDelete: (paymentId: string, label: string) => void
  busy: string | null
}) {
  const sum = row.installments.reduce((s, i) => s + i.amountKrw, 0)
  const matched = row.billedKrw != null && Math.abs(row.billedKrw - row.paidKrw) < PAID_TOLERANCE_KRW
  const ledgerMismatch = Math.abs(sum - row.paidKrw) >= 1
  const unconfirmed = row.installments.filter((i) => !i.confirmed).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{roundName(row)} 중간정산 지급 내역</span>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-1 hover:bg-slate-100"
        >
          <Plus className="h-3.5 w-3.5" /> 지급 입력
        </button>
      </div>

      {row.installments.length === 0 ? (
        <p className="text-muted-foreground">아직 지급 기록이 없습니다.</p>
      ) : (
        <table className="w-full max-w-2xl border-collapse">
          <tbody>
            {row.installments.map((inst, i) => {
              const gap = dayGap(row.dueDate, inst.paidAt)
              return (
                <tr key={inst.paymentId || i} className="border-b border-slate-200 last:border-0">
                  <td className="w-12 py-1.5 pr-3 text-muted-foreground">{i + 1}회</td>
                  <td className="w-28 py-1.5 pr-3 tabular-nums">{inst.paidAt}</td>
                  <td className="w-40 py-1.5 pr-3 text-right tabular-nums">
                    {inst.direction === 'in' && <span className="text-muted-foreground">환급 </span>}
                    {krw(Math.abs(inst.amountKrw))}
                  </td>
                  <td className="w-28 py-1.5 pr-3 text-muted-foreground">
                    {gap == null ? '' : gap === 0 ? '기일 당일' : gap > 0 ? `기일 +${gap}일` : `기일 ${gap}일`}
                  </td>
                  <td className="py-1.5 text-right">
                    {inst.paymentId && (
                      <span className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(inst)}
                          className="rounded-sm border bg-white p-1 text-slate-500 hover:bg-slate-100"
                          aria-label="수정"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busy === inst.paymentId}
                          onClick={() => onDelete(inst.paymentId, `${roundName(row)} ${i + 1}회`)}
                          className="rounded-sm border bg-white p-1 text-red-700 hover:bg-red-50 disabled:opacity-40"
                          aria-label="삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {unconfirmed > 0 && (
        <p className="text-muted-foreground">
          이 중 {unconfirmed}건은 여러 차수를 한 번에 묶어 낸 이체입니다. 차수별로 얼마씩인지{' '}
          <Link href="/payments/ledger" className="underline underline-offset-2">통장 원장</Link>에서
          확인해 주세요.
        </p>
      )}

      {row.billedKrw != null && row.installments.length > 0 && (
        <p className={matched ? 'text-slate-700' : 'text-red-700'}>
          {row.installments.length}회 합계 <b className="tabular-nums">{krw(row.paidKrw)}</b>원
          {' · 청구액 '}<b className="tabular-nums">{krw(row.billedKrw)}</b>원
          {matched
            ? (row.billedKrw === row.paidKrw
                ? ' — 일치합니다'
                : ` — 일치합니다 (절사 ${krw(Math.abs(row.billedKrw - row.paidKrw))}원)`)
            : (row.balanceKrw > 0
                ? ` — ${krw(row.balanceKrw)}원 모자랍니다`
                : ` — ${krw(-row.balanceKrw)}원 더 나갔습니다`)}
        </p>
      )}

      {ledgerMismatch && (
        <p className="text-red-700">
          회차를 더한 값({krw(sum)}원)이 집계와 어긋납니다 — 통장 원장을 확인하세요.
        </p>
      )}

      {row.closingBilledKrw != null && (
        <p className="text-slate-700">
          <span className="font-semibold">최종정산</span>
          {' · 청구 '}<b className="tabular-nums">{krw(Math.abs(row.closingBilledKrw))}</b>원
          {row.closingBilledKrw < 0 ? ' (에이원이 토에이에 돌려줄 몫)' : ''}
          {' · 지급 '}
          <b className="tabular-nums">
            {row.closingInstallments.length === 0 ? '없음' : `${krw(Math.abs(row.closingPaidKrw))}원`}
          </b>
          {' — '}
          {Math.abs(row.closingBalanceKrw) < PAID_TOLERANCE_KRW
            ? '정산이 끝났습니다'
            : `${krw(Math.abs(row.closingBalanceKrw))}원이 `
              + (row.closingBalanceKrw > 0 ? '아직 토에이에서 나가지 않았습니다' : '아직 에이원에서 돌아오지 않았습니다')}
        </p>
      )}

      {row.calcDiffKrw != null && Math.abs(row.calcDiffKrw) >= PAID_TOLERANCE_KRW && (
        <p className="text-muted-foreground">
          실제 청구액과 시스템 계산값({krw(row.confirmedKrw)}원)이 {krw(Math.abs(row.calcDiffKrw))}원 다릅니다.
          미지급이 아니라 계산 차이이며{' '}
          <Link href="/verification" className="underline underline-offset-2">검증 리포트</Link>에서 다룹니다.
        </p>
      )}

      <p>
        <Link href={`/transactions/${row.transactionId}`} className="underline underline-offset-2">
          {roundName(row)} 거래 상세 보기
        </Link>
      </p>
    </div>
  )
}
