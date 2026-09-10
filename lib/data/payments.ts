import type { SupabaseClient } from '@supabase/supabase-js'
// 회귀 테스트가 node 로 이 파일을 직접 부른다 — 별칭(@/) 은 node 가 풀지 못하므로 상대경로로 둔다.
import { computeSettlementSchedule } from '../calculations/schedule.ts'

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

/**
 * 여기까지가 「정산이 끝난 구간」이다. 남은 금액을 연체가 아니라 **지급금 차이**로 센다.
 *
 * 담당자 2026-09-10: 「지금까지 정산된 35차까지를 지급금 차이로 계산.
 *   연체는 이번달 지급 중인 금액을 제외하고 계산.」
 *
 * 기간(1년 경과 등)으로 자르지 않는다 — 그러면 지금 정상인 37·38차가 1년 뒤
 * 조용히 연체에서 빠져나가 진짜 연체가 화면에서 사라진다.
 */
export const SETTLED_THROUGH_ROUND = 35

/**
 * 기일에서 이 일수까지는 빨강을 붙이지 않는다.
 *
 * 담당자 2026-09-10: 「영업일로 3,4일 정도 차이를 두고 지급 가능. 계산서 일정, 휴일,
 *   금액 검토 등으로 약간 바뀔 수 있음. 해서 1주 정도 기간 설정.」
 */
export const DUE_GRACE_DAYS = 7

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
  /** 청구금액도 계산값도 없어 판단 불가 */
  | 'unbilled'

/**
 * 남은 금액이 어느 칸에 들어가는가. 넷은 서로 겹치지 않는다.
 *
 * 담당자 2026-09-10 로 갈라졌다 — 예전에는 「기일 경과」 한 칸이 셋을 다 담고 있어
 * 2차 1억 3천만원(2022년, 개인 통장 지급분)이 이번 달 연체와 나란히 서 있었다.
 */
export type PaymentBucket =
  /** 35차까지의 남은 금액 — 연체가 아니라 정산이 끝난 구간의 차이다 */
  | 'settled_gap'
  /** 36차 이후, 기일이 이번 달 — 지급이 도는 중이다 */
  | 'in_progress'
  /** 36차 이후, 기일이 달을 넘겼다 — 지체상금 대상 */
  | 'overdue'
  /** 기일이 아직 오지 않았다 */
  | 'not_due'
  /** 청구액보다 많이 나갔다 */
  | 'overpaid'
  /** 남은 금액이 없다 */
  | 'none'

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
  /**
   * 남은 금액을 내는 기준. 청구액이 있으면 청구액, 없으면 계산값이다.
   *
   * 담당자 2026-09-10: 「시스템은 계산값으로 계산, 이후 정산에서 청구값을 입력.」
   * 36차부터는 엑셀 청구금액을 쓰지 않으므로, 청구값을 넣기 전까지는 계산값이 기준이다.
   * 넣는 순간 청구액이 기준을 넘겨받는다.
   */
  basisKrw: number | null
  /** 위 기준이 계산값인가 (= 아직 청구값을 넣지 않았다) */
  basisIsCalc: boolean
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
  bucket: PaymentBucket
  /** 배분이 사람 손을 거치지 않은 건이 섞여 있는가 */
  needsConfirm: boolean
  /** 일부만 내고 30일 넘게 멈춰 있는가 */
  stalled: boolean
  /** 최종정산(클로징) 확정액. 아직 클로징 전이면 null */
  closingBilledKrw: number | null
  closingPaidKrw: number
  closingBalanceKrw: number
  closingInstallments: Installment[]
  /** 금액 차이의 사유 — 사람이 적는다 (interim_settlements.notes) */
  note: string | null
  /** 메모를 저장할 중간정산 행. 정산이 아직 없으면 null */
  interimSettlementId: string | null
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

/**
 * 앞으로 한 달에 얼마씩 나가는가 — 담당자 요청(2026-09-05).
 *
 * 「지급 중(36차)이나 지급일이 돌아오지 않은 건은 미수로 잡지 않는 것이 좋아보입니다.
 *   대신 각 월별 결제 예정금액을 한 3-4개월 정도 알 수 있도록.」
 *
 * 기일이 아직 오지 않은 돈은 **못 받은 돈이 아니라 받을 예정인 돈**이다.
 * 미지급금과 한 칸에 합치면 지금처럼 잔액의 76%가 「아직 낼 때가 아닌 돈」으로 채워진다.
 */
