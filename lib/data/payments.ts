import type { SupabaseClient } from '@supabase/supabase-js'
import { computeSettlementSchedule } from '@/lib/calculations/schedule'

/**
 * 지급 현황 화면이 읽는 데이터.
 *
 * 잔액·연체일은 어디에도 저장하지 않는다. 통장 원장(settlement_payments)과
 * 배분(payment_allocations)에서 매번 계산한다 — 저장하면 원장과 어긋나는 순간
 * 화면이 조용히 거짓말을 한다.
 */

/** 절사 오차. 이보다 작은 잔액은 완납으로 본다 (28차 32원, 35차 58원 등). */
export const PAID_TOLERANCE_KRW = 1_000

/** 기일이 이 일수 안으로 들어오면 「임박」으로 표시한다. */
export const DUE_SOON_DAYS = 7

/** 일부만 내고 이 기간이 지나도록 추가 지급이 없으면 「정체」로 본다. */
export const STALLED_DAYS = 30

export type PaymentState =
  /** 기일 경과 · 지급 기록이 아예 없음 */
  | 'no_record'
  /** 기일 경과 · 일부만 지급 */
  | 'overdue'
  /** 청구액보다 많이 지급됨 — 못 낸 게 아니라 더 낸 것이다 */
  | 'overpaid'
  /** 기일 임박 */
  | 'due_soon'
  /** 기일 전 */
  | 'upcoming'
  /** 완납 */
  | 'paid'
  /** 청구금액이 아직 없어 판단 불가 */
  | 'unbilled'

export interface Installment {
  /** 통장 원장 행 id — 수정·삭제가 이걸로 간다 */
  paymentId: string
  paidAt: string
  amountKrw: number
  direction: 'out' | 'in'
  confirmed: boolean
}

export interface PaymentRow {
  transactionId: string
  roundNo: number | null
  roundLabel: string
  /** 수입금액(USD) — 원본 엑셀의 차수별 수입금액과 같은 값 */
  importAmountUsd: number | null
  /** 실제로 청구한 금액(invoiced_amount_krw). 아직 청구 전이면 null */
  billedKrw: number | null
  /** 시스템 확정값. billedKrw 와 다르면 검산 차이가 있다는 뜻 */
  confirmedKrw: number | null
  /** billedKrw − confirmedKrw. 미지급이 아니라 계산 차이다 */
  calcDiffKrw: number | null
  /** 아직 청구하지 않은 차수의 예상 청구액 (확정값) */
  plannedKrw: number | null
  paidKrw: number
  balanceKrw: number
  installments: Installment[]
  dueDate: string | null
  /** 기일이 저장된 값인지(원본 「입금일」) 계산값인지 */
  dueIsExplicit: boolean
  /** 마지막 지급일 − 기일. 음수면 기일 전에 냈다는 뜻. 미지급이면 오늘 기준 경과일 */
  delayDays: number | null
  state: PaymentState
  /** 배분이 사람 손을 거치지 않은 건이 섞여 있는가 */
  needsConfirm: boolean
  /** 일부만 내고 30일 넘게 멈춰 있는가 */
  stalled: boolean
  /** 최종정산(클로징) 확정액. 아직 클로징 전이면 null */
  closingBilledKrw: number | null
  closingPaidKrw: number
  closingBalanceKrw: number
  closingInstallments: Installment[]
}

export interface UnallocatedPayment {
  id: string
  paidAt: string
  direction: 'out' | 'in'
  amountKrw: number
  unallocatedKrw: number
  bankMemo: string | null
}

export interface PaymentAlerts {
  /** 기일이 지났는데 지급 기록이 하나도 없는 차수 */
  noRecord: PaymentRow[]
  /** 어느 차수 것인지 모르는 입출금 */
  unallocated: UnallocatedPayment[]
  unallocatedKrw: number
  /** 초기 배분이 확인되지 않은 이체 건수 */
  unconfirmedPayments: number
  /** 기일 7일 이내 미지급 */
  dueSoon: PaymentRow[]
  /** 부분 지급 후 30일 넘게 멈춘 차수 */
  stalled: PaymentRow[]
  /** 청구보다 많이 나간 차수 — 상계 여부 확인이 필요하다 */
  overpaid: PaymentRow[]
  /** 지급 기록은 있는데 청구액이 등재되지 않은 차수 — 대사 자체가 불가능하다 */
  billedMissing: PaymentRow[]
  /** 담당자가 처리해야 할 총 건수 — 사이드바 뱃지 */
  total: number
}

