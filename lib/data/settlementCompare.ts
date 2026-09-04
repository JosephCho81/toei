import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateInterim, type CostItem, type RoundingPolicy, type VatMode } from '@/lib/calculations/interim'
import { calculateClosing } from '@/lib/calculations/closing'
import { computeSettlementSchedule } from '@/lib/calculations/schedule'
import { PAID_TOLERANCE_KRW, type Installment } from '@/lib/data/payments'

/**
 * 청구값 · 계산값 · 지불값을 한 행에 세운다.
 *
 * 담당자 요청(2026-09-04):
 *   「실제 청구값과 지불상황 / 계산상 정확한 청구값과 지불상황 /
 *    실제 청구값과 계산상 청구값의 차이 / 미정산 금액 및 지불 예정금액」
 *
 * 금액이 셋인데 지금까지 어느 화면도 셋을 나란히 놓지 않았다 —
 * 지급 현황은 청구↔지급을, 검증 리포트는 확정↔재계산을 봤다.
 * 그래서 「덜 청구된 것」과 「덜 계산된 것」이 구분되지 않았다.
 *
 *   invoiced  실제로 청구서에 적어 보낸 금액 (사실)
 *   confirmed 담당자가 확정한 금액 (판단)
 *   calc      시스템 재계산값 (규약)
 *
 * calc 는 **저장하지 않는다.** 저장하면 규약이 바뀐 순간 화면이 옛 규약을 말한다.
 *
 * 2026-09-05 추가 — 담당자 양식(`_source_docs/양식 예시.xlsx`) 반영:
 * 차이가 **둘이 아니라 셋**이다. 「청구−계산」(청구서가 틀린 금액)과
 * 「청구−지급」(아직 안 낸 금액)만 있었고 **「계산−지급」이 없었다.**
 * 담당자 수기검산의 「청구 기준 68만 더 지급 / 계산 기준으로는 덜 지급」이
 * 바로 이 셋째 값이라, 없으면 화면에서 그 문장을 만들 수 없다.
 */

export type SettlementKind = 'interim' | 'closing' | 'penalty'

export const KIND_LABEL: Record<SettlementKind, string> = {
  interim: '중간정산',
  closing: '최종정산',
  penalty: '지체상금',
}

/** 메모를 어디에 쓰는가. 구분마다 테이블도 컬럼명도 다르다. */
export interface NoteTarget {
  table: 'interim_settlements' | 'closing_settlements' | 'settlement_penalties'
  column: 'notes' | 'note'
  id: string
}

export interface CompareRow {
  transactionId: string
  roundNo: number | null
  roundLabel: string
  /** P/O No. — 토에이 자료와 대조할 때 차수보다 이걸 먼저 찾는다 */
  orderNo: string | null
  kind: SettlementKind

  /** 실제 청구액. 아직 청구 전이면 null */
  invoicedKrw: number | null
  /** 담당자 확정금액. 없으면 null */
  confirmedKrw: number | null
  /** 시스템 재계산값. 재계산에 필요한 값이 없으면 null */
  calcKrw: number | null

  /** 청구 − 계산. 음수면 덜 청구한 것이다 */
  billVsCalcKrw: number | null
  /** 확정 − 계산. 검산 차이 */
  confirmVsCalcKrw: number | null
  /**
   * 계산 − 지급. **청구가 맞았다면 아직 안 받았을 금액**이다.
   * 구방식(inclusive)이거나 재계산이 안 되면 null — 지어내지 않는다.
   */
  calcVsPaidKrw: number | null

  paidKrw: number
  installments: Installment[]
  /** 청구액 기준 잔액. 청구 전이면 null */
  balanceKrw: number | null

  dueDate: string | null
  /** 기일 연도 — 연도별 소계를 내는 기준. 기일이 없으면 null */
  dueYear: number | null
  /** 마지막으로 실제 돈이 오간 날. 기일과 나란히 놓으면 며칠 늦었는지 보인다 */
  lastPaidAt: string | null
  /** 이 차수의 지급이 다른 차수와 한 이체로 묶여 있으면 그 차수들 */
  mergedWithRounds: number[]

