'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Check, AlertTriangle } from 'lucide-react'
import { PaymentDialog, type PaymentDraft } from './PaymentDialog'
import { PAID_TOLERANCE_KRW, type PaymentRow, type PaymentState } from '@/lib/data/payments'

/**
 * 차수별 지급 대사표.
 *
 * 이 화면이 답하는 것은 하나다 — 「그 차수에 나간 돈을 다 합치면 청구액이 되는가」.
 * 그래서 지급 회차를 접지 않고 세로로 세운 뒤, 바로 밑에 합계와 청구액을 나란히
 * 놓고 차액을 적는다. 막대그래프는 축을 먼저 읽어야 해서 이 대사에는 느리다.
 *
 * 정렬은 차수 내림차순 하나뿐이다(43차 위, 1차 아래). 상태순으로 섞으면
 * 「43차 다음이 19차」가 되어 차수를 눈으로 좇을 수 없다 — 손댈 것은 필터가 잡는다.
 *
 * 글자는 크기 하나(text-sm)·서체 하나(본문 sans)로만 쓴다. 위계는 굵기와 색으로 낸다.
 * 크기·서체를 섞으면 표가 여러 벌처럼 보인다. 금액 자릿수는 등폭 서체(font-mono)가 아니라
 * `tabular-nums`(고정폭 숫자)로 맞춘다 — 서체를 갈지 않고도 세로줄이 선다.
 */