export interface MonthlyDue {
  /** 'YYYY-MM' */
  month: string
  /** 이미 청구된 차수의 남은 금액 */
  billedKrw: number
  /** 아직 청구 전이라 계산값으로 잡은 예상액 */
  plannedKrw: number
  totalKrw: number
  rounds: {
    transactionId: string
    roundNo: number | null
    roundLabel: string
    dueDate: string
    /** 아직 나가야 할 금액 */
    krw: number
    /** 그 달에 나갈 총액. krw 와 다르면 일부가 이미 나갔다는 뜻 */
    basisKrw: number
    /** 청구값을 아직 안 넣어 계산값으로 잡은 금액인가 */
    planned: boolean
    /** 기일이 지났는가 */
    pastDue: boolean
    /**
     * 유예(7일)까지 넘겼는가. 여기서만 빨강이 붙는다 —
     * 영업일 3~4일 차이로 늦는 것은 연체가 아니라 일정이다.
     */
    pastGrace: boolean
  }[]
}

export interface PaymentSummary {
  billedKrw: number
  paidKrw: number
  /** 청구 잔액 전체 — 기일 경과분과 미도래분을 합친 값이다. 화면에서 한 칸에 쓰지 않는다 */
  balanceKrw: number
  /** 기일이 달을 넘긴 미지급 — 지체상금 대상이다 */
  overdueKrw: number
  overdueCount: number
  maxDelayDays: number
  /** 기일이 이번 달인 미지급 — 지급이 도는 중이라 연체로 세지 않는다 */
  inProgressKrw: number
  inProgressCount: number
  /** 35차까지의 남은 금액 — 연체가 아니라 정산이 끝난 구간의 차이다 */
  settledGapKrw: number
  settledGapCount: number
  /** 청구액보다 많이 나간 금액 (양수로 담는다) */
  overpaidKrw: number
  overpaidCount: number
  /** 기일이 아직 오지 않은 미지급 — 미지급금과 섞지 않는다 */
  notDueKrw: number
  notDueCount: number
  /** 이번 달부터 4개월치 결제 예정 */
  monthlyDue: MonthlyDue[]
  /** 그 4개월 밖의 예정액 */
  laterKrw: number
  laterCount: number
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
  /** 중간·최종·지체상금 한 줄 요약. 첫 화면이 「얼마 남았나」를 구분별로 답한다 */
  byKind: KindTotals[]
}