  /** 구방식(inclusive) 정산 — 재계산과 직접 비교할 수 없다 */
  legacyVatMode: boolean
  /** 차이가 왜 났는지 담당자가 적어 두는 자리 */
  note: string | null
  noteTarget: NoteTarget | null
  /** 지체상금만: 무엇 때문에 물렸나 */
  reason?: string
  incurredOn?: string
}

/**
 * 한 묶음(전체·연도·선택)의 합계.
 *
 * 표의 소계·총계·선택 합계가 **전부 이 함수 하나를 쓴다** — 세 곳에서 따로 더하면
 * 반올림·제외 규칙이 갈라져 같은 화면 안에서 숫자가 어긋난다.
 */
export interface CompareTotals {
  rowCount: number
  invoicedKrw: number
  /** 계산 비교가 가능한 행만 더한 계산 누계 */
  calcKrw: number
  paidKrw: number
  billVsCalcKrw: number
  balanceKrw: number
  calcVsPaidKrw: number
  /** 계산 비교에서 뺀 행 수 (구방식이거나 재계산 불가) */
  excludedCount: number
}

export interface CompareSummary extends CompareTotals {
  /**
   * **기일이 지난 것만** 센 미지급금 — 지급 현황 화면의 「미지급금」과 같은 뜻이다.
   *
   * 담당자 2026-09-05: 「지급 중(36차)이나 지급일이 돌아오지 않은건 미수로 잡지 않는 것이
   * 좋아보입니다.」 전체 잔액으로 두면 6.6억 중 5.1억이 아직 낼 때가 아닌 돈이라
   * 숫자가 겁만 주고 쓸모가 없다. 두 화면이 같은 말에 다른 수를 담지 않게 여기서도 가른다.
   */
  overdueBalanceKrw: number
  overdueCalcVsPaidKrw: number
  overdueCount: number
  /** 기일이 아직 오지 않은 미지급 (청구액 기준) */
  notDueBalanceKrw: number
  /** 아직 청구하지 않은 차수의 계산값 — 앞으로 청구할 금액 */
  plannedCalcKrw: number
  /** 덜 청구한 차수와 금액 */
  underBilledCount: number
  underBilledKrw: number
  overBilledCount: number
  overBilledKrw: number
  /** 아직 청구하지 않은 차수 */
  unbilledCount: number
  billedCount: number
  /** 구방식(inclusive) — 계산값과 직접 비교할 수 없는 건수 */
  legacyCount: number
}

function num(v: number | string | null | undefined): number {
  return v == null ? 0 : Number(v)
}

function nullableNum(v: number | string | null | undefined): number | null {
  return v == null ? null : Number(v)
}

type Tx = {
  id: string
  round_no: number | null
  round_label: string
  order_no: string | null
  import_amount_usd: number | string | null
  margin_rate_pct: number | string | null
  lc_open_date: string | null
  payment_due_date: string | null
}

type StatusRow = {
  transaction_id: string
  kind: string
  paid_krw: number | string
  installments: {
    payment_id: string; paid_at: string; amount: number | string
    direction: 'out' | 'in'; confirmed: boolean
  }[]
}

function toInstallments(s: StatusRow | undefined): Installment[] {
  return (s?.installments ?? []).map((i) => ({
    paymentId: i.payment_id,
    paidAt: i.paid_at,
    amountKrw: num(i.amount),
    direction: i.direction,
    confirmed: i.confirmed,
  }))
}

/** 재계산이 규약과 직접 비교 가능한가. 구방식은 부가세가 섞여 있어 비교 자체가 성립하지 않는다. */
function isLegacy(vatMode: string | null | undefined): boolean {
  return vatMode === 'inclusive'
}

/** 이 행의 계산값을 지급액과 비교해도 되는가. */
function isComparable(r: CompareRow): boolean {
  return !r.legacyVatMode && r.calcKrw != null
}

