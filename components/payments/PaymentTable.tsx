'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react'
import { PaymentDialog, type PaymentDraft } from './PaymentDialog'
import type { PaymentRow, PaymentState } from '@/lib/data/payments'

/**
 * 차수 한 줄 아래에 회차별 날짜·금액을 그대로 펼친다.
 *
 * 그래프를 쓰지 않는 이유: 막대나 추이선은 축이 무엇인지 먼저 알아야 읽힌다.
 * 「6차를 10/05 에 24,441,593원, 10/14 에 100,000,000원 냈다」는 글자로 쓰는 편이
 * 정확하고 빠르다. 지급액을 같은 열에 세로로 세워 합계가 눈에 들어오게 한다.
 */

/** 회차가 이보다 많으면 접어 두고 「나머지 n회 보기」로 편다. */
const COLLAPSE_AFTER = 3

const TONE: Record<PaymentState, { row: string; label: string; text: string }> = {
  no_record: { row: 'bg-red-50', label: '지급 기록 없음', text: 'text-red-700' },
  overdue: { row: 'bg-red-50', label: '연체', text: 'text-red-700' },
  overpaid: { row: 'bg-sky-50', label: '초과 지급', text: 'text-sky-800' },
  due_soon: { row: 'bg-amber-50', label: '기일 임박', text: 'text-amber-700' },
  upcoming: { row: '', label: '예정', text: 'text-muted-foreground' },
  paid: { row: '', label: '완납', text: 'text-emerald-700' },
  unbilled: { row: '', label: '청구 전', text: 'text-muted-foreground' },
}

function krw(n: number | null): string {
  return n == null ? '—' : Math.round(n).toLocaleString('ko-KR')
}

/** 기일 대비 며칠인지. 미지급이면 D-n, 지난 건 +n일. */
function delayText(row: PaymentRow): string {
  if (row.delayDays == null) return '-'
  const d = row.delayDays
  if (row.state === 'paid' || row.state === 'overpaid') {
    const last = row.installments.at(-1)
    if (!last || !row.dueDate) return '-'
    const gap = Math.round((Date.parse(last.paidAt) - Date.parse(row.dueDate)) / 86_400_000)
    if (gap === 0) return '당일'
    return gap > 0 ? `${gap}일 늦게` : `${-gap}일 먼저`
  }
  if (d > 0) return `${d.toLocaleString('ko-KR')}일 경과`
  return `D${d}`
}

const TH = 'px-3 py-2 text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2 whitespace-nowrap'

