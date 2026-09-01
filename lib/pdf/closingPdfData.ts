import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClosingPdfData } from '@/lib/pdf/ClosingPdfTemplate'
import { calculateClosing, type RoundingPolicy } from '@/lib/calculations/closing'
import { normalizeOne } from '@/lib/utils/normalize'
import { aggregateForwardingQuotes } from '@/lib/utils/forwarding'
import { fetchInterimSettlement, fetchInterimCostItems, fetchForwardingQuotes } from '@/lib/data/queries'

/** 최종정산 PDF 한 장에 들어갈 값 전부. 정산이 없으면 null. */
export async function buildClosingPdfData(
  supabase: SupabaseClient,
  settlementId: string,
): Promise<{ data: ClosingPdfData; roundLabel: string; issuedAt: string } | null> {
  const { data: closing, error } = await supabase
    .from('closing_settlements')
    .select(`
      *,
      transactions (
        round_label,
        import_amount_usd,
        customs_exchange_rate,
        manufacturers (name)
      ),
      lc_fee_items (
        item_name,
        amount_krw,
        sort_order
      ),
      closing_cost_items (
        item_name,
        amount_krw,
        includes_vat,
        sort_order
      )
    `)
    .eq('id', settlementId)
    .single()

  if (error || !closing) return null

  const transactionId = closing.transaction_id as string

  const [{ data: txItems }, interimSettlement, fwdRows] = await Promise.all([
    supabase.from('transaction_items')
      .select('spec, color, size, unit_price_usd, quantity, unit, sort_order')
      .eq('transaction_id', transactionId)
      .order('sort_order'),
    fetchInterimSettlement(supabase, transactionId),
    fetchForwardingQuotes(supabase, transactionId),
  ])

  const rawInterimCostItems = interimSettlement?.id
    ? await fetchInterimCostItems(supabase, interimSettlement.id)
    : []
  const interimCostItems = rawInterimCostItems.map((c) => ({
    item_name: String(c.item_name ?? ''),
    amount_krw: Number(c.amount_krw) || 0,
    vat_amount_krw: Number(c.vat_amount_krw) || 0,
    group_type: String(c.group_type ?? ''),
  }))

  const t = normalizeOne(closing.transactions as {
    round_label: string; import_amount_usd: number | null
    customs_exchange_rate: number | null
    manufacturers: { name: string } | { name: string }[] | null
  } | {
    round_label: string; import_amount_usd: number | null
    customs_exchange_rate: number | null
    manufacturers: { name: string } | { name: string }[] | null
  }[] | null)

  const mfr = normalizeOne(t?.manufacturers as { name: string } | { name: string }[] | null)

  const rawFeeItems = Array.isArray(closing.lc_fee_items) ? closing.lc_fee_items : []
  const sortedFeeItems = [...rawFeeItems].sort((a, b) =>
    ((a as { sort_order?: number }).sort_order ?? 0) - ((b as { sort_order?: number }).sort_order ?? 0)
  )

  const rawCostItems = Array.isArray(closing.closing_cost_items) ? closing.closing_cost_items : []
  const sortedCostItems = [...rawCostItems].sort((a, b) =>
    ((a as { sort_order?: number }).sort_order ?? 0) - ((b as { sort_order?: number }).sort_order ?? 0)
  )

  const lcFeeItemsCalc = sortedFeeItems.map((f) => ({
    amountKrw: Number((f as { amount_krw: number }).amount_krw) || 0,
  }))

  const closingCostItemsCalc = sortedCostItems.map((c) => ({
    amountKrw: Number((c as { amount_krw: number }).amount_krw) || 0,
  }))

  const calc = calculateClosing({
    lcPaymentTotalKrw: Number(closing.lc_payment_total_krw) || 0,
    importAmountUsd: Number(t?.import_amount_usd) || 0,
    customsExchangeRate: Number(t?.customs_exchange_rate) || 0,
    lcFeeItems: lcFeeItemsCalc,
    fxBurdenA1Pct: (closing.fx_burden_a1_pct as number) ?? 100,
    closingCostItems: closingCostItemsCalc,
    roundingPolicy: (closing.rounding_policy as 'floor_100' | 'floor_10' | 'none') ?? 'floor_100',
    interimConfirmedKrw: interimSettlement?.confirmed_amount_krw
      ? Number(interimSettlement.confirmed_amount_krw)
      : 0,
    // 확정된 정산은 저장된 방식대로 발행한다
    vatMode: closing.vat_mode === 'inclusive' ? 'inclusive' : 'exclusive',
  })

  const now = new Date()
  const issuedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const confirmedKrw = Number(closing.confirmed_amount_krw) || 0
  const directionLabel = confirmedKrw > 0
    ? '한국에이원 → 토에이산교 지급'
    : confirmedKrw < 0
    ? '토에이산교 → 한국에이원 지급'
    : '정산 없음 (상계)'

  const vatAmountKrw = interimCostItems.reduce((sum, c) => {
    const item = c as { vat_amount_krw?: unknown }
    return sum + (item.vat_amount_krw ? Number(item.vat_amount_krw) : 0)
  }, 0)

  const pdfData: ClosingPdfData = {
    roundLabel: t?.round_label ?? '-',
    manufacturerName: (mfr as { name: string } | null)?.name ?? '-',
    customsExchangeRate: Number(t?.customs_exchange_rate) || 0,
    bokExchangeRate: closing.bok_exchange_rate != null ? Number(closing.bok_exchange_rate) : null,
    importAmountUsd: Number(t?.import_amount_usd) || 0,
    vatAmountKrw,
    closingDate: (closing.closing_date as string | null) ?? null,
    lcPaymentTotalKrw: Number(closing.lc_payment_total_krw) || 0,
    lcPaymentTotalUsd: closing.lc_payment_total_usd != null ? Number(closing.lc_payment_total_usd) : null,
    advancePaymentUsd: closing.advance_payment_usd != null ? Number(closing.advance_payment_usd) : null,
    advanceExchangeRate: closing.advance_exchange_rate != null ? Number(closing.advance_exchange_rate) : null,
    roundingPolicy: (closing.rounding_policy as RoundingPolicy) ?? 'floor_100',
    importAmountKrw: calc.importAmountKrw,
    fxGainLossKrw: calc.fxGainLossKrw,
    lcFeeItems: sortedFeeItems.map((f) => ({
      itemName: (f as { item_name: string }).item_name,
      amountKrw: Number((f as { amount_krw: number }).amount_krw) || 0,
    })),
    lcFeeTotalKrw: calc.lcFeeTotalKrw,
    additionalCostKrw: calc.additionalCostKrw,
    fxBurdenA1Pct: (closing.fx_burden_a1_pct as number) ?? 100,
    a1BurdenKrw: calc.a1BurdenKrw,
    a1BurdenWithVatKrw: calc.a1BurdenWithVatKrw,
    vatMode: calc.vatMode,
    supplyAmountKrw: calc.supplyAmountKrw,
    outputVatKrw: calc.vatKrw,
    closingCostItems: sortedCostItems.map((c) => ({
      itemName: (c as { item_name: string }).item_name,
      amountKrw: Number((c as { amount_krw: number }).amount_krw) || 0,
    })),
    closingCostsTotalKrw: calc.closingCostsTotalKrw,
    a1ClosingCostsKrw: calc.a1ClosingCostsKrw,
    confirmedAmountKrw: confirmedKrw,
    directionLabel,
    isPaid: (closing.is_paid as boolean) ?? false,
    issuedAt,
    items: (txItems ?? []).map((item) => ({
      spec: String(item.spec ?? ''),
      color: String(item.color ?? ''),
      size: String(item.size ?? ''),
      unitPriceUsd: Number(item.unit_price_usd) || 0,
      quantity: Number(item.quantity) || 0,
      unit: String(item.unit ?? ''),
    })),
    interimRate: interimSettlement?.customs_exchange_rate
      ? Number(interimSettlement.customs_exchange_rate)
      : null,
    interimConfirmedKrw: interimSettlement?.confirmed_amount_krw
      ? Number(interimSettlement.confirmed_amount_krw)
      : null,
    grandTotalKrw: interimSettlement?.confirmed_amount_krw != null
      ? calc.grandTotalKrw
      : null,
    shippingItems: interimCostItems
      .filter((c) => c.group_type === 'shipping')
      .map((c) => ({ itemName: c.item_name, amountKrw: c.amount_krw })),
    customsItems: interimCostItems
      .filter((c) => c.group_type !== 'shipping')
      .map((c) => ({ itemName: c.item_name, amountKrw: c.amount_krw })),
    customsDetailItems: interimCostItems
      .filter((c) => c.group_type === 'customs')
      .map((c) => ({ itemName: c.item_name, amountKrw: c.amount_krw })),
    forwardingQuotes: aggregateForwardingQuotes(fwdRows).map(q => ({
      itemName: q.forwarderName,
      quoteAmountKrw: q.quoteAmountKrw || null,
      actualAmountKrw: q.actualAmountKrw || null,
    })),
  }

  return { data: pdfData, roundLabel: t?.round_label ?? 'settlement', issuedAt }
}
