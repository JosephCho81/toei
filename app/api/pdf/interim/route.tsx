import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { InterimPdfDocument, type InterimPdfData } from '@/lib/pdf/InterimPdfTemplate'
import { calculateInterim, type CostItem, type VatMode } from '@/lib/calculations/interim'
import { normalizeOne } from '@/lib/utils/normalize'
import { aggregateForwardingQuotes } from '@/lib/utils/forwarding'
import { fetchForwardingQuotes } from '@/lib/data/queries'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const settlementId = searchParams.get('settlementId')

  if (!settlementId) {
    return NextResponse.json({ error: 'settlementId 파라미터가 필요합니다.' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: interim, error } = await supabase
    .from('interim_settlements')
    .select(`
      *,
      transactions (
        id,
        round_label,
        import_amount_usd,
        lc_open_date,
        customs_date,
        margin_rate_pct,
        manufacturers (name)
      ),
      interim_cost_items (
        item_name,
        amount_krw,
        is_vat_taxable,
        vat_amount_krw,
        is_import_vat,
        group_type,
        sort_order
      )
    `)
    .eq('id', settlementId)
    .single()

  if (error || !interim) {
    return NextResponse.json({ error: '정산 데이터를 찾을 수 없습니다.' }, { status: 404 })
  }

  const t = normalizeOne(interim.transactions as {
    id?: string; round_label: string; import_amount_usd: number | null
    lc_open_date: string | null; customs_date: string | null; margin_rate_pct: number | null
    manufacturers: { name: string } | { name: string }[] | null
  } | {
    id?: string; round_label: string; import_amount_usd: number | null
    lc_open_date: string | null; customs_date: string | null; margin_rate_pct: number | null
    manufacturers: { name: string } | { name: string }[] | null
  }[] | null)

  const mfr = normalizeOne(t?.manufacturers as { name: string } | { name: string }[] | null)

  const transactionId = (t as { id?: string } | null)?.id ?? null

  const fwdRows = transactionId ? await fetchForwardingQuotes(supabase, transactionId) : []

  const rawItems = Array.isArray(interim.interim_cost_items) ? interim.interim_cost_items : []
  const sortedItems = [...rawItems].sort((a, b) => ((a as { sort_order?: number }).sort_order ?? 0) - ((b as { sort_order?: number }).sort_order ?? 0))

  const costItems: CostItem[] = sortedItems.map((item) => {
    const i = item as { amount_krw: number; is_import_vat?: boolean; is_vat_taxable?: boolean; vat_amount_krw?: number }
    return {
      amountKrw: Number(i.amount_krw) || 0,
      isImportVat: Boolean(i.is_import_vat),
      isVatTaxable: Boolean(i.is_vat_taxable),
      vatAmountKrw: Number(i.vat_amount_krw) || 0,
    }
  })

  // 확정된 정산은 저장된 방식대로 발행한다 — 로직이 바뀌어도 과거 청구서가 흔들리면 안 된다
  const vatMode: VatMode = interim.vat_mode === 'inclusive' ? 'inclusive' : 'exclusive'

  const calc = calculateInterim({
    importAmountUsd: Number(t?.import_amount_usd) || 0,
    customsExchangeRate: Number(interim.customs_exchange_rate) || 0,
    marginRatePct: t?.margin_rate_pct ?? 0,
    costItems,
    roundingPolicy: (interim.rounding_policy as 'floor_100' | 'floor_10' | 'none') ?? 'floor_100',
    vatMode,
  })

  const now = new Date()
  const issuedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const pdfData: InterimPdfData = {
    roundLabel: t?.round_label ?? '-',
    manufacturerName: (mfr as { name: string } | null)?.name ?? '-',
    lcOpenDate: t?.lc_open_date ?? null,
    customsDate: t?.customs_date ?? null,
    importAmountUsd: Number(t?.import_amount_usd) || 0,
    marginRatePct: t?.margin_rate_pct ?? null,
    customsExchangeRate: Number(interim.customs_exchange_rate) || 0,
    importAmountKrw: calc.importAmountKrw,
    totalCostKrw: calc.totalCostKrw,
    confirmedAmountKrw: Number(interim.confirmed_amount_krw) || 0,
    vatMode,
    // 확정값이 있으면 그대로, 없으면 시스템 계산값
    supplyAmountKrw: Number(interim.supply_amount_krw) || calc.supplyAmountKrw,
    outputVatKrw: Number(interim.vat_amount_krw) || calc.vatKrw,
    isPaid: (interim.is_paid as boolean) ?? false,
    issuedAt,
    costItems: sortedItems.map((item) => {
      const i = item as { item_name: string; amount_krw: number; group_type: string; is_import_vat?: boolean }
      return {
        itemName: String(i.item_name ?? ''),
        amountKrw: Number(i.amount_krw) || 0,
        groupType: String(i.group_type ?? 'customs'),
        isImportVat: Boolean(i.is_import_vat),
      }
    }),
    forwardingQuotes: aggregateForwardingQuotes(fwdRows).map(q => ({
      itemName: q.forwarderName,
      quoteAmountKrw: q.quoteAmountKrw || null,
      actualAmountKrw: q.actualAmountKrw || null,
    })),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(InterimPdfDocument, { data: pdfData }) as any)

  const filename = `interim-${t?.round_label ?? 'settlement'}-${issuedAt}.pdf`
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="interim-settlement.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