export interface KindTotals {
  kind: 'interim' | 'closing' | 'penalty'
  label: string
  href: string
  billedKrw: number
  paidKrw: number
  balanceKrw: number
  /** 잔액이 남은 차수 수 */
  openCount: number
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

/**
 * 남은 금액이 어느 칸에 들어가는가. 넷은 겹치지 않고, 합하면 전체 잔액이 된다.
 *
 * 「이번 달 기일」과 「달을 넘긴 기일」을 가르는 것이 핵심이다 —
 * 담당자는 달이 넘어간 것만 연체로 보고 지체상금으로 옮긴다.
 */
export function bucketOf(
  r: { roundNo: number | null; balanceKrw: number; basisKrw: number | null; dueDate: string | null },
  today: string,
): PaymentBucket {
  if (r.basisKrw == null) return 'none'
  if (Math.abs(r.balanceKrw) < PAID_TOLERANCE_KRW) return 'none'
  if (r.balanceKrw < 0) return 'overpaid'
  if (r.roundNo != null && r.roundNo <= SETTLED_THROUGH_ROUND) return 'settled_gap'
  if (r.dueDate == null) return 'not_due'

  const thisMonth = today.slice(0, 7)
  const dueMonth = r.dueDate.slice(0, 7)
  if (dueMonth < thisMonth) return 'overdue'
  if (dueMonth === thisMonth) return 'in_progress'
  return 'not_due'
}

/** 'YYYY-MM' 에 n 개월을 더한다. */
function addMonths(ym: string, n: number): string {
  const total = Number(ym.slice(0, 4)) * 12 + (Number(ym.slice(5, 7)) - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/**
 * 이번 달부터 4개월치 결제 예정.
 *
 * **이번 달 안에서 기일이 지난 것도 넣는다** (담당자 2026-09-10:
 * 「날자 지난 것도 넣어주시고 일정 기간 이상 지나갔는데 지급 다 안 된 건은 빨간색 표시」).
 * 빼 두면 기일이 오늘을 지나는 순간 그 달 표에서 사라져, 아직 나가야 할 돈이 화면에서 없어진다.
 *
 * 35차까지의 남은 금액은 넣지 않는다 — 그건 결제 예정이 아니라 지급금 차이다.
 * 아직 청구값을 안 넣은 차수는 계산값으로 잡되 「예상」임을 행마다 들고 간다.
 */
function buildSchedule(rows: PaymentRow[], today: string) {
  const months = Array.from({ length: 4 }, (_, i) => addMonths(today.slice(0, 7), i))
  const byMonth = new Map<string, MonthlyDue>(
    months.map((m) => [m, { month: m, billedKrw: 0, plannedKrw: 0, totalKrw: 0, rounds: [] }]),
  )
  let laterKrw = 0
  let laterCount = 0

  for (const r of rows) {
    if (r.dueDate == null) continue
    // 35차까지의 남은 금액은 예정이 아니라 지급금 차이다 — KPI 가 따로 센다.
    if (r.roundNo != null && r.roundNo <= SETTLED_THROUGH_ROUND) continue

    const planned = r.basisIsCalc
    const krw = r.balanceKrw
    if (krw < PAID_TOLERANCE_KRW) continue

    const bucket = byMonth.get(r.dueDate.slice(0, 7))
    if (!bucket) {
      // 이번 달보다 앞선 기일은 예정이 아니다 — 연체 칸이 받는다.
      if (r.dueDate.slice(0, 7) > months[0]) {
        laterKrw += krw
        laterCount += 1
      }
      continue
    }
    if (planned) bucket.plannedKrw += krw
    else bucket.billedKrw += krw
    bucket.totalKrw += krw
    bucket.rounds.push({
      transactionId: r.transactionId,
      roundNo: r.roundNo,
      roundLabel: r.roundLabel,
      dueDate: r.dueDate,
      krw,
      basisKrw: r.basisKrw ?? krw,
      planned,
      pastDue: r.dueDate < today,
      pastGrace: daysBetween(r.dueDate, today) > DUE_GRACE_DAYS,
    })
  }

  for (const b of byMonth.values()) b.rounds.sort((a, c) => a.dueDate.localeCompare(c.dueDate))
  return { monthlyDue: months.map((m) => byMonth.get(m)!), laterKrw, laterCount }
}

export async function loadPaymentsData(supabase: SupabaseClient, today: string) {
  const [
    { data: txRows },
    { data: interimRows },
    { data: closingRows },
    { data: statusRows },
    { data: unallocRows },
    { data: holidayRows },
    { data: penaltyRows },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, round_no, round_label, import_amount_usd, lc_open_date, payment_due_date')
      .order('round_no', { ascending: false }),
    supabase
      .from('interim_settlements')
      .select('id, transaction_id, invoiced_amount_krw, confirmed_amount_krw, notes'),
    supabase
      .from('closing_settlements')
      .select('transaction_id, confirmed_amount_krw'),
    supabase.from('v_settlement_payment_status').select('*'),
    supabase
      .from('v_payment_unallocated')
      .select('id, paid_at, direction, amount_krw, unallocated_krw, bank_memo, unconfirmed_count')
      .order('paid_at', { ascending: false }),
    supabase.from('holidays').select('date'),
    // 지체상금은 산식이 없어 적힌 금액이 곧 청구액이다 (037).
    supabase.from('settlement_penalties').select('transaction_id, amount_krw'),
  ])

  const holidays = new Set((holidayRows ?? []).map((h: { date: string }) => h.date))

  // 청구액과 확정값을 나란히 들고 간다 — 잔액은 실제 청구액으로 내고,
  // 확정값과의 차이는 「검산 차이」로 따로 보여준다. 둘을 섞으면 미지급처럼 보인다.
  const invoicedOf = new Map<string, number>()
  const confirmedOf = new Map<string, number>()
  // 메모는 차수마다 하나뿐이라 중간정산 행에 붙여 둔다 — 정산 비교 화면이 쓰는 곳과 같다.
  // 두 화면이 다른 곳에 적으면 같은 차수에 사유가 둘 생긴다.
  const noteOf = new Map<string, string | null>()
  const interimIdOf = new Map<string, string>()
  for (const r of (interimRows ?? []) as {
    id: string; transaction_id: string
    invoiced_amount_krw: number | null; confirmed_amount_krw: number | null; notes: string | null
  }[]) {
    if (r.invoiced_amount_krw != null) invoicedOf.set(r.transaction_id, Number(r.invoiced_amount_krw))
    if (r.confirmed_amount_krw != null) confirmedOf.set(r.transaction_id, Number(r.confirmed_amount_krw))
    interimIdOf.set(r.transaction_id, r.id)
    noteOf.set(r.transaction_id, r.notes)
  }
  const closingBilledOf = new Map<string, number>()
  for (const r of (closingRows ?? []) as { transaction_id: string; confirmed_amount_krw: number | null }[]) {
    if (r.confirmed_amount_krw != null) closingBilledOf.set(r.transaction_id, Number(r.confirmed_amount_krw))
  }

  const status = new Map<string, StatusRow>()
  const closingStatus = new Map<string, StatusRow>()
  const penaltyStatus = new Map<string, StatusRow>()
  for (const s of (statusRows ?? []) as StatusRow[]) {
    if (s.kind === 'interim') status.set(s.transaction_id, s)
    else if (s.kind === 'closing') closingStatus.set(s.transaction_id, s)
    else if (s.kind === 'penalty') penaltyStatus.set(s.transaction_id, s)
  }

  // 한 차수에 지체상금이 여러 건일 수 있어 차수 단위로 합친다.
  const penaltyOf = new Map<string, number>()
  for (const r of (penaltyRows ?? []) as { transaction_id: string; amount_krw: number | string }[]) {
    penaltyOf.set(r.transaction_id, (penaltyOf.get(r.transaction_id) ?? 0) + num(r.amount_krw))
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
    // 청구값이 없으면 계산값으로 센다. 없다고 0으로 두면 36차 이후가 통째로 화면에서 사라진다.
    const basisKrw = billedKrw ?? confirmedKrw
    const balanceKrw = basisKrw == null ? 0 : basisKrw - paidKrw
    const settled = basisKrw != null && Math.abs(balanceKrw) < PAID_TOLERANCE_KRW

    // 완납이면 「마지막 지급이 기일보다 며칠 늦었나」, 미납이면 「기일에서 며칠 지났나」.
    const delayDays = dueDate == null
      ? null
      : settled && s?.last_paid_at
        ? daysBetween(dueDate, s.last_paid_at)
        : daysBetween(dueDate, today)

    let state: PaymentState
    if (basisKrw == null) state = 'unbilled'
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
      basisKrw,
      basisIsCalc: billedKrw == null && confirmedKrw != null,
      calcDiffKrw: billedKrw != null && confirmedKrw != null ? billedKrw - confirmedKrw : null,
      plannedKrw: billedKrw == null ? confirmedKrw : null,
      paidKrw,
      balanceKrw,
      installments,
      dueDate,
      dueIsExplicit: t.payment_due_date != null,
      delayDays,
      state,
      bucket: bucketOf({ roundNo: t.round_no, balanceKrw, basisKrw, dueDate }, today),
      needsConfirm: s ? !s.all_confirmed : false,
      stalled,
      closingBilledKrw,
      closingPaidKrw,
      closingBalanceKrw: closingBilledKrw == null ? 0 : closingBilledKrw - closingPaidKrw,
      closingInstallments,
      note: noteOf.get(t.id) ?? null,
      interimSettlementId: interimIdOf.get(t.id) ?? null,
    }
  })