export interface PaymentSummary {
  billedKrw: number
  paidKrw: number
  balanceKrw: number
  overdueKrw: number
  overdueCount: number
  maxDelayDays: number
  /** 청구액보다 많이 나간 금액 (양수로 담는다) */
  overpaidKrw: number
  overpaidCount: number
  next90Krw: number
  next90Count: number
  nextDue: PaymentRow | null
  lastPayment: { roundNo: number | null; roundLabel: string; paidAt: string; amountKrw: number } | null
  /** 아직 청구하지 않은 차수의 예상 청구액 합계 */
  plannedKrw: number
  plannedCount: number
  /** 실제 청구액과 시스템 확정값이 어긋나는 차수 — 미지급이 아니라 계산 차이 */
  calcDiffCount: number
  calcDiffKrw: number
  /** 클로징(최종정산) 미정산 순액 */
  closingBalanceKrw: number
  closingOpenCount: number
}

type StatusRow = {
  transaction_id: string
  kind: string
  paid_krw: number | string
  installment_count: number
  first_paid_at: string | null
  last_paid_at: string | null
  all_confirmed: boolean
  installments: {
    payment_id: string; paid_at: string; amount: number | string
    direction: 'out' | 'in'; confirmed: boolean
  }[]
}

/**
 * 화면에 쓰는 차수 이름.
 *
 * `round_label` 을 그대로 쓰지 않는다 — 1차가 「26년 01차」인 등 연도가 어긋난 행이 있다.
 * 차수 번호는 `round_no` 하나만 믿는다.
 */
export function roundName(r: { roundNo: number | null; roundLabel: string }): string {
  return r.roundNo != null ? `${r.roundNo}차` : r.roundLabel
}

function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10))
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10))
  return Math.round((b - a) / 86_400_000)
}

function num(v: number | string | null | undefined): number {
  return v == null ? 0 : Number(v)
}

