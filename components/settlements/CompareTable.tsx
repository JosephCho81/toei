'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { MemoField } from '@/components/ui/MemoField'
import { PAID_TOLERANCE_KRW } from '@/lib/data/payments'
import { aggregate, type CompareRow, type CompareTotals, type SettlementKind } from '@/lib/data/settlementCompare'

/**
 * 청구값 · 계산값 · 지불값을 한 줄에 세운 표. 세 화면이 같은 것을 쓴다.
 *
 * 세 금액의 뜻이 다르다 —
 *   청구액   실제로 보낸 청구서 금액 (사실)
 *   계산값   지금 규약으로 다시 계산한 금액 (규약)
 *   지급액   통장에서 오간 금액 (사실)
 *
 * **그래서 차이는 셋이다.** 2026-09-05 담당자 양식(`_source_docs/양식 예시.xlsx`)까지
 * 반영해 셋을 다 세웠다:
 *
 *   청구−계산   청구서가 틀린 금액          (K열)
 *   청구−지급   아직 안 받은 금액           (L열, 미지급금)
 *   계산−지급   청구가 맞았다면 남았을 금액  (M열)  ← 어제까지 없던 열
 *
 * 마지막 것이 없어서 담당자가 「청구 기준 68만 더 지급 / 계산 기준 덜 지급」이라는
 * 자기 수기검산을 화면에서 확인할 수 없었다. 셋을 한 칸에 합치지 말 것.
 *
 * 색은 빨강 하나만 쓴다 — 지급 현황과 같은 규칙이다.
 * 빨강은 「덜 청구한 돈」과 「덜 들어온 돈」에만 붙는다.
 *
 * 금액은 전부 **에이원 기준**이다 — 시점 토글은 없앴다(담당자 요청 2026-09-05).
 * 「에이원 자료이니 에이원 기준으로만 해도 상관없다」
 */

const TH = 'px-2.5 py-2.5 font-semibold whitespace-nowrap text-slate-600'
const TD = 'px-2.5 py-2.5 whitespace-nowrap align-middle'
const NUM = 'text-right'
const CENTER = 'text-center'
const COLS = 10

type FilterKey = 'all' | 'billMismatch' | 'overdue' | 'open' | 'paid' | 'unbilled'

function krw(n: number | null | undefined): string {
  return n == null ? '—' : Math.round(n).toLocaleString('ko-KR')
}