export function PaymentTable({
  rows,
  editable,
}: {
  rows: PaymentRow[]
  editable: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState<Set<string>>(new Set())
  const [showPaid, setShowPaid] = useState(false)
  const [draft, setDraft] = useState<PaymentDraft | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  function toggle(set: Set<string>, key: string, fn: (s: Set<string>) => void) {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    fn(next)
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

  // 손대야 할 차수를 위에, 끝난 차수는 접어서 아래에. loadPaymentsData 가 이미 정렬해 둔다.
  const openRows = rows.filter((r) => r.state !== 'paid' && r.state !== 'unbilled')
  const doneRows = rows.filter((r) => r.state === 'paid')
  const unbilled = rows.filter((r) => r.state === 'unbilled')
  const donePaid = doneRows.reduce((s, r) => s + r.paidKrw, 0)
  const visible = showPaid ? [...openRows, ...doneRows] : openRows

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 text-muted-foreground">
              <th className={cn(TH, 'text-left w-28')}>차수</th>
              <th className={cn(TH, 'text-left w-28')}>지급일</th>
              <th className={cn(TH, 'text-right')}>청구금액</th>
              <th className={cn(TH, 'text-right')}>지급액</th>
              <th className={cn(TH, 'text-right')}>잔액</th>
              <th className={cn(TH, 'text-left w-28')}>기일</th>
              <th className={cn(TH, 'text-left w-32')}>상태</th>
              {editable && <th className={cn(TH, 'text-right w-32')} />}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const tone = TONE[r.state]
              const isOpen = open.has(r.transactionId)
              const all = showAll.has(r.transactionId)
              const shown = all ? r.installments : r.installments.slice(0, COLLAPSE_AFTER)
              const hidden = r.installments.length - shown.length
              // 처리 대상은 펼쳐서 보여준다. 완납분만 눌러서 편다.
              const expanded = r.state === 'paid' ? isOpen : true

              return (
                <Fragment key={r.transactionId}>
                  <tr className={cn('border-t', tone.row)}>
                    <td className={cn(TD, 'font-semibold')}>
                      <button
                        type="button"
                        onClick={() => toggle(open, r.transactionId, setOpen)}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        {r.installments.length > 0 && r.state === 'paid'
                          ? (isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)
                          : <span className="w-3.5" />}
                        <Link href={`/transactions/${r.transactionId}`} className="hover:underline">
                          {r.roundLabel}
                        </Link>
                      </button>
                    </td>
                    <td className={TD} />
                    <td className={cn(TD, 'text-right font-mono')}>
                      {r.billedKrw != null ? krw(r.billedKrw) : (
                        <span className="text-muted-foreground">
                          ({krw(r.plannedKrw)})
                        </span>
                      )}
                      {r.calcDiffKrw != null && Math.abs(r.calcDiffKrw) >= 1000 && (
                        <span
                          className="ml-1 cursor-help text-[10px] font-sans text-amber-700"
                          title={`시스템 확정값 ${krw(r.confirmedKrw)}원과 ${krw(Math.abs(r.calcDiffKrw))}원 차이 — 미지급이 아니라 검산 차이입니다`}
                        >
                          검산차
                        </span>
                      )}
                    </td>
                    <td className={cn(TD, 'text-right font-mono')}>
                      {r.installments.length === 0 ? '—' : krw(r.paidKrw)}
                    </td>
                    <td className={cn(TD, 'text-right font-mono',
                      r.state === 'no_record' || r.state === 'overdue' ? 'font-semibold text-red-700' : '',
                      r.state === 'overpaid' ? 'font-semibold text-sky-800' : '')}>
                      {r.state === 'overpaid'
                        ? `+${krw(-r.balanceKrw)}`
                        : krw(r.balanceKrw)}
                    </td>
                    <td className={cn(TD, 'font-mono text-xs')}>
                      {r.dueDate ?? '미정'}
                      {!r.dueIsExplicit && r.dueDate && <span className="text-muted-foreground"> *</span>}
                    </td>
                    <td className={cn(TD, 'text-xs')}>
                      <span className={cn('font-medium', tone.text)}>{tone.label}</span>
                      <span className="text-muted-foreground"> · {delayText(r)}</span>
                      {r.installments.length > 1 && (
                        <span className="text-muted-foreground"> · {r.installments.length}회</span>
                      )}
                      {r.needsConfirm && (
                        <span className="ml-1 rounded-sm bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">
                          확인 대기
                        </span>
                      )}
                    </td>
                    {editable && (
                      <td className={cn(TD, 'text-right')}>
                        <button
                          type="button"
                          onClick={() => setDraft({ mode: 'create', row: r })}
                          className="inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs hover:bg-muted"
                        >
                          <Plus className="h-3 w-3" /> 지급
                        </button>
                      </td>
                    )}
                  </tr>

                  {expanded && shown.map((inst, i) => (
                    <tr key={`${r.transactionId}-${i}`} className={cn('text-xs', tone.row)}>
                      <td className={cn(TD, 'pl-9 text-muted-foreground')}>{i + 1}회</td>
                      <td className={cn(TD, 'font-mono text-muted-foreground')}>{inst.paidAt}</td>
                      <td className={TD} />
                      <td className={cn(TD, 'text-right font-mono')}>
                        {inst.direction === 'in' && <span className="text-emerald-700">환급 </span>}
                        {krw(Math.abs(inst.amountKrw))}
                      </td>
                      <td className={TD} />
                      <td className={cn(TD, 'font-mono text-muted-foreground')}>
                        {r.dueDate
                          ? (() => {
                              const d = Math.round(
                                (Date.parse(inst.paidAt) - Date.parse(r.dueDate)) / 86_400_000)
                              return d === 0 ? '당일' : d > 0 ? `+${d}일` : `${d}일`
                            })()
                          : '-'}
                      </td>
                      <td className={TD}>
                        {!inst.confirmed && (
                          <span className="rounded-sm bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">
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
                                className="rounded-sm border px-1.5 py-0.5 hover:bg-muted"
                                aria-label="수정"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={busy === inst.paymentId}
                                onClick={() => remove(inst.paymentId!, `${r.roundLabel} ${i + 1}회`)}
                                className="rounded-sm border px-1.5 py-0.5 text-red-700 hover:bg-red-50 disabled:opacity-40"
                                aria-label="삭제"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}

                  {expanded && hidden > 0 && (
                    <tr className={cn('text-xs', tone.row)}>
                      <td colSpan={editable ? 8 : 7} className="px-3 pb-2 pl-9">
                        <button
                          type="button"
                          onClick={() => toggle(showAll, r.transactionId, setShowAll)}
                          className="text-xs text-primary hover:underline"
                        >
                          ▾ 나머지 {hidden}회 보기 · 마지막 {r.installments.at(-1)!.paidAt}
                        </button>
                      </td>
                    </tr>
                  )}

                  {expanded && r.state === 'no_record' && (
                    <tr className={cn('text-xs', tone.row)}>
                      <td colSpan={editable ? 8 : 7} className="px-3 pb-2 pl-9 text-red-700">
                        통장 원장에 대응하는 출금이 없습니다.
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}

            {doneRows.length > 0 && (
              <tr className="border-t bg-muted/40">
                <td colSpan={editable ? 8 : 7} className="px-3 py-2 text-xs text-muted-foreground">
                  <button type="button" onClick={() => setShowPaid((v) => !v)} className="hover:underline">
                    {showPaid ? '▾' : '▸'} 완납 {doneRows.length}개 차수 · {krw(donePaid)}원
                  </button>
                  <span className="ml-2">
                    분할 지급 {rows.filter((r) => r.installments.length > 1).length}개 차수
                  </span>
                </td>
              </tr>
            )}
            {unbilled.length > 0 && (
              <tr className="border-t bg-muted/40">
                <td colSpan={editable ? 8 : 7} className="px-3 py-2 text-xs text-muted-foreground">
                  청구 전 {unbilled.length}개 차수 ({unbilled.map((r) => r.roundLabel).join(', ')})
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        기일 옆 <span className="font-mono">*</span> 는 LC 개설일 + 165일 계산값입니다 (원본 「입금일」이 없는 차수).
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
