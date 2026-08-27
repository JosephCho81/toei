import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Return type interfaces ────────────────────────────────────────────────

export interface TxRow {
  id: string
  round_no: number
  round_label: string
  order_no: string | null
  import_amount_usd: number | null
  customs_exchange_rate: number | null
  margin_rate_pct: number | null
  lc_no: string | null
  lc_open_date: string | null
  customs_date: string | null
  is_locked: boolean
  notes: string | null
  manufacturers: { name: string } | null
  [key: string]: unknown
}

export interface InterimSettlementRow {
  id: string
  transaction_id: string
  customs_exchange_rate: number | null
  confirmed_amount_krw: number | null
  /** 신방식(exclusive)에서만 채워진다 — confirmed = supply + vat */
  supply_amount_krw: number | null
  vat_amount_krw: number | null
  vat_mode: string
  rounding_policy: string
  is_locked: boolean
  is_paid: boolean
  locked_at: string | null
  updated_at: string | null
  notes: string | null
  [key: string]: unknown
}

export interface ClosingSettlementRow {
  id: string
  transaction_id: string
  closing_date: string | null
  bok_exchange_rate: number | null
  lc_payment_total_krw: number | null
  fx_burden_a1_pct: number
  rounding_policy: string
  confirmed_amount_krw: number | null
  is_locked: boolean
  is_paid: boolean
  notes: string | null
  [key: string]: unknown
}

export interface ForwardingQuoteWithItems {
  forwarder_name: string
  quote_date: string | null
  notes: string | null
  forwarding_quote_items: Array<{
    item_type: string
    amount_krw: number | string | null
  }>
}

export interface CostItemRow {
  id: string
  item_name: string
  amount_krw: number
  is_vat_taxable: boolean
  vat_amount_krw: number
  is_import_vat: boolean
  group_type: string
  sort_order: number
  [key: string]: unknown
}

export interface FeeRow {
  id: string
  item_name: string
  amount_krw: number
  sort_order: number
  [key: string]: unknown
}

// ─── Query functions ───────────────────────────────────────────────────────

export async function fetchTransactionBase(
  supabase: SupabaseClient,
  transactionId: string
): Promise<TxRow> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, manufacturers(name)')
    .eq('id', transactionId)
    .single()
  if (error || !data) throw new Error(`Transaction not found: ${transactionId}`)
  return data as unknown as TxRow
}

export async function fetchInterimSettlement(
  supabase: SupabaseClient,
  transactionId: string
): Promise<InterimSettlementRow | null> {
  const { data } = await supabase
    .from('interim_settlements')
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle()
  return data as InterimSettlementRow | null
}

export async function fetchClosingSettlement(
  supabase: SupabaseClient,
  transactionId: string
): Promise<ClosingSettlementRow | null> {
  const { data } = await supabase
    .from('closing_settlements')
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle()
  return data as ClosingSettlementRow | null
}

export async function fetchForwardingQuotes(
  supabase: SupabaseClient,
  transactionId: string
): Promise<ForwardingQuoteWithItems[]> {
  const { data } = await supabase
    .from('forwarding_quotes')
    .select('forwarder_name,quote_date,notes,forwarding_quote_items(item_type,amount_krw)')
    .eq('transaction_id', transactionId)
    .order('sort_order')
  return (data ?? []) as unknown as ForwardingQuoteWithItems[]
}

export async function fetchInterimCostItems(
  supabase: SupabaseClient,
  interimId: string
): Promise<CostItemRow[]> {
  const { data } = await supabase
    .from('interim_cost_items')
    .select('*')
    .eq('interim_settlement_id', interimId)
    .order('sort_order')
  return (data ?? []) as unknown as CostItemRow[]
}

export async function fetchClosingCostItems(
  supabase: SupabaseClient,
  closingId: string
): Promise<{ lcFees: FeeRow[]; closingCosts: CostItemRow[] }> {
  const [{ data: lcFees }, { data: closingCosts }] = await Promise.all([
    supabase
      .from('lc_fee_items')
      .select('*')
      .eq('closing_settlement_id', closingId)
      .order('sort_order'),
    supabase
      .from('closing_cost_items')
      .select('*')
      .eq('closing_settlement_id', closingId)
      .order('sort_order'),
  ])
  return {
    lcFees: (lcFees ?? []) as unknown as FeeRow[],
    closingCosts: (closingCosts ?? []) as unknown as CostItemRow[],
  }
}
