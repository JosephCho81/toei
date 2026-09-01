import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateClosing } from '@/lib/calculations/closing'
import { calcImportAmountKrw } from '@/lib/calculations/helpers'
import { aggregateForwardingQuotes } from '@/lib/utils/forwarding'
import {
  fetchTransactionBase, fetchInterimSettlement, fetchClosingSettlement,
  fetchForwardingQuotes, fetchInterimCostItems, fetchClosingCostItems,
} from '@/lib/data/queries'
import { formatDate, formatUsd, formatExchangeRate } from '@/lib/utils/format'

/** 정산 리포트 한 장에 필요한 값 전부. 화면은 이 결과를 배치만 한다. */
export async function loadReportData(supabase: SupabaseClient, id: string) {

  const [t, interim, closing, fwdRows, { data: txItems }] = await Promise.all([
    fetchTransactionBase(supabase, id),
    fetchInterimSettlement(supabase, id),
    fetchClosingSettlement(supabase, id),
    fetchForwardingQuotes(supabase, id),
    supabase.from('transaction_items')
      .select('id,spec,glove_type,color,size,unit_price_usd,quantity,unit')
      .eq('transaction_id', id).order('sort_order'),
  ])

  if (!t) return null

  const [interimCosts, closingCostData] = await Promise.all([
    interim?.id ? fetchInterimCostItems(supabase, interim.id) : Promise.resolve([]),
    closing?.id ? fetchClosingCostItems(supabase, closing.id) : Promise.resolve({ lcFees: [], closingCosts: [] }),
  ])
  const lcFees = closingCostData.lcFees
  const closingCosts = closingCostData.closingCosts

  const mfr = t.manufacturers as { name: string } | null
  const importUsd = Number(t.import_amount_usd ?? 0)
  const txCustomsRate = Number(t.customs_exchange_rate ?? 0)
  const interimRate = interim?.customs_exchange_rate ? Number(interim.customs_exchange_rate) : null
  const customsRate = interimRate ?? txCustomsRate
  const bokRate = closing?.bok_exchange_rate ? Number(closing.bok_exchange_rate) : null

  const shippingItems = interimCosts.filter(i => i.group_type === 'shipping')
  const customsItems = interimCosts.filter(i => i.group_type !== 'shipping')
  const vatAmountKrw = interimCosts.reduce((s, i) => s + i.vat_amount_krw, 0)
  // 확정된 정산은 저장된 방식대로 보여준다 — 로직이 바뀌어도 과거 청구서가 흔들리면 안 된다
  const interimVatMode = interim?.vat_mode === 'inclusive' ? 'inclusive' as const : 'exclusive' as const
  const marginRatePct = t.margin_rate_pct ? Number(t.margin_rate_pct) : null
  const interimImportKrw = customsRate ? calcImportAmountKrw(importUsd, customsRate, marginRatePct ?? 0) : 0
  const interimConfirmedKrw = interim?.confirmed_amount_krw ? Number(interim.confirmed_amount_krw) : null
  const interimDirection = interimConfirmedKrw != null && interimConfirmedKrw !== 0
    ? interimConfirmedKrw >= 0 ? '한국에이원 → 토에이산교 지급' : '토에이산교 → 한국에이원 지급'
    : null

  const lcFeesParsed = (lcFees ?? []).map((f) => ({ item_name: String(f.item_name), amount_krw: Number(f.amount_krw) }))
  const closingCostsParsed = (closingCosts ?? []).map((c) => ({ item_name: String(c.item_name), amount_krw: Number(c.amount_krw) }))
  const fxBurdenA1Pct = closing?.fx_burden_a1_pct ?? 50
  const lcPayment = closing?.lc_payment_total_krw ? Number(closing.lc_payment_total_krw) : 0
  const importAmountKrw = txCustomsRate > 0 ? calcImportAmountKrw(importUsd, txCustomsRate, 0) : 0

  const closingCalc = closing && txCustomsRate > 0
    ? calculateClosing({
        lcPaymentTotalKrw: lcPayment,
        importAmountUsd: importUsd,
        customsExchangeRate: txCustomsRate,
        lcFeeItems: lcFeesParsed.map((f) => ({ amountKrw: f.amount_krw })),
        fxBurdenA1Pct,
        closingCostItems: closingCostsParsed.map((c) => ({ amountKrw: c.amount_krw })),
        roundingPolicy: (closing.rounding_policy as 'floor_100' | 'floor_10' | 'none') ?? 'none',
        interimConfirmedKrw: interim?.confirmed_amount_krw ? Number(interim.confirmed_amount_krw) : 0,
        // 확정된 정산은 저장된 방식대로 보여준다
        vatMode: closing.vat_mode === 'inclusive' ? 'inclusive' : 'exclusive',
      })
    : null

  const customsDate = (t as Record<string, unknown>).customs_date as string | null | undefined

  // 추가 계산값
  const customsItemsTotal = customsItems.reduce((s, i) => s + i.amount_krw, 0)
  const shippingItemsTotal = shippingItems.reduce((s, i) => s + i.amount_krw, 0)
  const nonVatCostsTotal = customsItemsTotal + shippingItemsTotal

  // Section I 데이터
  const sectionIRows: [string, string, string, string][] = [
    ['제조사', mfr?.name ?? '-', 'LC개설일', formatDate(t.lc_open_date)],
    ['수입금액', formatUsd(importUsd), '마진율', t.margin_rate_pct ? `${t.margin_rate_pct}%` : '-'],
    ['통관일', formatDate(customsDate ?? null), '통관환율', customsRate > 0 ? `${formatExchangeRate(customsRate)} (입고시 세관 신고 환율)` : '-'],
    [
      '클로징환율',
      bokRate != null ? `${formatExchangeRate(bokRate)} (한국은행 최초 고시 환율${closing?.closing_date ? `, ${closing.closing_date} 기준` : ''})` : '-',
      '', '',
    ],
  ]


  return {
    t, interim, closing, txItems, mfr, importUsd, txCustomsRate, customsRate, bokRate,
    shippingItems, customsItems, vatAmountKrw, interimVatMode, marginRatePct,
    interimImportKrw, interimConfirmedKrw, interimDirection,
    lcFeesParsed, closingCostsParsed, fxBurdenA1Pct, importAmountKrw, closingCalc,
    customsDate, customsItemsTotal, shippingItemsTotal, nonVatCostsTotal, sectionIRows,
    lcPayment,
    forwardingQuotes: aggregateForwardingQuotes(fwdRows).map((q, i) => ({
      forwarder_name: q.forwarderName || null,
      quote_date: fwdRows[i]?.quote_date ?? null,
      notes: fwdRows[i]?.notes ?? null,
      quote_amount_krw: q.quoteAmountKrw || null,
      actual_amount_krw: q.actualAmountKrw || null,
    })),
  }
}