  // ── 정렬: 차수 내림차순. 최근 차수가 위, 1차가 맨 아래 ──
  // 상태순으로 섞으면 「43차 다음이 19차」가 되어 차수를 눈으로 좇을 수 없다.
  // 손댈 것은 상단 알림과 필터가 잡아 준다.
  rows.sort((a, b) => (b.roundNo ?? 0) - (a.roundNo ?? 0))

  // ── 요약 ──
  const billedRows = rows.filter((r) => r.billedKrw != null)
  const inBucket = (b: PaymentBucket) => rows.filter((r) => r.bucket === b)
  const overdue = inBucket('overdue')
  const inProgress = inBucket('in_progress')
  const settledGap = inBucket('settled_gap')
  const notDue = inBucket('not_due')
  const overpaid = inBucket('overpaid')
  const upcoming = notDue
    .filter((r) => r.dueDate != null)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))

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

  const schedule = buildSchedule(rows, today)

  const planned = rows.filter((r) => r.plannedKrw != null)
  const calcDiff = rows.filter((r) => r.calcDiffKrw != null && Math.abs(r.calcDiffKrw) >= PAID_TOLERANCE_KRW)

  // ── 구분별 한 줄 요약 ──
  // 첫 화면은 「얼마 언제」만 답한다. 청구가 계산과 맞는지는 /settlements/* 가 답한다.
  function totals(
    kind: 'interim' | 'closing' | 'penalty',
    label: string,
    billedOf: Map<string, number>,
    statusOf: Map<string, StatusRow>,
  ): KindTotals {
    let billedKrw = 0, paidKrw = 0, balanceKrw = 0, openCount = 0
    for (const [txId, billed] of billedOf) {
      const paid = num(statusOf.get(txId)?.paid_krw)
      const bal = billed - paid
      billedKrw += billed
      paidKrw += paid
      balanceKrw += bal
      if (Math.abs(bal) >= PAID_TOLERANCE_KRW) openCount += 1
    }
    return { kind, label, href: `/settlements/${kind}`, billedKrw, paidKrw, balanceKrw, openCount }
  }

  const byKind: KindTotals[] = [
    totals('interim', '중간정산', invoicedOf, status),
    totals('closing', '최종정산', closingBilledOf, closingStatus),
    totals('penalty', '지체상금', penaltyOf, penaltyStatus),
  ]

  const summary: PaymentSummary = {
    billedKrw: billedRows.reduce((s, r) => s + (r.billedKrw ?? 0), 0),
    paidKrw: rows.reduce((s, r) => s + r.paidKrw, 0),
    balanceKrw: rows.reduce((s, r) => s + r.balanceKrw, 0),
    overdueKrw: overdue.reduce((s, r) => s + r.balanceKrw, 0),
    overdueCount: overdue.length,
    maxDelayDays: overdue.reduce((m, r) => Math.max(m, r.delayDays ?? 0), 0),
    inProgressKrw: inProgress.reduce((s, r) => s + r.balanceKrw, 0),
    inProgressCount: inProgress.length,
    settledGapKrw: settledGap.reduce((s, r) => s + r.balanceKrw, 0),
    settledGapCount: settledGap.length,
    overpaidKrw: -overpaid.reduce((s, r) => s + r.balanceKrw, 0),
    overpaidCount: overpaid.length,
    notDueKrw: notDue.reduce((s, r) => s + r.balanceKrw, 0),
    notDueCount: notDue.length,
    ...schedule,
    nextDue: upcoming[0] ?? null,
    lastPayment,
    plannedKrw: planned.reduce((s, r) => s + (r.plannedKrw ?? 0), 0),
    plannedCount: planned.length,
    calcDiffCount: calcDiff.length,
    calcDiffKrw: calcDiff.reduce((s, r) => s + (r.calcDiffKrw ?? 0), 0),
    closingBalanceKrw,
    closingOpenCount,
    byKind,
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
  // 청구액도 계산값도 없는데 돈이 나간 차수. 잔액을 낼 근거가 없어 대사가 불가능하다.
  // 계산값이라도 있으면 그걸로 세므로 알림에 올리지 않는다 — 36차 이후가 여기 걸리면 안 된다.
  const billedMissing = rows.filter((r) => r.basisKrw == null && r.paidKrw !== 0)
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