const TONE: Record<PaymentState, { bar: string; chip: string; label: string }> = {
  no_record: { bar: 'bg-red-500', chip: 'bg-red-100 text-red-800', label: '지급 기록 없음' },
  overdue: { bar: 'bg-red-500', chip: 'bg-red-100 text-red-800', label: '연체' },
  overpaid: { bar: 'bg-sky-500', chip: 'bg-sky-100 text-sky-800', label: '초과 지급' },
  due_soon: { bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800', label: '기일 임박' },
  upcoming: { bar: 'bg-slate-300', chip: 'bg-slate-100 text-slate-700', label: '예정' },
  paid: { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800', label: '완납' },
  unbilled: { bar: 'bg-slate-200', chip: 'bg-slate-100 text-slate-500', label: '청구 전' },
}

type FilterKey = 'all' | 'attention' | 'open' | 'paid' | 'unbilled'

const FILTERS: { key: FilterKey; label: string; test: (r: PaymentRow) => boolean }[] = [
  { key: 'all', label: '전체', test: () => true },
  {
    key: 'attention',
    label: '확인 필요',
    test: (r) =>
      r.state === 'no_record' || r.state === 'overdue' || r.state === 'overpaid' ||
      r.needsConfirm || (r.billedKrw == null && r.paidKrw !== 0),
  },
  { key: 'open', label: '미완납', test: (r) => r.billedKrw != null && r.state !== 'paid' },
  { key: 'paid', label: '완납', test: (r) => r.state === 'paid' },
  { key: 'unbilled', label: '청구 전', test: (r) => r.billedKrw == null },
]

function krw(n: number | null | undefined): string {
  return n == null ? '—' : Math.round(n).toLocaleString('ko-KR')
}

function dayGap(from: string | null, to: string): number | null {
  if (!from) return null
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}

/** 기일 대비 며칠인지. 완납이면 마지막 지급 기준, 미납이면 오늘 기준. */
function delayText(row: PaymentRow): string {
  if (row.state === 'paid' || row.state === 'overpaid') {
    const last = row.installments.at(-1)
    const gap = last ? dayGap(row.dueDate, last.paidAt) : null
    if (gap == null) return ''
    return gap === 0 ? '기일 당일' : gap > 0 ? `${gap.toLocaleString('ko-KR')}일 늦게` : `${-gap}일 먼저`
  }
  if (row.delayDays == null) return ''
  return row.delayDays > 0
    ? `${row.delayDays.toLocaleString('ko-KR')}일 경과`
    : `D${row.delayDays}`
}

/**
 * 나간 돈의 합이 청구액과 맞는가 — 이 화면의 결론.
 *
 * 기일 전 차수의 미지급을 「부족」이라 빨갛게 쓰지 않는다. 아직 낼 때가 아닌 것을
 * 연체와 같은 색으로 칠하면 정작 진짜 연체가 묻힌다.
 */
function reconcile(row: PaymentRow) {
  const { billedKrw: billed, paidKrw: paid, state } = row
  if (billed == null) {
    return paid === 0
      ? null
      : { kind: 'nobase' as const, diff: 0, text: '청구액이 등재되지 않아 대사할 기준이 없습니다' }
  }
  const diff = billed - paid
  if (Math.abs(diff) < PAID_TOLERANCE_KRW) {
    return { kind: 'match' as const, diff, text: diff === 0 ? '청구액과 일치' : `청구액과 일치 (절사 ${krw(Math.abs(diff))}원)` }
  }
  if (diff < 0) return { kind: 'over' as const, diff, text: `${krw(-diff)}원 초과` }
  const pending = state === 'upcoming' || state === 'due_soon'
  return pending
    ? { kind: 'pending' as const, diff, text: `${krw(diff)}원 미지급 — 기일 전` }
    : { kind: 'short' as const, diff, text: `${krw(diff)}원 부족` }
}

const RECON_STYLE = {
  match: 'text-emerald-700',
  short: 'text-red-700',
  over: 'text-sky-800',
  nobase: 'text-amber-700',
  pending: 'text-muted-foreground',
} as const

const TH = 'px-3 py-2 font-semibold whitespace-nowrap'
const TD = 'px-3 py-1.5 whitespace-nowrap'

export function PaymentTable({ rows, editable }: { rows: PaymentRow[]; editable: boolean }) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState<PaymentDraft | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, rows.filter(f.test).length])) as Record<FilterKey, number>,
    [rows],
  )
  const visible = useMemo(
    () => rows.filter(FILTERS.find((f) => f.key === filter)!.test),
    [rows, filter],
  )

  const cols = editable ? 9 : 8

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

  const allCollapsed = visible.every((r) => collapsed.has(r.transactionId))

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
                filter === f.key ? 'bg-emerald-700 font-semibold text-white' : 'hover:bg-muted',
              )}
            >
              {f.label}
              <span className={cn('ml-1.5 tabular-nums', filter === f.key ? 'text-emerald-100' : 'text-muted-foreground')}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setCollapsed(allCollapsed ? new Set() : new Set(visible.map((r) => r.transactionId)))
          }
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          {allCollapsed ? '지급 내역 모두 펼치기' : '지급 내역 모두 접기'}
        </button>
      </div>

      {/* 헤더 고정(sticky)은 걸지 않는다 — 레이아웃의 main 이 overflow 컨테이너라
          뷰포트에 붙지 않는다. 대신 차수를 왼쪽 색막대와 큰 글씨로 세워 두었다. */}
      <div className="mt-2 overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100 text-slate-600">
              <th className={cn(TH, 'text-left w-20')}>차수</th>
              <th className={cn(TH, 'text-left w-24')}>구분</th>
              <th className={cn(TH, 'text-left w-32')}>지급일</th>
              <th className={cn(TH, 'text-right w-40')}>청구금액</th>
              <th className={cn(TH, 'text-right w-40')}>지급액</th>
              <th className={cn(TH, 'text-right w-36')}>잔액</th>
              <th className={cn(TH, 'text-left w-28')}>기일</th>
              <th className={cn(TH, 'text-left w-full')}>상태</th>
              {editable && <th className={cn(TH, 'text-right w-24')} />}
            </tr>
          </thead>

          {visible.map((r, gi) => {
            const tone = TONE[r.state]
            const split = r.installments.length > 1
            const isOpen = split && !collapsed.has(r.transactionId)
            const instSum = r.installments.reduce((s, i) => s + i.amountKrw, 0)
            const recon = reconcile(r)
            // 원장 합계와 뷰의 지급 합계가 어긋나면 대사 자체를 믿을 수 없다.
            const ledgerMismatch = Math.abs(instSum - r.paidKrw) >= 1
            const zebra = gi % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
            // 돈은 나갔는데 청구액이 없는 차수 — 「청구 전」으로 보이면 안 된다
            const noBase = recon?.kind === 'nobase'

            return (
              <tbody key={r.transactionId} className="border-t-[3px] border-slate-300">
                {/* ── 차수 머리줄 ── */}
                <tr className={cn(zebra, 'align-middle')}>
                  <td className={cn(TD, 'relative py-2.5 pl-4')}>
                    <span className={cn('absolute inset-y-0 left-0 w-1.5', tone.bar)} />
                    <Link
                      href={`/transactions/${r.transactionId}`}
                      className="font-bold tabular-nums hover:underline"
                    >
                      {r.roundNo != null ? `${r.roundNo}차` : r.roundLabel}
                    </Link>
                  </td>
                  <td className={cn(TD, 'text-muted-foreground')}>중간정산</td>
                  <td className={TD}>
                    {r.installments.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : split ? (
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsed((prev) => {
                            const next = new Set(prev)
                            if (next.has(r.transactionId)) next.delete(r.transactionId)
                            else next.add(r.transactionId)
                            return next
                          })
                        }
                        className="inline-flex items-center gap-0.5 hover:underline"
                      >
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        {r.installments.length}회 분할
                      </button>
                    ) : (
                      r.installments[0].paidAt
                    )}
                  </td>
                  <td className={cn(TD, 'text-right tabular-nums')}>
                    {r.billedKrw != null ? (
                      krw(r.billedKrw)
                    ) : (
                      <span
                        className="text-muted-foreground"
                        title={r.plannedKrw == null
                          ? '중간정산이 아직 계산되지 않았습니다'
                          : '아직 청구 전 — 시스템 확정값(예상)입니다'}
                      >
                        {r.plannedKrw == null ? '미산출' : `(${krw(r.plannedKrw)})`}
                      </span>
                    )}
                    {r.calcDiffKrw != null && Math.abs(r.calcDiffKrw) >= PAID_TOLERANCE_KRW && (
                      <span
                        className="ml-1 cursor-help text-amber-700"
                        title={`시스템 확정값 ${krw(r.confirmedKrw)}원과 ${krw(Math.abs(r.calcDiffKrw))}원 차이 — 미지급이 아니라 검산 차이입니다`}
                      >
                        검산차
                      </span>
                    )}
                  </td>
                  <td className={cn(TD, 'text-right font-semibold tabular-nums')}>
                    {r.installments.length === 0 ? <span className="text-muted-foreground">—</span> : krw(r.paidKrw)}
                  </td>
                  <td
                    className={cn(
                      TD, 'text-right font-semibold tabular-nums',
                      recon?.kind === 'short' && 'text-red-700',
                      recon?.kind === 'over' && 'text-sky-800',
                      (recon?.kind === 'match' || recon?.kind === 'pending') && 'text-muted-foreground',
                    )}
                  >
                    {r.billedKrw == null ? <span className="text-muted-foreground">—</span>
                      : recon?.kind === 'over' ? `+${krw(-recon.diff)}`
                      : recon?.kind === 'match' ? '0'
                      : krw(r.balanceKrw)}
                  </td>
                  <td className={TD}>
                    {r.dueDate ?? '미정'}
                    {!r.dueIsExplicit && r.dueDate && (
                      <span className="text-muted-foreground" title="LC 개설일 + 165일 계산값"> *</span>
                    )}
                  </td>
                  <td className={TD}>
                    <span
                      className={cn('rounded-sm px-1.5 py-0.5 font-semibold',
                        noBase ? 'bg-amber-100 text-amber-800' : tone.chip)}
                    >
                      {noBase ? '청구액 없음' : tone.label}
                    </span>
                    {delayText(r) && <span className="ml-2 text-muted-foreground">{delayText(r)}</span>}
                    {r.needsConfirm && (
                      <span className="ml-2 rounded-sm bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
                        배분 확인 대기
                      </span>
                    )}
                    {r.stalled && (
                      <span className="ml-2 rounded-sm bg-red-100 px-1.5 py-0.5 font-semibold text-red-800">
                        30일 이상 정체
                      </span>
                    )}
                  </td>
                  {editable && (
                    <td className={cn(TD, 'text-right')}>
                      <button
                        type="button"
                        onClick={() => setDraft({ mode: 'create', row: r })}
                        className="inline-flex items-center gap-1 rounded-sm border bg-white px-2 py-0.5 hover:bg-muted"
                      >
                        <Plus className="h-3 w-3" /> 지급
                      </button>
                    </td>
                  )}
                </tr>

                {/* ── 분할 지급 회차 ── */}
                {isOpen && r.installments.map((inst, i) => {
                  const gap = dayGap(r.dueDate, inst.paidAt)
                  return (
                    <tr key={inst.paymentId || `${r.transactionId}-${i}`} className={zebra}>
                      <td className={cn(TD, 'relative pl-4')}>
                        <span className={cn('absolute inset-y-0 left-0 w-1.5', tone.bar)} />
                      </td>
                      <td className={cn(TD, 'pl-6 text-muted-foreground')}>{i + 1}회</td>
                      <td className={cn(TD, 'text-muted-foreground')}>{inst.paidAt}</td>
                      <td className={TD} />
                      <td className={cn(TD, 'text-right tabular-nums')}>
                        {inst.direction === 'in' && <span className="text-emerald-700">환급 </span>}
                        {krw(Math.abs(inst.amountKrw))}
                      </td>
                      <td className={TD} />
                      <td className={cn(TD, 'text-muted-foreground')}>
                        {gap == null ? '' : gap === 0 ? '당일' : gap > 0 ? `+${gap}일` : `${gap}일`}
                      </td>
                      <td className={TD}>
                        {!inst.confirmed && (
                          <span className="rounded-sm bg-amber-100 px-1 font-semibold text-amber-800">
                            배분 확인 대기
                          </span>
                        )}
                      </td>
                      {editable && (
                        <td className={cn(TD, 'text-right')}>
                          {inst.paymentId && (
                            <span className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => setDraft({ mode: 'edit', row: r, installment: inst })}
                                className="rounded-sm border bg-white px-1.5 py-0.5 hover:bg-muted"
                                aria-label="수정"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={busy === inst.paymentId}
                                onClick={() => remove(inst.paymentId, `${r.roundNo}차 ${i + 1}회`)}
                                className="rounded-sm border bg-white px-1.5 py-0.5 text-red-700 hover:bg-red-50 disabled:opacity-40"
                                aria-label="삭제"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}

                {/* ── 대사: 나간 돈의 합 = 청구액인가 ── */}
                {recon && (
                  <tr className={zebra}>
                    <td className={cn(TD, 'relative pl-4')}>
                      <span className={cn('absolute inset-y-0 left-0 w-1.5', tone.bar)} />
                    </td>
                    <td colSpan={cols - 1} className="px-3 pb-2.5">
                      <span className={cn('inline-flex items-center gap-1.5 font-medium', RECON_STYLE[recon.kind])}>
                        {recon.kind === 'match' ? <Check className="h-3.5 w-3.5" />
                          : recon.kind === 'pending' ? <span className="w-3.5" />
                          : <AlertTriangle className="h-3.5 w-3.5" />}
                        {r.installments.length > 0 && (
                          <span className="tabular-nums">
                            {r.installments.length}회 합계 {krw(r.paidKrw)}원
                          </span>
                        )}
                        {r.installments.length === 0 && <span>지급 기록 없음</span>}
                        {r.billedKrw != null && (
                          <span className="text-muted-foreground">
                            / 청구 <span className="tabular-nums">{krw(r.billedKrw)}</span>원
                          </span>
                        )}
                        <span>· {recon.text}</span>
                      </span>
                      {ledgerMismatch && (
                        <span className="ml-2 text-red-700">
                          회차 합계({krw(instSum)})가 집계값과 어긋납니다 — 원장을 확인하세요
                        </span>
                      )}
                    </td>
                  </tr>
                )}

                {/* ── 최종정산은 별개의 청구·지급이다 ── */}
                {r.closingBilledKrw != null && (
                  <tr className={zebra}>
                    <td className={cn(TD, 'relative pl-4')}>
                      <span className={cn('absolute inset-y-0 left-0 w-1.5', tone.bar)} />
                    </td>
                    <td className={cn(TD, 'text-muted-foreground')}>최종정산</td>
                    <td className={cn(TD, 'text-muted-foreground')}>
                      {r.closingInstallments.at(-1)?.paidAt ?? '—'}
                    </td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{krw(r.closingBilledKrw)}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>
                      {r.closingInstallments.length === 0 ? '—' : krw(r.closingPaidKrw)}
                    </td>
                    <td
                      className={cn(TD, 'text-right tabular-nums',
                        Math.abs(r.closingBalanceKrw) >= PAID_TOLERANCE_KRW
                          ? 'font-semibold text-amber-700'
                          : 'text-muted-foreground')}
                    >
                      {Math.abs(r.closingBalanceKrw) < PAID_TOLERANCE_KRW ? '0' : krw(r.closingBalanceKrw)}
                    </td>
                    <td colSpan={cols - 6} className={cn(TD, 'text-muted-foreground')}>
                      {Math.abs(r.closingBalanceKrw) < PAID_TOLERANCE_KRW
                        ? '정산 완료'
                        : r.closingInstallments.length === 0
                          ? '지급 기록 없음'
                          : `${r.closingInstallments.length}회 지급`}
                      {r.closingBilledKrw < 0 && ' · 에이원 환급분'}
                    </td>
                  </tr>
                )}
              </tbody>
            )
          })}
        </table>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        차수 {rows.length}개 전부를 최근 차수부터 보여줍니다 (맨 아래가 1차).
        기일 옆 <span className="font-semibold">*</span> 는 LC 개설일 + 165일 계산값입니다 (원본 「입금일」이 없는 차수).
        {PAID_TOLERANCE_KRW.toLocaleString('ko-KR')}원 미만 차이는 절사로 보아 일치로 판정합니다.
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
