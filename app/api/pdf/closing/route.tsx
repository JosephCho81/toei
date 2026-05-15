import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { ClosingPdfDocument, type ClosingPdfData } from '@/lib/pdf/ClosingPdfTemplate'
import { calculateClosing } from '@/lib/calculations/closing'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const settlementId = searchParams.get('settlementId')

  if (!settlementId) {
    return NextResponse.json({ error: 'settlementId 파라미터가 필요합니다.' }, { status: 400 })
  }

  const supabase = await createClient()

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

  if (error || !closing) {
    return NextResponse.json({ error: '정산 데이터를 찾을 수 없습니다.' }, { status: 404 })
  }

  const t = Array.isArray(closing.transactions) ? closing.transactions[0] : closing.transactions as {
    round_label: string
    import_amount_usd: number | null
    customs_exchange_rate: number | null
    manufacturers: { name: string } | { name: string }[] | null
  } | null

  const mfr = Array.isArray(t?.manufacturers) ? t?.manufacturers[0] : t?.manufacturers as { name: string } | null

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
    includesVat: (c as { includes_vat: boolean }).includes_vat,
  }))

  const calc = calculateClosing({
    lcPaymentTotalKrw: Number(closing.lc_payment_total_krw) || 0,
    importAmountUsd: Number(t?.import_amount_usd) || 0,
    customsExchangeRate: Number(t?.customs_exchange_rate) || 0,
    lcFeeItems: lcFeeItemsCalc,
    fxBurdenA1Pct: (closing.fx_burden_a1_pct as number) ?? 50,
    closingCostItems: closingCostItemsCalc,
    roundingPolicy: (closing.rounding_policy as 'floor_100' | 'floor_10' | 'none') ?? 'floor_100',
  })

  const now = new Date()
  const issuedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const pdfData: ClosingPdfData = {
    roundLabel: t?.round_label ?? '-',
    manufacturerName: (mfr as { name: string } | null)?.name ?? '-',
    customsExchangeRate: Number(t?.customs_exchange_rate) || 0,
    lcPaymentTotalKrw: Number(closing.lc_payment_total_krw) || 0,
    importAmountKrw: calc.importAmountKrw,
    fxGainLossKrw: calc.fxGainLossKrw,
    lcFeeItems: sortedFeeItems.map((f) => ({
      itemName: (f as { item_name: string }).item_name,
      amountKrw: Number((f as { amount_krw: number }).amount_krw) || 0,
    })),
    lcFeeTotalKrw: calc.lcFeeTotalKrw,
    additionalCostKrw: calc.additionalCostKrw,
    fxBurdenA1Pct: (closing.fx_burden_a1_pct as number) ?? 50,
    a1BurdenKrw: calc.a1BurdenKrw,
    a1BurdenWithVatKrw: calc.a1BurdenWithVatKrw,
    closingCostItems: sortedCostItems.map((c) => ({
      itemName: (c as { item_name: string }).item_name,
      amountKrw: Number((c as { amount_krw: number }).amount_krw) || 0,
    })),
    closingCostsTotalKrw: calc.closingCostsTotalKrw,
    confirmedAmountKrw: Number(closing.confirmed_amount_krw) || 0,
    directionLabel: calc.finalSettlementKrw > 0
      ? '한국에이원 → 토에이산교 지급'
      : calc.finalSettlementKrw < 0
      ? '토에이산교 → 한국에이원 지급'
      : '정산 없음 (상계)',
    isPaid: (closing.is_paid as boolean) ?? false,
    issuedAt,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(ClosingPdfDocument, { data: pdfData }) as any)

  const filename = `closing-${t?.round_label ?? 'settlement'}-${issuedAt}.pdf`
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="closing-settlement.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
