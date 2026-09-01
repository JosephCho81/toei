import type { SupabaseClient } from '@supabase/supabase-js'
import { aggregateForwardingQuotes } from '@/lib/utils/forwarding'
import { fetchTransactionBase, fetchInterimSettlement, fetchForwardingQuotes } from '@/lib/data/queries'
import { krwToUsd } from '@/lib/calculations/helpers'
import type { FeeRow } from '@/components/settlements/lcFeeDefaults'

export interface ClosingCostRow {
  id?: string
  item_name: string
  amount_krw: string
  includes_vat: boolean
}

export interface ClosingTx {
  import_amount_usd: number | null
  customs_exchange_rate: number | null
  lc_no: string | null
}

export interface InterimSummary {
  confirmed_amount_krw: number | null
  customs_exchange_rate: number | null
  is_locked: boolean
  updated_at: string | null
}

export interface ForwardingRow {
  forwarder_name: string
  quote_amount_krw: number | null
  actual_amount_krw: number | null
}

/** 저장된 클로징정산. 없으면 null — 새 정산 화면이 된다. */
export interface StoredClosing {
  id: string
  isLocked: boolean
  closingDate: string
  bokRate: string
  lcPaymentUsd: string
  advanceUsd: string
  advanceRate: string
  fxBurdenA1Pct: number
  roundingPolicy: string
  vatMode: 'inclusive' | 'exclusive'
  confirmedAmountKrw: number | null
  notes: string | null
  /** 달러 없이 원화만 저장된 과거 정산 — 계산 기준을 저장값으로 고정한다 */
  legacyLcPaymentKrw: number | null
  feeRows: FeeRow[] | null
  costRows: ClosingCostRow[] | null
}

export interface ClosingFormData {
  transaction: ClosingTx
  containerLcNumbers: string[]
  interim: InterimSummary | null
  customsDetailItems: { item_name: string; amount_krw: number }[]
  forwardingQuotes: ForwardingRow[]
  closing: StoredClosing | null
}

const str = (v: unknown) => (v != null ? String(v) : '')

export async function loadClosingForm(
  supabase: SupabaseClient,
  transactionId: string,
): Promise<ClosingFormData> {
  const [t, interim, fwdRows, { data: containers }] = await Promise.all([
    fetchTransactionBase(supabase, transactionId),
    fetchInterimSettlement(supabase, transactionId),
    fetchForwardingQuotes(supabase, transactionId),
    supabase.from('containers').select('lc_number').eq('transaction_id', transactionId),
  ])

  const customsDetailItems = interim?.id
    ? (await supabase
        .from('interim_cost_items')
        .select('item_name,amount_krw')
        .eq('interim_settlement_id', interim.id)
        .eq('group_type', 'customs')
        .order('sort_order')).data ?? []
    : []

  const { data: closing } = await supabase
    .from('closing_settlements')
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle()

  return {
    transaction: t as unknown as ClosingTx,
    containerLcNumbers: [...new Set(
      (containers ?? []).map((c) => String(c.lc_number ?? '').trim()).filter(Boolean),
    )],
    interim: (interim as unknown as InterimSummary) ?? null,
    customsDetailItems: customsDetailItems.map((c) => ({
      item_name: String(c.item_name ?? ''), amount_krw: Number(c.amount_krw) || 0,
    })),
    forwardingQuotes: aggregateForwardingQuotes(fwdRows).map((q) => ({
      forwarder_name: q.forwarderName,
      quote_amount_krw: q.quoteAmountKrw || null,
      actual_amount_krw: q.actualAmountKrw || null,
    })),
    closing: closing ? await toStoredClosing(supabase, closing) : null,
  }
}

async function toStoredClosing(
  supabase: SupabaseClient,
  closing: Record<string, unknown>,
): Promise<StoredClosing> {
  const [{ data: fees }, { data: costs }] = await Promise.all([
    supabase.from('lc_fee_items').select('*').eq('closing_settlement_id', closing.id).order('sort_order'),
    supabase.from('closing_cost_items').select('*').eq('closing_settlement_id', closing.id).order('sort_order'),
  ])

  const storedUsd = closing.lc_payment_total_usd
  const storedKrw = closing.lc_payment_total_krw
  const bokRate = Number(closing.bok_exchange_rate) || 0
  // 달러 입력 이전에 저장된 정산 — 참고용 달러를 채우되 계산 기준은 저장된 원화로 둔다
  const legacy = storedUsd == null && storedKrw != null ? Number(storedKrw) : null

  return {
    id: String(closing.id),
    isLocked: Boolean(closing.is_locked),
    closingDate: str(closing.closing_date),
    bokRate: str(closing.bok_exchange_rate),
    lcPaymentUsd: storedUsd != null
      ? String(storedUsd)
      : str(legacy != null ? krwToUsd(legacy, bokRate) : null),
    advanceUsd: str(closing.advance_payment_usd),
    advanceRate: str(closing.advance_exchange_rate),
    fxBurdenA1Pct: (closing.fx_burden_a1_pct as number) ?? 100,
    roundingPolicy: String(closing.rounding_policy),
    vatMode: closing.vat_mode === 'inclusive' ? 'inclusive' : 'exclusive',
    confirmedAmountKrw: closing.confirmed_amount_krw != null ? Number(closing.confirmed_amount_krw) : null,
    notes: (closing.notes as string | null) ?? null,
    legacyLcPaymentKrw: legacy,
    feeRows: fees?.length
      ? fees.map((f) => ({
          id: f.id,
          item_name: f.item_name,
          amount_krw: str(f.amount_krw),
          currency: f.currency === 'USD' ? ('USD' as const) : ('KRW' as const),
          amount_usd: str(f.amount_usd),
          use_custom_rate: f.exchange_rate != null,
          exchange_rate: str(f.exchange_rate),
        }))
      : null,
    costRows: costs?.length
      ? costs.map((c) => ({
          id: c.id, item_name: c.item_name,
          amount_krw: String(c.amount_krw), includes_vat: c.includes_vat,
        }))
      : null,
  }
}
