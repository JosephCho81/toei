'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react'
import { PaymentDialog, type PaymentDraft } from './PaymentDialog'
import { MemoField } from '@/components/ui/MemoField'
import { TABLE, TABLE_WRAP, TH, TD, THEAD_ROW, CENTER, NUM } from '@/components/ui/table-style'
import { createClient } from '@/lib/supabase/client'
import {
  DUE_GRACE_DAYS, PAID_TOLERANCE_KRW, roundName,
  type Installment, type PaymentRow,
} from '@/lib/data/payments'

/**
 * 차수별 지급 현황.
 *
 * **돈의 방향은 한국에이원 → 토에이산교다.** 청구액이 양수면 에이원이 토에이에 낼 돈이고,
 * 음수(환급)일 때만 토에이가 에이원에 돌려준다. 화면은 **에이원 기준**으로 고정한다 —
 * 시점 토글은 없앴다(담당자 2026-09-05). 관점을 둘로 두면 같은 금액에 이름이 둘 붙어
 * 대화가 어긋난다.
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
 *
 * **비고는 표에 펼쳐 둔다** (담당자 2026-09-07: 「지급 현황 페이지에 메모 입력하는 게 안 보인다」).
 * 아이콘만 두면 메모가 있는 줄인지도 모르고 지나간다 — 첫 줄을 그대로 띄우고,
 * 빈 줄에는 「+ 메모」를 남겨 어디를 눌러야 적을 수 있는지 보이게 한다.
 * 적는 곳은 정산 비교 화면과 같은 자리(interim_settlements.notes)다 —
 * 두 화면이 다른 곳에 적으면 한 차수에 사유가 둘 생긴다.
 */

/** 표의 열 수 — 펼친 상세가 가로로 다 차지하려면 이 값을 쓴다. */
const COLS = 9

type FilterKey = 'all' | 'attention' | 'open' | 'paid' | 'unbilled' | 'closing'

const FILTERS: { key: FilterKey; label: string; test: (r: PaymentRow) => boolean }[] = [
  { key: 'all', label: '전체', test: () => true },
  {
    key: 'attention',
    label: '확인 필요',
    test: (r) =>
      needsAttention(r) || r.state === 'overpaid' || (r.basisKrw == null && r.paidKrw !== 0),
  },
  { key: 'open', label: '미납', test: (r) => r.basisKrw != null && r.state !== 'paid' },
  { key: 'paid', label: '완납', test: (r) => r.state === 'paid' },
  { key: 'unbilled', label: '청구금액 미입력', test: (r) => r.billedKrw == null },
  { key: 'closing', label: '최종정산 미결', test: (r) => hasOpenClosing(r) },
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
  if (r.state === 'paid') return '완납'
  if (r.state === 'overpaid') return '초과 지급'
  if (r.state === 'unbilled') return r.paidKrw !== 0 ? '청구금액 미등록' : '청구금액 미입력'
  // 같은 「기일 경과」라도 뜻이 셋으로 갈린다 (담당자 2026-09-10).
  if (r.bucket === 'settled_gap') return '지급금 차이'
  if (r.bucket === 'overdue') return d != null ? `연체 ${d.toLocaleString('ko-KR')}일` : '연체'
  if (r.bucket === 'in_progress') {
    return d != null && d >= DUE_GRACE_DAYS ? `기일 ${d}일 경과` : '당월 지급 진행'
  }
  return d != null ? `기일 ${-d}일 전` : '기일 미정'
}

/**
 * 손대야 할 줄에만 붙는 한 문장. 붙지 않았으면 문제가 없다는 뜻이다.
 * 화면에서 빨강은 이 문장과 그 줄의 잔액, 두 곳뿐이다.
 *
 * 돈은 에이원에서 토에이로 나간다 — 에이원 기준이라 「나갔다」로 적는다.
 */
