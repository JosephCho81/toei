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
 */

export type SettlementKind = 'interim' | 'closing' | 'penalty'

export const KIND_LABEL: Record<SettlementKind, string> = {
  interim: '중간정산',
  closing: '최종정산',
  penalty: '지체상금',
}

export interface CompareRow {
  transactionId: string
  roundNo: number | null
  roundLabel: string
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

  paidKrw: number
  installments: Installment[]
  /** 청구액 기준 잔액. 청구 전이면 null */
  balanceKrw: number | null

  dueDate: string | null
  /** 구방식(inclusive) 정산 — 재계산과 직접 비교할 수 없다 */
  legacyVatMode: boolean
  /** 지체상금만: 무엇 때문에 물렸나 */
  reason?: string
  incurredOn?: string
}

export interface CompareSummary {
  invoicedKrw: number
  /** **청구된 차수만** 다시 계산한 합계. 청구 누계와 같은 모집단이라야 비교가 성립한다 */
  calcKrw: number
  /** 아직 청구하지 않은 차수의 계산값 — 앞으로 청구할 금액 */
  plannedCalcKrw: number
  paidKrw: number
  /** 청구액 기준 미수금 */
  balanceKrw: number
  /** 계산값 기준 미수금 — 청구가 맞았다면 받았어야 할 잔액 */
  calcBalanceKrw: number
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
  rowCount: number
}

function num(v: number | string | null | undefined): number {
  return v == null ? 0 : Number(v)
}

function nullableNum(v: number | string | null | undefined): number | null {
  return v == null ? null : Number(v)
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
) {
  const [
    { data: txRows },
    { data: statusRows },
    { data: holidayRows },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, round_no, round_label, import_amount_usd, margin_rate_pct, lc_open_date, payment_due_date')
      .order('round_no', { ascending: false }),
    supabase.from('v_settlement_payment_status').select('transaction_id, kind, paid_krw, installments'),
    supabase.from('holidays').select('date'),
  ])

  const holidays = new Set((holidayRows ?? []).map((h: { date: string }) => h.date))
  const status = new Map<string, StatusRow>()
  for (const s of (statusRows ?? []) as StatusRow[]) {
    if (s.kind === kind) status.set(s.transaction_id, s)
  }

  type Tx = {
    id: string; round_no: number | null; round_label: string
    import_amount_usd: number | string | null
    margin_rate_pct: number | string | null
    lc_open_date: string | null; payment_due_date: string | null
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

  return { rows, summary: summarize(rows), error }
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
  txById: Map<string, { id: string; round_no: number | null; round_label: string; import_amount_usd: number | string | null; margin_rate_pct: number | string | null; lc_open_date: string | null; payment_due_date: string | null }>,
  status: Map<string, StatusRow>,
  holidays: ReadonlySet<string>,
): Promise<CompareRow[]> {
  const res = await supabase
    .from('interim_settlements')
    .select(
      'transaction_id, invoiced_amount_krw, confirmed_amount_krw, customs_exchange_rate,'
      + ' rounding_policy, vat_mode,'
      + ' interim_cost_items(amount_krw, is_import_vat, is_duty, is_vat_taxable, vat_amount_krw)',
    )
  const data = orThrow(res, '중간정산')

  type Row = {
    transaction_id: string
    invoiced_amount_krw: number | string | null
    confirmed_amount_krw: number | string | null
    customs_exchange_rate: number | string | null
    rounding_policy: string | null
    vat_mode: string | null
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
    })]
  })
}

async function closingRows(
  supabase: SupabaseClient,
  txById: Map<string, { id: string; round_no: number | null; round_label: string; import_amount_usd: number | string | null; margin_rate_pct: number | string | null; lc_open_date: string | null; payment_due_date: string | null }>,
  status: Map<string, StatusRow>,
  holidays: ReadonlySet<string>,
): Promise<CompareRow[]> {
  const res = await supabase
    .from('closing_settlements')
    .select(
      'transaction_id, invoiced_amount_krw, confirmed_amount_krw, lc_payment_total_krw,'
      + ' fx_burden_a1_pct, rounding_policy, vat_mode,'
      + ' lc_fee_items(amount_krw), closing_cost_items(amount_krw)',
    )
  const data = orThrow(res, '최종정산')

  type Row = {
    transaction_id: string
    invoiced_amount_krw: number | string | null
    confirmed_amount_krw: number | string | null
    lc_payment_total_krw: number | string | null
    fx_burden_a1_pct: number | string | null
    rounding_policy: string | null
    vat_mode: string | null
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
    })]
  })
}

