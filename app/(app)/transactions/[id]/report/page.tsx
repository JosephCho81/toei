import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { calculateClosing } from '@/lib/calculations/closing'
import { formatDate, formatUsd } from '@/lib/utils/format'
import { ReportHeader } from '@/components/report/ReportHeader'
import { ReportSection, InfoRow } from '@/components/report/ReportSection'
import { ComparisonTable } from '@/components/report/ComparisonTable'
import { ReportItemsSection } from '@/components/report/ReportItemsSection'
import { ReportInterimSection } from '@/components/report/ReportInterimSection'
import { ReportClosingSection } from '@/components/report/ReportClosingSection'
import { ReportForwardingSection } from '@/components/report/ReportForwardingSection'

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: t },
    { data: items },
    { data: interim },
    { data: closing },
    { data: fwdRows },
  ] = await Promise.all([
    supabase.from('transactions').select('*, manufacturers(name)').eq('id', id).single(),
    supabase.from('transaction_items')
      .select('id,spec,glove_type,color,size,unit_price_usd,quantity,unit,sort_order')
      .eq('transaction_id', id).order('sort_order'),
    supabase.from('interim_settlements')
      .select('id,customs_exchange_rate,confirmed_amount_krw,is_locked,updated_at')
      .eq('transaction_id', id).single(),
    supabase.from('closing_settlements')
      .select('id,closing_date,bok_exchange_rate,lc_payment_total_krw,fx_burden_a1_pct,confirmed_amount_krw,is_locked')
      .eq('transaction_id', id).single(),
    supabase.from('forwarding_quotes')
      .select('forwarder_name,quote_date,quote_amount_krw,actual_amount_krw,notes')
      .eq('transaction_id', id).order('sort_order'),
  ])

  if (!t) notFound()

  const [{ data: interimCosts }, { data: lcFees }, { data: closingCosts }] = await Promise.all([
    interim?.id
      ? supabase.from('interim_cost_items').select('item_name,amount_krw,is_vat_taxable,vat_amount_krw,group_type')
          .eq('interim_settlement_id', interim.id).order('sort_order')
      : Promise.resolve({ data: [] }),
    closing?.id
      ? supabase.from('lc_fee_items').select('item_name,amount_krw')
          .eq('closing_settlement_id', closing.id).order('sort_order')
      : Promise.resolve({ data: [] }),
    closing?.id
      ? supabase.from('closing_cost_items').select('item_name,amount_krw')
          .eq('closing_settlement_id', closing.id).order('sort_order')
      : Promise.resolve({ data: [] }),
  ])

  const mfr = t.manufacturers as { name: string } | null
  const importUsd = Number(t.import_amount_usd ?? 0)
  const txCustomsRate = Number(t.customs_exchange_rate ?? 0)
  const interimRate = interim?.customs_exchange_rate ? Number(interim.customs_exchange_rate) : null
  const marginPct = t.margin_rate_pct ? Number(t.margin_rate_pct) : null

  type IC = { item_name: string; amount_krw: unknown; is_vat_taxable: boolean; vat_amount_krw: unknown; group_type: string }
  const allCosts = (interimCosts ?? []) as IC[]
  const toRow = (i: IC) => ({ ...i, amount_krw: Number(i.amount_krw), vat_amount_krw: Number(i.vat_amount_krw ?? 0) })
  const shippingItems = allCosts.filter((i) => i.group_type === 'shipping').map(toRow)
  const customsItems = allCosts.filter((i) => i.group_type !== 'shipping').map(toRow)
  const vatAmountKrw = allCosts.reduce((s, i) => s + Number(i.vat_amount_krw ?? 0), 0)
  const interimImportKrw = interimRate ? Math.round(importUsd * interimRate) : 0

  const lcFeesParsed = (lcFees ?? []).map((f) => ({ item_name: String(f.item_name), amount_krw: Number(f.amount_krw) }))
  const closingCostsParsed = (closingCosts ?? []).map((c) => ({ item_name: String(c.item_name), amount_krw: Number(c.amount_krw) }))
  const fxBurdenA1Pct = closing?.fx_burden_a1_pct ?? 50
  const lcPayment = closing?.lc_payment_total_krw ? Number(closing.lc_payment_total_krw) : 0
  const importAmountKrw = txCustomsRate > 0 ? Math.round(importUsd * txCustomsRate) : 0

  const closingCalc = closing && txCustomsRate > 0
    ? calculateClosing({
        lcPaymentTotalKrw: lcPayment,
        importAmountUsd: importUsd,
        customsExchangeRate: txCustomsRate,
        lcFeeItems: lcFeesParsed.map((f) => ({ amountKrw: f.amount_krw })),
        fxBurdenA1Pct,
        closingCostItems: closingCostsParsed.map((c) => ({ amountKrw: c.amount_krw, includesVat: false })),
        roundingPolicy: 'none',
      })
    : null

  let interimProfitRate: number | null = null
  let closingProfitRate: number | null = null
  if (interimRate && marginPct && importUsd) {
    const salesKrw = Math.round(importUsd * interimRate * (1 + marginPct / 100))
    const interimCost = Number(interim?.confirmed_amount_krw ?? 0)
    if (salesKrw > 0) {
      interimProfitRate = ((salesKrw - interimCost) / salesKrw) * 100
      if (closing?.confirmed_amount_krw != null) {
        closingProfitRate = ((salesKrw - interimCost - Number(closing.confirmed_amount_krw)) / salesKrw) * 100
      }
    }
  }

  return (
    <div className="max-w-5xl print:shadow-none">
      <ReportHeader
        roundLabel={t.round_label}
        orderNo={t.order_no ?? null}
        transactionId={id}
        interimId={interim?.id ?? null}
        closingId={closing?.id ?? null}
        interimLocked={interim?.is_locked ?? false}
        closingLocked={closing?.is_locked ?? false}
      />

      <ReportSection title="섹션 1 — 거래 기본 정보">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          <InfoRow label="차수" value={t.round_label} />
          <InfoRow label="제조사" value={mfr?.name ?? '-'} />
          <InfoRow label="P/O No." value={t.order_no ?? '-'} />
          <InfoRow label="LC번호" value={t.lc_no ?? '-'} />
          <InfoRow label="L/C 개설일" value={formatDate(t.lc_open_date)} />
          <InfoRow label="입금일(A1)" value={formatDate(t.a1_payment_date)} />
          <InfoRow label="LC 만기일" value={formatDate(t.lc_expiry_date)} />
          <InfoRow label="지불형태" value="LC (신용장)" />
          <InfoRow label="수입금액(USD)" value={formatUsd(importUsd)} />
          <InfoRow label="마진율" value={marginPct != null ? `${marginPct}%` : '-'} />
        </div>
      </ReportSection>

      <ReportItemsSection items={items ?? []} importAmountUsd={t.import_amount_usd ? Number(t.import_amount_usd) : null} marginRatePct={marginPct} />

      {interim && (
        <ReportInterimSection data={{
          customs_exchange_rate: interimRate,
          confirmed_amount_krw: interim.confirmed_amount_krw ? Number(interim.confirmed_amount_krw) : null,
          updated_at: interim.updated_at, shippingItems, customsItems, vatAmountKrw, importAmountKrw: interimImportKrw,
        }} />
      )}

      {closing && closingCalc && (
        <ReportClosingSection data={{
          closing_date: closing.closing_date,
          bok_exchange_rate: closing.bok_exchange_rate ? Number(closing.bok_exchange_rate) : null,
          lc_payment_total_krw: lcPayment || null,
          customs_exchange_rate: txCustomsRate || null,
          importAmountKrw,
          fxGainLossKrw: closingCalc.fxGainLossKrw,
          lcFeeItems: lcFeesParsed, lcFeeTotalKrw: closingCalc.lcFeeTotalKrw,
          fx_burden_a1_pct: fxBurdenA1Pct,
          a1BurdenKrw: closingCalc.a1BurdenKrw, a1BurdenWithVatKrw: closingCalc.a1BurdenWithVatKrw,
          closingCostItems: closingCostsParsed, closingCostsTotalKrw: closingCalc.closingCostsTotalKrw,
          confirmed_amount_krw: closing.confirmed_amount_krw ? Number(closing.confirmed_amount_krw) : null,
        }} />
      )}

      {interim && closing && (
        <ReportSection title="섹션 5 — 중간 vs 클로징 비교 요약">
          <ComparisonTable data={{
            interimRate,
            closingRate: closing.bok_exchange_rate ? Number(closing.bok_exchange_rate) : null,
            interimAmount: interim.confirmed_amount_krw ? Number(interim.confirmed_amount_krw) : null,
            closingAmount: closing.confirmed_amount_krw ? Number(closing.confirmed_amount_krw) : null,
            interimProfitRate, closingProfitRate,
          }} />
        </ReportSection>
      )}

      <ReportForwardingSection rows={fwdRows ?? []} />
    </div>
  )
}