/**
 * 지금 손대야 하는 줄인가.
 *
 * 담당자 2026-09-10 로 좁아졌다 — 35차까지의 남은 금액은 「지급금 차이」라 빨강이 아니고,
 * 이번 달 기일 건도 유예 7일 안에서는 지급이 도는 중이라 빨강이 아니다.
 */
function needsAttention(r: PaymentRow): boolean {
  if (r.bucket === 'overdue') return true
  return r.bucket === 'in_progress' && (r.delayDays ?? 0) >= DUE_GRACE_DAYS
}

function issueText(r: PaymentRow): string | null {
  if (r.basisKrw == null) {
    return r.paidKrw !== 0
      ? `지급액 ${krw(r.paidKrw)}원 — 청구금액 및 계산값 미등록으로 대사 불가`
      : null
  }
  if (r.bucket === 'settled_gap') {
    return `잔액 ${krw(r.balanceKrw)}원 — 정산 완료 구간의 지급금 차이`
  }
  if (needsAttention(r)) {
    const last = r.installments.at(-1)
    return `미지급 ${krw(r.balanceKrw)}원`
      + (last ? ` (최근 지급일 ${last.paidAt})` : ' (지급 내역 없음)')
  }
  if (r.state === 'overpaid') {
    return `청구금액 대비 ${krw(-r.balanceKrw)}원 초과 지급 — 차기 차수 상계 여부 확인 필요`
  }
  return null
}