async function penaltyRows(
  supabase: SupabaseClient,
  txById: Map<string, { id: string; round_no: number | null; round_label: string; import_amount_usd: number | string | null; margin_rate_pct: number | string | null; lc_open_date: string | null; payment_due_date: string | null }>,
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
      }),
      reason: r.reason,
      incurredOn: r.incurred_on,
    }]
  })
}

function build(args: {
  tx: { id: string; round_no: number | null; round_label: string }
  kind: SettlementKind
  invoicedKrw: number | null
  confirmedKrw: number | null
  calcKrw: number | null
  status: StatusRow | undefined
  dueDate: string | null
  legacyVatMode: boolean
}): CompareRow {
  const paidKrw = num(args.status?.paid_krw)
  const { invoicedKrw, confirmedKrw, calcKrw } = args
  return {
    transactionId: args.tx.id,
    roundNo: args.tx.round_no,
    roundLabel: args.tx.round_label,
    kind: args.kind,
    invoicedKrw,
    confirmedKrw,
    calcKrw,
    billVsCalcKrw: invoicedKrw != null && calcKrw != null ? invoicedKrw - calcKrw : null,
    confirmVsCalcKrw: confirmedKrw != null && calcKrw != null ? confirmedKrw - calcKrw : null,
    paidKrw,
    installments: toInstallments(args.status),
    balanceKrw: invoicedKrw == null ? null : invoicedKrw - paidKrw,
    dueDate: args.dueDate,
    legacyVatMode: args.legacyVatMode,
  }
}

function summarize(rows: CompareRow[]): CompareSummary {
  // 구방식 정산은 재계산과 비교할 수 없어 「덜/더 청구」 집계에서 뺀다.
  // 넣으면 2·6·7차의 부가세 구조 차이가 3,400만원짜리 청구 오류처럼 보인다.
  const comparable = rows.filter((r) => !r.legacyVatMode && r.billVsCalcKrw != null)
  const under = comparable.filter((r) => r.billVsCalcKrw! < -PAID_TOLERANCE_KRW)
  const over = comparable.filter((r) => r.billVsCalcKrw! > PAID_TOLERANCE_KRW)
  const billed = rows.filter((r) => r.invoicedKrw != null)

  // 계산 누계를 전 차수로 내면 안 된다 — 청구 누계는 청구된 차수만 세므로
  // 두 카드가 다른 모집단이 되어 「5억을 덜 청구했다」로 읽힌다.
  return {
    invoicedKrw: billed.reduce((s, r) => s + (r.invoicedKrw ?? 0), 0),
    calcKrw: billed.reduce((s, r) => s + (r.calcKrw ?? 0), 0),
    plannedCalcKrw: rows
      .filter((r) => r.invoicedKrw == null)
      .reduce((s, r) => s + (r.calcKrw ?? 0), 0),
    paidKrw: rows.reduce((s, r) => s + r.paidKrw, 0),
    balanceKrw: billed.reduce((s, r) => s + (r.balanceKrw ?? 0), 0),
    calcBalanceKrw: rows.reduce((s, r) => s + ((r.calcKrw ?? r.invoicedKrw ?? 0) - r.paidKrw), 0),
    underBilledCount: under.length,
    underBilledKrw: -under.reduce((s, r) => s + r.billVsCalcKrw!, 0),
    overBilledCount: over.length,
    overBilledKrw: over.reduce((s, r) => s + r.billVsCalcKrw!, 0),
    unbilledCount: rows.length - billed.length,
    billedCount: billed.length,
    legacyCount: rows.filter((r) => r.legacyVatMode).length,
    rowCount: rows.length,
  }
}