/** 부호를 앞에 붙여 방향을 보여준다. 「청구−계산」에서만 쓴다. */
function signed(n: number): string {
  const v = Math.round(n)
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('ko-KR')}`
}

function rowKey(r: CompareRow): string {
  return `${r.transactionId}-${r.incurredOn ?? ''}`
}

export function CompareTable({
  rows,
  kind,
  today,
}: {
  rows: CompareRow[]
  kind: SettlementKind
  /** 「기일 경과」를 가르는 기준일 */
  today: string
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const FILTERS: { key: FilterKey; label: string; test: (r: CompareRow) => boolean }[] = useMemo(() => [
    { key: 'all', label: '전체', test: () => true },
    {
      key: 'billMismatch',
      label: '청구 ≠ 계산',
      test: (r) => !r.legacyVatMode && r.billVsCalcKrw != null
        && Math.abs(r.billVsCalcKrw) >= PAID_TOLERANCE_KRW,
    },
    {
      key: 'overdue',
      label: '기일 경과',
      test: (r) => r.dueDate != null && r.dueDate <= today
        && r.balanceKrw != null && r.balanceKrw > PAID_TOLERANCE_KRW,
    },
    {
      key: 'open',
      label: '미지급',
      test: (r) => r.balanceKrw != null && Math.abs(r.balanceKrw) >= PAID_TOLERANCE_KRW,
    },
    {
      key: 'paid',
      label: '완납',
      test: (r) => r.balanceKrw != null && Math.abs(r.balanceKrw) < PAID_TOLERANCE_KRW,
    },
    { key: 'unbilled', label: '청구 전', test: (r) => r.invoicedKrw == null },
  ], [today])

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, rows.filter(f.test).length])) as Record<FilterKey, number>,
    [rows, FILTERS],
  )
  const visible = useMemo(
    () => rows.filter(FILTERS.find((f) => f.key === filter)!.test),
    [rows, filter, FILTERS],
  )

  /**
   * 연도별 소계 — 담당자 양식의 「연도별 합계 / 총 합계」.
   * 기일 연도로 가른다. 차수 순서와 기일 연도가 같이 올라가므로 묶음이 흩어지지 않는다.
   */
  const groups = useMemo(() => {
    const out: { year: number | null; rows: CompareRow[] }[] = []
    for (const r of visible) {
      const last = out.at(-1)
      if (last && last.year === r.dueYear) last.rows.push(r)
      else out.push({ year: r.dueYear, rows: [r] })
    }
    return out
  }, [visible])

  const pickedRows = useMemo(() => visible.filter((r) => picked.has(rowKey(r))), [visible, picked])
  const allPicked = visible.length > 0 && pickedRows.length === visible.length

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function pick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function saveNote(row: CompareRow, note: string | null) {
    if (!row.noteTarget) throw new Error('메모를 저장할 곳이 없습니다')
    const supabase = createClient()
    const { error } = await supabase
      .from(row.noteTarget.table)
      .update({ [row.noteTarget.column]: note })
      .eq('id', row.noteTarget.id)
    if (error) throw new Error(error.message)
    router.refresh()
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
          왼쪽 칸을 체크하면 그 차수들만 합산합니다 · 차수를 누르면 계산 내역·지급 회차·메모가 열립니다.
        </p>
      </div>

      {/* 「35차까지」처럼 임의 구간을 더해 보는 자리. 양식의 E열(8·9·10차 합산)도 이걸로 낸다. */}
      {pickedRows.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md border border-slate-400 bg-slate-100 px-4 py-2.5 text-sm">
          <span className="font-semibold">선택 {pickedRows.length}개 차수 합계</span>
          <PickedFigures totals={aggregate(pickedRows)} />
          <button
            type="button"
            onClick={() => setPicked(new Set())}
            className="ml-auto underline underline-offset-2 text-muted-foreground"
          >
            선택 해제
          </button>
        </div>
      )}

      <div className="mt-2 overflow-x-auto rounded-md border">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className={cn(TH, CENTER, 'w-[3%]')}>
                <input
                  type="checkbox"
                  aria-label="보이는 차수 모두 선택"
                  checked={allPicked}
                  onChange={() => setPicked(allPicked ? new Set() : new Set(visible.map(rowKey)))}
                  className="h-3.5 w-3.5 align-middle accent-slate-700"
                />
              </th>
              <th className={cn(TH, CENTER, 'w-[14%]')}>차수 · P/O No.</th>
              <th className={cn(TH, NUM, 'w-[12%]')}>청구액 (원)</th>
              <th className={cn(TH, NUM, 'w-[12%]')}>계산값 (원)</th>
              <th className={cn(TH, NUM, 'w-[10%]')}>청구−계산</th>
              <th className={cn(TH, NUM, 'w-[12%]')}>지급액 (원)</th>
              <th className={cn(TH, NUM, 'w-[10%]')}>청구−지급</th>
              <th className={cn(TH, NUM, 'w-[10%]')}>계산−지급</th>
              <th className={cn(TH, CENTER, 'w-[12%]')}>기일 · 실지급일</th>
              <th className={cn(TH, CENTER, 'w-[5%]')}>비고</th>
            </tr>
          </thead>

          {groups.map((g) => (
            <GroupBody
              key={`${g.year ?? 'none'}-${g.rows[0] ? rowKey(g.rows[0]) : ''}`}
              group={g}
              open={open}
              picked={picked}
              onToggle={toggle}
              onPick={pick}
              onSaveNote={saveNote}
              showYearSubtotal={groups.length > 1}
            />
          ))}

          <tbody className="border-t-2 border-slate-400">
            <TotalsRow label="총 합계" totals={aggregate(visible)} strong />
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        「청구−계산」은 청구서가 어긋난 금액, 「청구−지급」은 아직 오가지 않은 금액,
        「계산−지급」은 청구가 맞았다면 남았을 금액입니다 — 셋이 다른 이야기라 열을 나눠 두었습니다.
        1,000원 미만 차이는 절사로 보아 0으로 봅니다.
      </p>
    </>
  )
}

/** 선택 합계 바에 들어가는 숫자들. 표의 소계와 같은 `aggregate()` 를 쓴다. */
function PickedFigures({ totals }: { totals: CompareTotals }) {
  const items: [string, number][] = [
    ['청구', totals.invoicedKrw],
    ['계산', totals.calcKrw],
    ['지급', totals.paidKrw],
    ['청구−지급', totals.balanceKrw],
    ['계산−지급', totals.calcVsPaidKrw],
  ]
  return (
    <>
      {items.map(([label, v]) => (
        <span key={label}>
          <span className="text-muted-foreground">{label}</span>{' '}
          <b className="tabular-nums">{signed(v)}</b>
        </span>
      ))}
      {totals.excludedCount > 0 && (
        <span className="text-muted-foreground">
          계산 비교에서 {totals.excludedCount}건 제외
        </span>
      )}
    </>
  )
}

function GroupBody({
  group,
  open,
  picked,
  onToggle,
  onPick,
  onSaveNote,
  showYearSubtotal,
}: {
  group: { year: number | null; rows: CompareRow[] }
  open: Set<string>
  picked: Set<string>
  onToggle: (id: string) => void
  onPick: (id: string) => void
  onSaveNote: (row: CompareRow, note: string | null) => Promise<void>
  showYearSubtotal: boolean
}) {
  return (
    <>
      {group.rows.map((r, i) => {
        const id = rowKey(r)
        const isOpen = open.has(id)
        const zebra = i % 2 === 1 ? 'bg-slate-50/60' : ''
        const billGap = r.billVsCalcKrw
        const underBilled = !r.legacyVatMode && billGap != null && billGap < -PAID_TOLERANCE_KRW
        const unpaid = r.balanceKrw != null && r.balanceKrw > PAID_TOLERANCE_KRW
        const calcUnpaid = r.calcVsPaidKrw != null && r.calcVsPaidKrw > PAID_TOLERANCE_KRW

        return (
          <tbody key={id} className="border-t">
            <tr
              className={cn('group cursor-pointer hover:bg-slate-100/70', zebra)}
              onClick={() => onToggle(id)}
            >
              <td className={cn(TD, CENTER, 'px-1')} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={`${r.roundNo ?? r.roundLabel}차 합계에 넣기`}
                  checked={picked.has(id)}
                  onChange={() => onPick(id)}
                  className="h-3.5 w-3.5 align-middle accent-slate-700"
                />
              </td>

              <td className={cn('px-2.5 py-2.5 align-middle text-center font-semibold')}>
                <span className="inline-flex items-center gap-1">
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 text-slate-400" />
                    : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  {r.roundNo != null ? `${r.roundNo}차` : r.roundLabel}
                </span>
                {r.orderNo && (
                  <span className="block font-normal text-muted-foreground">{r.orderNo}</span>
                )}
                {r.mergedWithRounds.length > 0 && (
                  <span className="block font-normal text-muted-foreground">
                    {r.mergedWithRounds.join('·')}차와 묶음 지급
                  </span>
                )}
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

              {/* 담당자 요청 — 미지급금이 +가 되도록. 초과 지급은 말로 붙인다. */}
              <td className={cn(TD, NUM, 'tabular-nums font-semibold',
                unpaid ? 'text-red-700' : 'text-slate-600')}>
                <Gap value={r.balanceKrw} />
              </td>

              {/* 청구가 맞았다면 남았을 금액. 구방식은 비교 자체가 성립하지 않는다. */}
              <td className={cn(TD, NUM, 'tabular-nums font-semibold',
                calcUnpaid ? 'text-red-700' : 'text-slate-600')}>
                {r.legacyVatMode
                  ? <span className="text-muted-foreground">구방식</span>
                  : <Gap value={r.calcVsPaidKrw} />}
              </td>

              <td className={cn(TD, CENTER, 'tabular-nums text-slate-600')}>
                {r.dueDate ?? '미정'}
                <span className="block text-muted-foreground">
                  {r.lastPaidAt ?? '지급 없음'}
                </span>
              </td>

              <td className={cn(TD, CENTER, 'px-1')}>
                <StickyNote
                  className={cn('mx-auto h-4 w-4', r.note ? 'text-slate-700' : 'text-slate-300')}
                  aria-label={r.note ? '메모 있음' : '메모 없음'}
                />
              </td>
            </tr>

            {isOpen && (
              <tr>
                <td colSpan={COLS} className="border-l-4 border-slate-300 bg-slate-100/70 px-6 py-3">
                  <RowDetail row={r} onSaveNote={onSaveNote} />
                </td>
              </tr>
            )}
          </tbody>
        )
      })}

      {showYearSubtotal && (
        <tbody className="border-t border-slate-300">
          <TotalsRow
            label={group.year != null ? `${group.year}년 소계` : '기일 미정 소계'}
            totals={aggregate(group.rows)}
          />
        </tbody>
      )}
    </>
  )
}

/**
 * 차이 한 칸.
 * **부호로 방향을 말하지 않는다** — 크기는 숫자로, 방향은 말로 적는다.
 * 담당자 요청대로 「아직 안 낸 돈」이 양수이고, 반대는 「초과」를 붙인다.
 */
function Gap({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  if (Math.abs(value) < PAID_TOLERANCE_KRW) return <>0</>
  return (
    <>
      {krw(Math.abs(value))}
      {value < 0 && <span className="ml-1 text-xs font-normal text-muted-foreground">초과</span>}
    </>
  )
}

/** 연도 소계·총계·선택 합계가 전부 같은 모양으로 선다. */
function TotalsRow({
  label,
  totals,
  strong = false,
}: {
  label: string
  totals: CompareTotals
  strong?: boolean
}) {
  const cls = cn('px-2.5 py-2.5 text-right tabular-nums font-semibold',
    strong ? 'text-slate-900' : 'text-slate-700')
  return (
    <tr className={strong ? 'bg-slate-200/70' : 'bg-slate-100'}>
      <td />
      <td className={cn('px-2.5 py-2.5 text-center font-semibold', strong && 'text-slate-900')}>
        {label}
        <span className="block font-normal text-muted-foreground">{totals.rowCount}건</span>
      </td>
      <td className={cls}>{krw(totals.invoicedKrw)}</td>
      <td className={cls}>
        {krw(totals.calcKrw)}
        {totals.excludedCount > 0 && (
          <span className="block text-xs font-normal text-muted-foreground">
            {totals.excludedCount}건 제외
          </span>
        )}
      </td>
      <td className={cls}>{signed(totals.billVsCalcKrw)}</td>
      <td className={cls}>{krw(totals.paidKrw)}</td>
      <td className={cls}><Gap value={totals.balanceKrw} /></td>
      <td className={cls}><Gap value={totals.calcVsPaidKrw} /></td>
      <td />
      <td />
    </tr>
  )
}

/**
 * 펼친 한 줄의 속. 「왜 틀렸는가」가 여기 있어야 한다 —
 * 표에서 −5,483,717 만 보고는 계산이 틀렸는지 청구가 틀렸는지 알 수 없다.
 *
 * 담당자 양식 N열: 「누르면 계산값과 청구값 차이 원인 볼 수 있도록 (원인은 직접 메모)」.
 * 시스템이 원인을 지어내지 않는다 — 사람이 적고, 시스템은 금액만 나란히 세운다.
 */
function RowDetail({
  row,
  onSaveNote,
}: {
  row: CompareRow
  onSaveNote: (row: CompareRow, note: string | null) => Promise<void>
}) {
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

      {/* 네 금액을 나란히 — 어느 것이 어긋났는지는 여기서만 갈린다 */}
      <table className="w-full max-w-xl border-collapse">
        <tbody>
          <Line label="실제 청구액" value={row.invoicedKrw} note="청구서로 보낸 금액" />
          <Line label="담당자 확정금액" value={row.confirmedKrw} note="확정한 금액" />
          <Line label="시스템 계산값" value={row.calcKrw} note="현재 규약으로 다시 계산" />
          <Line label="지급액" value={row.paidKrw} note="통장에서 오간 금액" />
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
        <p className="text-muted-foreground">아직 지급 기록이 없습니다.</p>
      )}

      {row.mergedWithRounds.length > 0 && (
        <p className="text-muted-foreground">
          이 차수의 지급 중에는 {row.mergedWithRounds.join('·')}차와 한 번에 묶어 보낸 이체가 있습니다.
        </p>
      )}

      {/* 금액 차이의 원인은 사람만 안다. 최차장님께 설명할 문장을 여기 적어 둔다. */}
      <div className="max-w-2xl rounded-md border bg-white px-3 py-2">
        <p className="mb-1 font-semibold">
          비고 — 금액 차이가 난 이유
        </p>
        {row.noteTarget ? (
          <MemoField
            notes={row.note}
            onSave={(next) => onSaveNote(row, next)}
          />
        ) : (
          <p className="text-muted-foreground">이 행에는 메모를 저장할 곳이 없습니다.</p>
        )}
      </div>

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
