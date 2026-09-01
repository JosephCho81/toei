import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchTransactionBase, fetchInterimSettlement, fetchInterimCostItems } from '@/lib/data/queries'
import { toCostRow } from '@/lib/utils/costRows'
import type { VatMode } from '@/lib/calculations/interim'
import type { CostRow } from '@/types/settlement'

export interface InterimTx {
  import_amount_usd: number | null
  customs_exchange_rate: number | null
  margin_rate_pct: number | null
}

export interface InterimFormData {
  tx: InterimTx
  settlementId: string | null
  isLocked: boolean
  customsRate: string
  roundingPolicy: string
  vatMode: VatMode
  /** 확정 대상은 공급가다 — 부가세·합계는 여기서 파생시켜야 세금계산서가 항상 맞는다. */
  storedSupply: string | null
  notes: string | null
  shippingRows: CostRow[] | null
  customsRows: CostRow[] | null
  /** 포워딩 실청구액에서 운송비를 자동으로 채웠는가 */
  prefilled: boolean
}

type InvoiceItem = {
  item_name: string | null
  amount_krw: number | null
  vat_amount_krw: number | null
  is_vat_taxable: boolean | null
  sort_order: number | null
  item_type: string
}

export async function loadInterimForm(
  supabase: SupabaseClient,
  transactionId: string,
): Promise<InterimFormData> {
  const [t, interim] = await Promise.all([
    fetchTransactionBase(supabase, transactionId),
    fetchInterimSettlement(supabase, transactionId),
  ])
  const tx = t as unknown as InterimTx

  const base: InterimFormData = {
    tx,
    settlementId: null,
    isLocked: false,
    customsRate: tx.customs_exchange_rate != null ? String(tx.customs_exchange_rate) : '',
    roundingPolicy: 'floor_100',
    vatMode: 'exclusive',
    storedSupply: null,
    notes: null,
    shippingRows: null,
    customsRows: null,
    prefilled: false,
  }

  let shippingRows: CostRow[] | null = null
  let customsRows: CostRow[] | null = null
  let stored = base

  if (interim) {
    const mode: VatMode = interim.vat_mode === 'inclusive' ? 'inclusive' : 'exclusive'
    const storedSupply = interim.supply_amount_krw
    // inclusive(구방식) 정산은 공급가 컬럼이 없으니 확정금액을 그대로 쓴다
    const supply = mode === 'exclusive' && storedSupply != null ? storedSupply : interim.confirmed_amount_krw

    const items = await fetchInterimCostItems(supabase, interim.id)
    const ship = items.filter((i) => i.group_type === 'shipping').map(toCostRow)
    const cust = items.filter((i) => i.group_type !== 'shipping').map(toCostRow)
    if (ship.length) shippingRows = ship
    if (cust.length) customsRows = cust

    stored = {
      ...base,
      settlementId: interim.id,
      isLocked: interim.is_locked,
      customsRate: String(interim.customs_exchange_rate),
      roundingPolicy: interim.rounding_policy,
      vatMode: mode,
      storedSupply: supply != null ? String(supply) : null,
      notes: interim.notes ?? null,
    }
  }

  // 저장된 운송비가 없으면 포워딩 인보이스 실청구액을 그대로 끌어온다
  if (!shippingRows) {
    const prefill = await loadInvoicePrefill(supabase, transactionId)
    if (prefill) return { ...stored, shippingRows: prefill, customsRows, prefilled: true }
  }
  return { ...stored, shippingRows, customsRows }
}

async function loadInvoicePrefill(
  supabase: SupabaseClient,
  transactionId: string,
): Promise<CostRow[] | null> {
  const { data: fqList } = await supabase
    .from('forwarding_quotes')
    .select('id,forwarding_quote_items(item_name,amount_krw,vat_amount_krw,is_vat_taxable,sort_order,item_type)')
    .eq('transaction_id', transactionId)
    .order('sort_order')

  const firstFq = (fqList ?? []).find((fq) =>
    (fq.forwarding_quote_items as InvoiceItem[]).some((i) => i.item_type === 'invoice'))
  if (!firstFq) return null

  const invoiceItems = (firstFq.forwarding_quote_items as InvoiceItem[])
    .filter((i) => i.item_type === 'invoice')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  if (!invoiceItems.length) return null

  return invoiceItems.map((item) => ({
    item_name: item.item_name ?? '',
    amount_krw: String(item.amount_krw ?? '0'),
    is_vat_taxable: item.is_vat_taxable ?? false,
    vat_amount_krw: String(item.vat_amount_krw ?? '0'),
    is_import_vat: false,
  }))
}

export interface InterimSavePayload {
  transaction_id: string
  customs_exchange_rate: number
  rounding_policy: string
  vat_mode: VatMode
  supply_amount_krw: number | null
  vat_amount_krw: number | null
  confirmed_amount_krw: number
  is_locked: boolean
}

export async function saveInterimSettlement(
  supabase: SupabaseClient,
  args: {
    settlementId: string | null
    payload: InterimSavePayload
    shippingRows: CostRow[]
    customsRows: CostRow[]
  },
): Promise<string> {
  let sid = args.settlementId
  if (sid) {
    const { error } = await supabase.from('interim_settlements').update(args.payload).eq('id', sid)
    if (error) throw error
  } else {
    const { data, error } = await supabase
      .from('interim_settlements').insert(args.payload).select('id').single()
    if (error) throw error
    sid = data?.id ?? null
  }
  if (!sid) throw new Error('중간정산 ID를 확인할 수 없습니다.')

  const mkItem = (r: CostRow, i: number, grp: string) => ({
    item_name: r.item_name, group_type: grp,
    amount_krw: parseFloat(r.amount_krw) || 0, is_vat_taxable: r.is_vat_taxable,
    vat_amount_krw: parseFloat(r.vat_amount_krw) || 0, is_import_vat: r.is_import_vat,
    sort_order: i,
  })
  const { error } = await supabase.rpc('save_interim_cost_items', {
    p_interim_settlement_id: sid,
    p_items: [
      ...args.shippingRows.map((r, i) => mkItem(r, i, 'shipping')),
      ...args.customsRows.map((r, i) => mkItem(r, args.shippingRows.length + i, 'customs')),
    ],
  })
  if (error) throw error
  return sid
}