export function aggregate(rows: CompareRow[]): CompareTotals {
  const billed = rows.filter((r) => r.invoicedKrw != null)
  // 계산 비교는 **청구된 차수만** 센다. 청구 전 차수를 넣으면 「아직 청구도 안 한 돈」이
  // 미지급으로 잡혀 40·41·43차만으로 5억이 얹힌다.
  const cmp = billed.filter(isComparable)
  return {
    rowCount: rows.length,
    invoicedKrw: billed.reduce((s, r) => s + (r.invoicedKrw ?? 0), 0),
    calcKrw: cmp.reduce((s, r) => s + (r.calcKrw ?? 0), 0),
    paidKrw: rows.reduce((s, r) => s + r.paidKrw, 0),
    billVsCalcKrw: cmp.reduce((s, r) => s + (r.billVsCalcKrw ?? 0), 0),
    balanceKrw: billed.reduce((s, r) => s + (r.balanceKrw ?? 0), 0),
    calcVsPaidKrw: cmp.reduce((s, r) => s + (r.calcVsPaidKrw ?? 0), 0),
    excludedCount: billed.length - cmp.length,
  }
}

/**
 * 읽기 실패를 삼키지 않는다.
 *
 * `const { data } = await …` 로 오류를 버리면 마이그레이션이 안 올라간 상태에서
 * 화면이 「정산이 하나도 없습니다」라고 조용히 거짓말한다. 44개 차수가 사라진 화면과
 * 진짜로 비어 있는 화면을 사람이 구분할 수 없다 — 그래서 메시지를 그대로 올려 보낸다.
 */
export async function loadSettlementCompare(
  supabase: SupabaseClient,
  kind: SettlementKind,
  today: string,
) {
  const [
    { data: txRows },
    { data: statusRows },
    { data: holidayRows },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, round_no, round_label, order_no, import_amount_usd, margin_rate_pct, lc_open_date, payment_due_date')
      .order('round_no', { ascending: false }),
    supabase.from('v_settlement_payment_status').select('transaction_id, kind, paid_krw, installments'),
    supabase.from('holidays').select('date'),
  ])

  const holidays = new Set((holidayRows ?? []).map((h: { date: string }) => h.date))
  const status = new Map<string, StatusRow>()
  for (const s of (statusRows ?? []) as StatusRow[]) {
    if (s.kind === kind) status.set(s.transaction_id, s)
  }

  const txs = (txRows ?? []) as Tx[]
  const txById = new Map(txs.map((t) => [t.id, t]))

  let rows: CompareRow[] = []
  let error: string | null = null
  try {
    rows =
      kind === 'interim' ? await interimRows(supabase, txById, status, holidays)
      : kind === 'closing' ? await closingRows(supabase, txById, status, holidays)
      : await penaltyRows(supabase, txById, status, holidays)
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  rows.sort((a, b) => (b.roundNo ?? 0) - (a.roundNo ?? 0) || (a.incurredOn ?? '').localeCompare(b.incurredOn ?? ''))
  markMergedPayments(rows)

  return { rows, summary: summarize(rows, today), error }
}

/**
 * 「합산지불」 — 한 번의 이체가 여러 차수에 걸친 건을 표시한다 (10~12차·18~21차).
 *
 * 담당자 양식의 E열(체크박스로 8·9·10차를 묶어 합산)이 요구하는 사실인데,
 * **원장이 이미 알고 있다** — 이체 1건에 배분이 여러 차수로 달려 있으면 묶음이다.
 * 사람이 매번 체크할 일이 아니라 자동으로 붙인다.
 */
function markMergedPayments(rows: CompareRow[]) {
  const roundsOfPayment = new Map<string, Set<number>>()
  for (const r of rows) {
    if (r.roundNo == null) continue
    for (const i of r.installments) {
      if (!i.paymentId) continue
      const set = roundsOfPayment.get(i.paymentId) ?? new Set<number>()
      set.add(r.roundNo)
      roundsOfPayment.set(i.paymentId, set)
    }
  }
  for (const r of rows) {
    const others = new Set<number>()
    for (const i of r.installments) {
      for (const rn of roundsOfPayment.get(i.paymentId) ?? []) {
        if (rn !== r.roundNo) others.add(rn)
      }
    }
    r.mergedWithRounds = [...others].sort((a, b) => a - b)
  }
}