export async function loadPaymentsData(supabase: SupabaseClient, today: string) {
  const [
    { data: txRows },
    { data: interimRows },
    { data: closingRows },
    { data: statusRows },
    { data: unallocRows },
    { data: holidayRows },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, round_no, round_label, import_amount_usd, lc_open_date, payment_due_date')
      .order('round_no', { ascending: false }),
    supabase
      .from('interim_settlements')
      .select('transaction_id, invoiced_amount_krw, confirmed_amount_krw'),
    supabase
      .from('closing_settlements')
      .select('transaction_id, confirmed_amount_krw'),
    supabase.from('v_settlement_payment_status').select('*'),
    supabase
      .from('v_payment_unallocated')
      .select('id, paid_at, direction, amount_krw, unallocated_krw, bank_memo, unconfirmed_count')
      .order('paid_at', { ascending: false }),
    supabase.from('holidays').select('date'),
  ])

  const holidays = new Set((holidayRows ?? []).map((h: { date: string }) => h.date))

  // 청구액과 확정값을 나란히 들고 간다 — 잔액은 실제 청구액으로 내고,
  // 확정값과의 차이는 「검산 차이」로 따로 보여준다. 둘을 섞으면 미지급처럼 보인다.
  const invoicedOf = new Map<string, number>()
  const confirmedOf = new Map<string, number>()
  for (const r of (interimRows ?? []) as {
    transaction_id: string; invoiced_amount_krw: number | null; confirmed_amount_krw: number | null
  }[]) {
    if (r.invoiced_amount_krw != null) invoicedOf.set(r.transaction_id, Number(r.invoiced_amount_krw))
    if (r.confirmed_amount_krw != null) confirmedOf.set(r.transaction_id, Number(r.confirmed_amount_krw))
  }
  const closingBilledOf = new Map<string, number>()
  for (const r of (closingRows ?? []) as { transaction_id: string; confirmed_amount_krw: number | null }[]) {
    if (r.confirmed_amount_krw != null) closingBilledOf.set(r.transaction_id, Number(r.confirmed_amount_krw))
  }

  const status = new Map<string, StatusRow>()
  const closingStatus = new Map<string, StatusRow>()
  for (const s of (statusRows ?? []) as StatusRow[]) {
    if (s.kind === 'interim') status.set(s.transaction_id, s)
    else if (s.kind === 'closing') closingStatus.set(s.transaction_id, s)
  }

  const rows: PaymentRow[] = ((txRows ?? []) as {
    id: string; round_no: number | null; round_label: string
    import_amount_usd: number | string | null
    lc_open_date: string | null; payment_due_date: string | null
  }[]).map((t) => {
    const s = status.get(t.id)
    const billedKrw = invoicedOf.get(t.id) ?? null
    const confirmedKrw = confirmedOf.get(t.id) ?? null
    const paidKrw = num(s?.paid_krw)
    const installments: Installment[] = (s?.installments ?? []).map((i) => ({
      paymentId: i.payment_id,
      paidAt: i.paid_at,
      amountKrw: num(i.amount),
      direction: i.direction,
      confirmed: i.confirmed,
    }))

    // 최종정산(클로징)은 중간정산과 별개의 청구·지급이다. 합치면 어느 쪽이
    // 안 맞는지 알 수 없어져 한 줄로 나란히 보여준다.
    const cs = closingStatus.get(t.id)
    const closingBilledKrw = closingBilledOf.get(t.id) ?? null
    const closingPaidKrw = num(cs?.paid_krw)
    const closingInstallments: Installment[] = (cs?.installments ?? []).map((i) => ({
      paymentId: i.payment_id,
      paidAt: i.paid_at,
      amountKrw: num(i.amount),
      direction: i.direction,
      confirmed: i.confirmed,
    }))

    const schedule = computeSettlementSchedule(t.lc_open_date, holidays)
    const dueDate = t.payment_due_date ?? schedule.interimDue
    const balanceKrw = billedKrw == null ? 0 : billedKrw - paidKrw
    const settled = billedKrw != null && Math.abs(balanceKrw) < PAID_TOLERANCE_KRW

    // 완납이면 「마지막 지급이 기일보다 며칠 늦었나」, 미납이면 「기일에서 며칠 지났나」.
    const delayDays = dueDate == null
      ? null
      : settled && s?.last_paid_at
        ? daysBetween(dueDate, s.last_paid_at)
        : daysBetween(dueDate, today)

    let state: PaymentState
    if (billedKrw == null) state = 'unbilled'
    else if (settled) state = 'paid'
    // 초과 지급은 기일과 무관하다. 연체로 묶으면 대표 화면이 반대로 읽힌다.
    else if (balanceKrw < 0) state = 'overpaid'
    else if (dueDate == null) state = 'upcoming'
    else if (delayDays! > 0) state = installments.length === 0 ? 'no_record' : 'overdue'
    else if (delayDays! > -DUE_SOON_DAYS) state = 'due_soon'
    else state = 'upcoming'

    const stalled =
      state === 'overdue' &&
      s?.last_paid_at != null &&
      daysBetween(s.last_paid_at, today) > STALLED_DAYS

    return {
      transactionId: t.id,
      roundNo: t.round_no,
      roundLabel: t.round_label,
      importAmountUsd: t.import_amount_usd == null ? null : Number(t.import_amount_usd),
      billedKrw,
      confirmedKrw,
      calcDiffKrw: billedKrw != null && confirmedKrw != null ? billedKrw - confirmedKrw : null,
      plannedKrw: billedKrw == null ? confirmedKrw : null,
      paidKrw,
      balanceKrw,
      installments,
      dueDate,
      dueIsExplicit: t.payment_due_date != null,
      delayDays,
      state,
      needsConfirm: s ? !s.all_confirmed : false,
      stalled,
      closingBilledKrw,
      closingPaidKrw,
      closingBalanceKrw: closingBilledKrw == null ? 0 : closingBilledKrw - closingPaidKrw,
      closingInstallments,
    }
  })

  // ── 정렬: 차수 내림차순. 최근 차수가 위, 1차가 맨 아래 ──
  // 상태순으로 섞으면 「43차 다음이 19차」가 되어 차수를 눈으로 좇을 수 없다.
  // 손댈 것은 상단 알림과 필터가 잡아 준다.
  rows.sort((a, b) => (b.roundNo ?? 0) - (a.roundNo ?? 0))

  // ── 요약 ──
  const billedRows = rows.filter((r) => r.billedKrw != null)
  const open = billedRows.filter((r) => r.state !== 'paid')
  const overdue = open.filter((r) => r.state === 'no_record' || r.state === 'overdue')
  const overpaid = open.filter((r) => r.state === 'overpaid')
  const next90 = open.filter(
    (r) => r.dueDate != null && r.delayDays != null && r.delayDays <= 0 && r.delayDays > -90,
  )
  const upcoming = open
    .filter((r) => r.dueDate != null && r.delayDays != null && r.delayDays <= 0)
    .sort((a, b) => (b.delayDays ?? 0) - (a.delayDays ?? 0))

  let lastPayment: PaymentSummary['lastPayment'] = null
  for (const r of rows) {
    for (const i of r.installments) {
      if (!lastPayment || i.paidAt > lastPayment.paidAt) {
        lastPayment = { roundNo: r.roundNo, roundLabel: r.roundLabel, paidAt: i.paidAt, amountKrw: i.amountKrw }
      }
    }
  }

  let closingBalanceKrw = 0
  let closingOpenCount = 0
  for (const [txId, billed] of closingBilledOf) {
    const paid = num(closingStatus.get(txId)?.paid_krw)
    const bal = billed - paid
    if (Math.abs(bal) >= PAID_TOLERANCE_KRW) {
      closingBalanceKrw += bal
      closingOpenCount += 1
    }
  }

  const planned = rows.filter((r) => r.plannedKrw != null)
  const calcDiff = rows.filter((r) => r.calcDiffKrw != null && Math.abs(r.calcDiffKrw) >= PAID_TOLERANCE_KRW)

  const summary: PaymentSummary = {
    billedKrw: billedRows.reduce((s, r) => s + (r.billedKrw ?? 0), 0),
    paidKrw: billedRows.reduce((s, r) => s + r.paidKrw, 0),
    balanceKrw: billedRows.reduce((s, r) => s + r.balanceKrw, 0),
    overdueKrw: overdue.reduce((s, r) => s + r.balanceKrw, 0),
    overdueCount: overdue.length,
    maxDelayDays: overdue.reduce((m, r) => Math.max(m, r.delayDays ?? 0), 0),
    overpaidKrw: -overpaid.reduce((s, r) => s + r.balanceKrw, 0),
    overpaidCount: overpaid.length,
    next90Krw: next90.reduce((s, r) => s + r.balanceKrw, 0),
    next90Count: next90.length,
    nextDue: upcoming[0] ?? null,
    lastPayment,
    plannedKrw: planned.reduce((s, r) => s + (r.plannedKrw ?? 0), 0),
    plannedCount: planned.length,
    calcDiffCount: calcDiff.length,
    calcDiffKrw: calcDiff.reduce((s, r) => s + (r.calcDiffKrw ?? 0), 0),
    closingBalanceKrw,
    closingOpenCount,
  }

  const unallocated: UnallocatedPayment[] = ((unallocRows ?? []) as {
    id: string; paid_at: string; direction: 'out' | 'in'
    amount_krw: number | string; unallocated_krw: number | string; bank_memo: string | null
  }[])
    .filter((p) => num(p.unallocated_krw) > 0)
    .map((p) => ({
      id: p.id,
      paidAt: p.paid_at,
      direction: p.direction,
      amountKrw: num(p.amount_krw),
      unallocatedKrw: num(p.unallocated_krw),
      bankMemo: p.bank_memo,
    }))

  const unconfirmedPayments = ((unallocRows ?? []) as { unconfirmed_count: number }[])
    .filter((p) => Number(p.unconfirmed_count) > 0).length

  const noRecord = rows.filter((r) => r.state === 'no_record')
  // 청구액이 없는데 돈이 나간 차수. 잔액을 낼 근거가 없어 대사가 불가능하다.
  const billedMissing = rows.filter((r) => r.billedKrw == null && r.paidKrw !== 0)
  const overpaidRows = rows.filter((r) => r.state === 'overpaid')
  const dueSoon = rows.filter((r) => r.state === 'due_soon')
  const stalled = rows.filter((r) => r.stalled)

  const alerts: PaymentAlerts = {
    noRecord,
    unallocated,
    unallocatedKrw: unallocated.reduce((s, p) => s + p.unallocatedKrw, 0),
    unconfirmedPayments,
    dueSoon,
    stalled,
    overpaid: overpaidRows,
    billedMissing,
    total: noRecord.length + unallocated.length + unconfirmedPayments
      + overpaidRows.length + billedMissing.length,
  }

  return { rows, summary, alerts }
}