export function PaymentTable({ rows }: { rows: PaymentRow[] }) {
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

  const balanceLabel = '미지급금'
  const paidLabel = '지급액'

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /**
   * 메모는 중간정산 행에 적는다 — 정산 비교 화면과 같은 칸이라 어느 화면에서 적어도 같이 보인다.
   * 정산이 아직 없는 차수에는 적을 곳이 없어 상세에서 그 사실을 말해 준다.
   */
  async function saveNote(row: PaymentRow, note: string | null) {
    if (!row.interimSettlementId) throw new Error('중간정산 미등록 차수로 비고를 저장할 수 없습니다')
    const supabase = createClient()
    const { error } = await supabase
      .from('interim_settlements')
      .update({ notes: note })
      .eq('id', row.interimSettlementId)
    if (error) throw new Error(error.message)
    router.refresh()
  }

  async function remove(paymentId: string, label: string) {
    if (!confirm(`${label} 지급 기록을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.`)) return
    setBusy(paymentId)
    const res = await fetch(`/api/payments/${paymentId}`, { method: 'DELETE' })
    setBusy(null)
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: '삭제에 실패했습니다' }))
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
          중간정산 기준 · 단위: 원 (부가세 포함)
        </p>
      </div>

      <div className={`mt-2 ${TABLE_WRAP}`}>
        <table className={`table-fixed ${TABLE}`}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={cn(TH, CENTER, 'w-[7%]')}>차수</th>
              <th className={cn(TH, NUM, 'w-[11%]')}>수입금액 (USD)</th>
              <th className={cn(TH, NUM, 'w-[14%]')}>청구금액</th>
              <th className={cn(TH, NUM, 'w-[14%]')}>{paidLabel}</th>
              <th className={cn(TH, NUM, 'w-[12%]')}>{balanceLabel}</th>
              <th className={cn(TH, CENTER, 'w-[10%]')}>기일</th>
              <th className={cn(TH, CENTER, 'w-[14%]')}>상태</th>
              <th className={cn(TH, 'w-[14%]')}>비고 (금액 차이 사유)</th>
              <th className={cn(TH, 'w-[4%]')} />
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
                  <td className={cn(TD, CENTER, 'font-semibold')}>
                    <span className="inline-flex items-center gap-1">
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-slate-400" />
                        : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      {roundName(r)}
                    </span>
                  </td>
                  <td className={cn(TD, NUM, 'tabular-nums text-slate-600')}>{usd(r.importAmountUsd)}</td>
                  <td className={cn(TD, NUM, 'tabular-nums')}>
                    {r.billedKrw != null ? krw(r.billedKrw) : (
                      <span className="text-muted-foreground">
                        {r.plannedKrw == null ? '—' : `예상 ${krw(r.plannedKrw)}`}
                      </span>
                    )}
                  </td>
                  <td className={cn(TD, NUM, 'tabular-nums')}>
                    {r.installments.length === 0
                      ? <span className="text-muted-foreground">—</span>
                      : krw(r.paidKrw)}
                  </td>
                  <td className={cn(TD, NUM, 'font-semibold tabular-nums',
                    // 빨강은 「덜 나간 돈」에만. 초과 지급은 확인 대상이지 연체가 아니고,
                    // 35차까지의 지급금 차이와 유예 안의 이번 달 건도 회색이다.
                    needsAttention(r) ? 'text-red-700' : 'text-slate-600')}>
                    {r.basisKrw == null ? '—'
                      : Math.abs(r.balanceKrw) < PAID_TOLERANCE_KRW ? '0'
                      : r.balanceKrw < 0 ? `+${krw(-r.balanceKrw)}`
                      : krw(r.balanceKrw)}
                  </td>
                  <td className={cn(TD, CENTER, 'tabular-nums text-slate-600')}>{r.dueDate ?? '미정'}</td>
                  <td className={cn(TD, CENTER)}>
                    {statusText(r)}
                    {r.installments.length > 1 && (
                      <span className="text-muted-foreground"> · {r.installments.length}회 분할</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <NoteCell note={r.note} />
                  </td>
                  <td className={cn(TD, CENTER, 'px-1')}>
                    <button
                      type="button"
                      aria-label={`${roundName(r)} ${paidLabel.slice(0, 2)} 입력`}
                      title={`${paidLabel.slice(0, 2)} 입력`}
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
                        onSaveNote={saveNote}
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

      <div className="mt-2 text-sm text-muted-foreground">
        <p>총 {rows.length}개 차수 · 최근 차수 순으로 표시합니다.</p>
        <p>차수를 선택하면 지급 내역을 조회하고 입력·수정할 수 있습니다.</p>
        <p>「예상」 금액은 청구금액 입력 전 시스템 산출액입니다.</p>
        <p>200원 미만의 차액은 절사로 간주하여 완납 처리합니다.</p>
      </div>

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
  onSaveNote,
  onAdd,
  onEdit,
  onDelete,
  busy,
}: {
  row: PaymentRow
  onSaveNote: (row: PaymentRow, note: string | null) => Promise<void>
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
        <span className="font-semibold">
          {roundName(row)} 중간정산 지급 내역
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-1 hover:bg-slate-100"
        >
          <Plus className="h-3.5 w-3.5" /> 지급 입력
        </button>
      </div>

      {row.installments.length === 0 ? (
        <p className="text-muted-foreground">지급 내역 없음</p>
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
          이 중 {unconfirmed}건은 복수 차수 일괄 이체 건입니다. 차수별 금액은{' '}
          <Link href="/payments/ledger" className="underline underline-offset-2">통장 원장</Link>에서
          확인하시기 바랍니다.
        </p>
      )}

      {row.billedKrw != null && row.installments.length > 0 && (
        <div className={matched ? 'text-slate-700' : 'text-red-700'}>
          <p>지급 합계 ({row.installments.length}회) <b className="tabular-nums">{krw(row.paidKrw)}</b>원</p>
          <p>청구금액 <b className="tabular-nums">{krw(row.billedKrw)}</b>원</p>
          <p>
            {matched
              ? (row.billedKrw === row.paidKrw
                  ? '대사 결과: 일치'
                  : `대사 결과: 일치 (절사 ${krw(Math.abs(row.billedKrw - row.paidKrw))}원)`)
              : (row.balanceKrw > 0
                  ? `대사 결과: ${krw(row.balanceKrw)}원 미지급`
                  : `대사 결과: ${krw(-row.balanceKrw)}원 초과 지급`)}
          </p>
        </div>
      )}

      {ledgerMismatch && (
        <p className="text-red-700">
          회차별 지급 합계({krw(sum)}원)가 집계 금액과 일치하지 않습니다. 통장 원장을 확인하시기 바랍니다.
        </p>
      )}

      {/* 청구액 양수 = 에이원이 토에이에 낼 돈, 음수 = 토에이가 에이원에 돌려줄 환급이다. */}
      {row.closingBilledKrw != null && (
        <div className="text-slate-700">
          <p className="font-semibold">최종정산</p>
          <p>
            청구금액 <b className="tabular-nums">{krw(Math.abs(row.closingBilledKrw))}</b>원
            {row.closingBilledKrw < 0 ? ' (토에이산교 → 한국에이원 환급)' : ''}
          </p>
          <p>
            지급액{' '}
            <b className="tabular-nums">
              {row.closingInstallments.length === 0 ? '없음' : `${krw(Math.abs(row.closingPaidKrw))}원`}
            </b>
          </p>
          <p>
            {Math.abs(row.closingBalanceKrw) < PAID_TOLERANCE_KRW
              ? '정산 결과: 정산 완료'
              : row.closingBalanceKrw > 0
                ? `정산 결과: ${krw(row.closingBalanceKrw)}원 미지급`
                : `정산 결과: 환급 ${krw(-row.closingBalanceKrw)}원 미수령`}
          </p>
        </div>
      )}

      {row.calcDiffKrw != null && Math.abs(row.calcDiffKrw) >= PAID_TOLERANCE_KRW && (
        <p className="text-muted-foreground">
          청구금액과 시스템 계산값({krw(row.confirmedKrw)}원) 간 {krw(Math.abs(row.calcDiffKrw))}원의 차이가 있습니다.
          미지급이 아닌 산출 차이로,{' '}
          <Link href="/verification" className="underline underline-offset-2">검증 리포트</Link>에서 관리합니다.
        </p>
      )}

      {/* 금액 차이의 원인은 사람만 안다 — 최차장님께 설명할 문장을 여기 적어 둔다.
          정산 비교 화면의 비고와 같은 칸이라 어느 쪽에서 적어도 둘 다에 뜬다. */}
      <div className="max-w-2xl rounded-md border bg-white px-3 py-2">
        <p className="mb-1 font-semibold">비고 (금액 차이 사유)</p>
        {row.interimSettlementId ? (
          <MemoField notes={row.note} onSave={(next) => onSaveNote(row, next)} />
        ) : (
          <p className="text-muted-foreground">
            중간정산 미등록 차수로 비고를 입력할 수 없습니다.
          </p>
        )}
      </div>

      <p>
        <Link href={`/transactions/${row.transactionId}`} className="underline underline-offset-2">
          {roundName(row)} 거래 상세 보기
        </Link>
      </p>
    </div>
  )
}

/**
 * 표에 보이는 비고 한 칸.
 * 메모는 여러 줄이지만 표에는 첫 줄만 세우고 나머지는 개수로 말한다 —
 * 줄 높이를 메모가 정하게 두면 44줄짜리 표가 들쭉날쭉해진다.
 * 빈 칸에 「+ 메모」를 남겨 두는 이유는, 아이콘만 있으면 적을 수 있는 줄인 줄도 모르기 때문이다.
 */
function NoteCell({ note }: { note: string | null }) {
  const lines = note ? note.split('\n').filter((l) => l.trim() !== '') : []
  if (lines.length === 0) {
    return <span className="text-muted-foreground">+ 비고</span>
  }
  return (
    <span className="block truncate text-slate-700" title={lines.join('\n')}>
      {lines[0]}
      {lines.length > 1 && (
        <span className="text-muted-foreground"> 외 {lines.length - 1}건</span>
      )}
    </span>
  )
}