/** PostgREST 오류를 그대로 던진다 — 컬럼이 없으면 그 사실이 화면까지 올라가야 한다. */
function orThrow<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}을(를) 읽지 못했습니다 — ${res.error.message}`)
  return (res.data ?? []) as T
}

function dueOf(
  tx: { lc_open_date: string | null; payment_due_date: string | null },
  holidays: ReadonlySet<string>,
  kind: SettlementKind,
): string | null {
  const schedule = computeSettlementSchedule(tx.lc_open_date, holidays)
  if (kind === 'closing') return schedule.closingDue
  return tx.payment_due_date ?? schedule.interimDue
}

async function interimRows(
  supabase: SupabaseClient,
  txById: Map<string, Tx>,
  status: Map<string, StatusRow>,
  holidays: ReadonlySet<string>,
): Promise<CompareRow[]> {
  const res = await supabase
    .from('interim_settlements')
    .select(
      'id, transaction_id, invoiced_amount_krw, confirmed_amount_krw, customs_exchange_rate,'
      + ' rounding_policy, vat_mode, notes,'
      + ' interim_cost_items(amount_krw, is_import_vat, is_duty, is_vat_taxable, vat_amount_krw)',
    )
  const data = orThrow(res, '중간정산')

  type Row = {
    id: string
    transaction_id: string
    invoiced_amount_krw: number | string | null
    confirmed_amount_krw: number | string | null
    customs_exchange_rate: number | string | null
    rounding_policy: string | null
    vat_mode: string | null
    notes: string | null
    interim_cost_items: {
      amount_krw: number | string | null; is_import_vat: boolean | null
      is_duty: boolean | null; is_vat_taxable: boolean | null; vat_amount_krw: number | string | null
    }[] | null
  }

  return ((data ?? []) as unknown as Row[]).flatMap((r) => {
    const tx = txById.get(r.transaction_id)
    if (!tx) return []

    const costItems: CostItem[] = (r.interim_cost_items ?? []).map((c) => ({
      amountKrw: num(c.amount_krw),
      isImportVat: Boolean(c.is_import_vat),
      isDuty: Boolean(c.is_duty),
      isVatTaxable: Boolean(c.is_vat_taxable),
      vatAmountKrw: num(c.vat_amount_krw),
    }))

    const usd = nullableNum(tx.import_amount_usd)
    const rate = nullableNum(r.customs_exchange_rate)
    const calcKrw = usd == null || rate == null ? null : calculateInterim({
      importAmountUsd: usd,
      customsExchangeRate: rate,
      marginRatePct: num(tx.margin_rate_pct),
      costItems,
      roundingPolicy: (r.rounding_policy as RoundingPolicy) ?? 'none',
      vatMode: (r.vat_mode === 'inclusive' ? 'inclusive' : 'exclusive') as VatMode,
    }).confirmedKrw

    return [build({
      tx, kind: 'interim',
      invoicedKrw: nullableNum(r.invoiced_amount_krw),
      confirmedKrw: nullableNum(r.confirmed_amount_krw),
      calcKrw,
      status: status.get(tx.id),
      dueDate: dueOf(tx, holidays, 'interim'),
      legacyVatMode: isLegacy(r.vat_mode),
      note: r.notes,
      noteTarget: { table: 'interim_settlements', column: 'notes', id: r.id },
    })]
  })
}

async function closingRows(
  supabase: SupabaseClient,
  txById: Map<string, Tx>,
  status: Map<string, StatusRow>,
  holidays: ReadonlySet<string>,
): Promise<CompareRow[]> {
  const res = await supabase
    .from('closing_settlements')
    .select(
      'id, transaction_id, invoiced_amount_krw, confirmed_amount_krw, lc_payment_total_krw,'
      + ' fx_burden_a1_pct, rounding_policy, vat_mode, notes,'
      + ' lc_fee_items(amount_krw), closing_cost_items(amount_krw)',
    )
  const data = orThrow(res, '최종정산')

  type Row = {
    id: string
    transaction_id: string
    invoiced_amount_krw: number | string | null
    confirmed_amount_krw: number | string | null
    lc_payment_total_krw: number | string | null
    fx_burden_a1_pct: number | string | null
    rounding_policy: string | null
    vat_mode: string | null
    notes: string | null
    lc_fee_items: { amount_krw: number | string | null }[] | null
    closing_cost_items: { amount_krw: number | string | null }[] | null
  }

  // 최종정산 재계산은 통관환율이 중간정산 쪽에 있어 따로 읽어야 한다.
  const { data: rateRows } = await supabase
    .from('interim_settlements')
    .select('transaction_id, customs_exchange_rate, confirmed_amount_krw')
  const rateOf = new Map<string, { rate: number | null; interimConfirmed: number }>()
  for (const r of (rateRows ?? []) as {
    transaction_id: string; customs_exchange_rate: number | string | null
    confirmed_amount_krw: number | string | null
  }[]) {
    rateOf.set(r.transaction_id, {
      rate: nullableNum(r.customs_exchange_rate),
      interimConfirmed: num(r.confirmed_amount_krw),
    })
  }

  return ((data ?? []) as unknown as Row[]).flatMap((r) => {
    const tx = txById.get(r.transaction_id)
    if (!tx) return []

    const ref = rateOf.get(r.transaction_id)
    const usd = nullableNum(tx.import_amount_usd)
    const calcKrw = usd == null || ref?.rate == null ? null : calculateClosing({
      lcPaymentTotalKrw: num(r.lc_payment_total_krw),
      importAmountUsd: usd,
      customsExchangeRate: ref.rate,
      lcFeeItems: (r.lc_fee_items ?? []).map((i) => ({ amountKrw: num(i.amount_krw) })),
      fxBurdenA1Pct: num(r.fx_burden_a1_pct),
      closingCostItems: (r.closing_cost_items ?? []).map((i) => ({ amountKrw: num(i.amount_krw) })),
      roundingPolicy: (r.rounding_policy as RoundingPolicy) ?? 'none',
      interimConfirmedKrw: ref.interimConfirmed,
      vatMode: (r.vat_mode === 'inclusive' ? 'inclusive' : 'exclusive') as VatMode,
    }).roundedFinalKrw

    return [build({
      tx, kind: 'closing',
      invoicedKrw: nullableNum(r.invoiced_amount_krw),
      confirmedKrw: nullableNum(r.confirmed_amount_krw),
      calcKrw,
      status: status.get(tx.id),
      dueDate: dueOf(tx, holidays, 'closing'),
      legacyVatMode: isLegacy(r.vat_mode),
      note: r.notes,
      noteTarget: { table: 'closing_settlements', column: 'notes', id: r.id },
    })]
  })
}

async function penaltyRows(
  supabase: SupabaseClient,
  txById: Map<string, Tx>,
  status: Map<string, StatusRow>,
  holidays: ReadonlySet<string>,
): Promise<CompareRow[]> {
  const res = await supabase
    .from('settlement_penalties')
    .select('id, transaction_id, incurred_on, reason, amount_krw, due_date, note')
    .order('incurred_on', { ascending: false })
  const data = orThrow(res, '지체상금')

  type Row = {
    id: string; transaction_id: string; incurred_on: string
    reason: string; amount_krw: number | string; due_date: string | null; note: string | null
  }

  // 지급 배분은 차수 단위라 한 차수에 지체상금이 여러 건이면 첫 행에만 붙인다.
  // 나눠 붙이면 어느 건에 얼마가 들어갔는지 시스템이 지어내게 된다.
  const seen = new Set<string>()

  return ((data ?? []) as unknown as Row[]).flatMap((r) => {
    const tx = txById.get(r.transaction_id)
    if (!tx) return []
    const first = !seen.has(r.transaction_id)
    seen.add(r.transaction_id)
    const amount = num(r.amount_krw)

    // 지체상금은 산식이 없다 — 사람이 적은 금액이 곧 청구값이자 계산값이다.
    return [{
      ...build({
        tx, kind: 'penalty',
        invoicedKrw: amount,
        confirmedKrw: amount,
        calcKrw: null,
        status: first ? status.get(tx.id) : undefined,
        dueDate: r.due_date ?? dueOf(tx, holidays, 'interim'),
        legacyVatMode: false,
        note: r.note,
        noteTarget: { table: 'settlement_penalties', column: 'note', id: r.id },
      }),
      reason: r.reason,
      incurredOn: r.incurred_on,
    }]
  })
}

function build(args: {
  tx: Tx
  kind: SettlementKind
  invoicedKrw: number | null
  confirmedKrw: number | null
  calcKrw: number | null
  status: StatusRow | undefined
  dueDate: string | null
  legacyVatMode: boolean
  note: string | null
  noteTarget: NoteTarget | null
}): CompareRow {
  const paidKrw = num(args.status?.paid_krw)
  const installments = toInstallments(args.status)
  const { invoicedKrw, confirmedKrw, calcKrw, legacyVatMode } = args
  return {
    transactionId: args.tx.id,
    roundNo: args.tx.round_no,
    roundLabel: args.tx.round_label,
    orderNo: args.tx.order_no,
    kind: args.kind,
    invoicedKrw,
    confirmedKrw,
    calcKrw,
    billVsCalcKrw: invoicedKrw != null && calcKrw != null ? invoicedKrw - calcKrw : null,
    confirmVsCalcKrw: confirmedKrw != null && calcKrw != null ? confirmedKrw - calcKrw : null,
    // 구방식은 매출부가세가 확정금액에 섞여 있어 계산값이 통째로 10% 낮다.
    // 그 값을 지급액과 빼면 6·7차 둘만으로 2,286만원짜리 가짜 미지급이 생긴다.
    calcVsPaidKrw: !legacyVatMode && calcKrw != null ? calcKrw - paidKrw : null,
    paidKrw,
    installments,
    balanceKrw: invoicedKrw == null ? null : invoicedKrw - paidKrw,
    dueDate: args.dueDate,
    dueYear: args.dueDate ? Number(args.dueDate.slice(0, 4)) : null,
    lastPaidAt: installments.reduce<string | null>(
      (last, i) => (last == null || i.paidAt > last ? i.paidAt : last), null),
    mergedWithRounds: [],
    legacyVatMode,
    note: args.note,
    noteTarget: args.noteTarget,
  }
}

function summarize(rows: CompareRow[], today: string): CompareSummary {
  // 구방식 정산은 재계산과 비교할 수 없어 「덜/더 청구」 집계에서 뺀다.
  // 넣으면 2·6·7차의 부가세 구조 차이가 3,400만원짜리 청구 오류처럼 보인다.
  const cmp = rows.filter((r) => !r.legacyVatMode && r.billVsCalcKrw != null)
  const under = cmp.filter((r) => r.billVsCalcKrw! < -PAID_TOLERANCE_KRW)
  const over = cmp.filter((r) => r.billVsCalcKrw! > PAID_TOLERANCE_KRW)
  const billed = rows.filter((r) => r.invoicedKrw != null)

  // 기일이 없는 행은 「지났다」고 말할 근거가 없다 — 경과로 세지 않는다.
  const overdue = billed.filter((r) => r.dueDate != null && r.dueDate <= today)
  const overdueTotals = aggregate(overdue)

  return {
    ...aggregate(rows),
    overdueBalanceKrw: overdueTotals.balanceKrw,
    overdueCalcVsPaidKrw: overdueTotals.calcVsPaidKrw,
    // 「기일 지난 N건」은 **아직 남은** 건수여야 한다. 기일이 지나고 완납된 차수까지 세면
    // 38건이 미지급인 것처럼 읽힌다.
    overdueCount: overdue.filter((r) => Math.abs(r.balanceKrw ?? 0) >= PAID_TOLERANCE_KRW).length,
    notDueBalanceKrw: billed
      .filter((r) => r.dueDate == null || r.dueDate > today)
      .reduce((s, r) => s + (r.balanceKrw ?? 0), 0),
    plannedCalcKrw: rows
      .filter((r) => r.invoicedKrw == null)
      .reduce((s, r) => s + (r.calcKrw ?? 0), 0),
    underBilledCount: under.length,
    underBilledKrw: -under.reduce((s, r) => s + r.billVsCalcKrw!, 0),
    overBilledCount: over.length,
    overBilledKrw: over.reduce((s, r) => s + r.billVsCalcKrw!, 0),
    unbilledCount: rows.length - billed.length,
    billedCount: billed.length,
    legacyCount: rows.filter((r) => r.legacyVatMode).length,
  }
}
