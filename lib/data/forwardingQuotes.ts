import type { SupabaseClient } from '@supabase/supabase-js'

export type ItemType = 'quote' | 'invoice'

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  quote: '견적',
  invoice: '실청구',
}

const DEFAULT_ITEM_NAMES = ['해상운임', '터미널 처리비(THC)', '서류발급비(D/O Fee)', '내륙운송비', '기타운임']

export interface QuoteItemRow {
  _key: string
  id?: string
  item_type: ItemType
  item_name: string
  amount_krw: string
  is_vat_taxable: boolean
  // PDF 파싱으로 들어온 외화 정보 — 화면에서는 읽기 전용으로만 노출
  currency: string | null
  amount_cur: number | null
}

export interface QuoteRow {
  _key: string
  id?: string
  forwarder_name: string
  quote_date: string
  notes: string
  items: QuoteItemRow[]
}

export function blankQuoteItem(item_name = '', item_type: ItemType = 'quote'): QuoteItemRow {
  return {
    _key: crypto.randomUUID(),
    item_type, item_name, amount_krw: '', is_vat_taxable: false,
    currency: null, amount_cur: null,
  }
}

export function blankQuote(): QuoteRow {
  return {
    _key: crypto.randomUUID(),
    forwarder_name: '오션마스터',
    quote_date: '',
    notes: '',
    items: DEFAULT_ITEM_NAMES.map((n) => blankQuoteItem(n)),
  }
}

/** 구분별 금액 합계. 실청구가 있으면 그것이, 없으면 견적이 정산 기준이 된다. */
export function quoteTotals(row: QuoteRow): { quote: number; actual: number } {
  const sum = (type: ItemType) => row.items
    .filter((i) => i.item_type === type)
    .reduce((s, i) => s + (Number(i.amount_krw) || 0), 0)
  return { quote: sum('quote'), actual: sum('invoice') }
}

const SELECT_QUERY = 'id,forwarder_name,quote_date,notes,sort_order,'
  + 'forwarding_quote_items(id,item_type,item_name,currency,exchange_rate,rate,'
  + 'amount_cur,amount_krw,vat_amount_krw,is_vat_taxable,sort_order)'

type DbItem = {
  id: string
  item_type: string | null
  item_name: string | null
  currency: string | null
  amount_cur: number | null
  amount_krw: number | null
  is_vat_taxable: boolean | null
  sort_order: number | null
}

function mapRow(d: Record<string, unknown>): QuoteRow {
  return {
    _key: crypto.randomUUID(),
    id: d.id as string,
    forwarder_name: (d.forwarder_name as string) ?? '',
    quote_date: (d.quote_date as string) ?? '',
    notes: (d.notes as string) ?? '',
    items: ((d.forwarding_quote_items as DbItem[]) ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i) => ({
        _key: crypto.randomUUID(),
        id: i.id,
        item_type: i.item_type === 'quote' ? 'quote' : 'invoice',
        item_name: i.item_name ?? '',
        amount_krw: i.amount_krw != null ? String(i.amount_krw) : '',
        is_vat_taxable: i.is_vat_taxable ?? false,
        currency: i.currency,
        amount_cur: i.amount_cur,
      })),
  }
}

export async function loadForwardingQuoteRows(
  supabase: SupabaseClient,
  transactionId: string,
): Promise<QuoteRow[]> {
  const { data } = await supabase.from('forwarding_quotes')
    .select(SELECT_QUERY)
    .eq('transaction_id', transactionId)
    .order('sort_order')
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapRow)
}

/**
 * 화면 상태를 DB 에 반영한다. 화면에서 지운 견적·항목은 DB 에서도 지운다.
 * 외화 컬럼(currency/exchange_rate/amount_cur)은 PDF 파싱 결과라 편집 대상이 아니므로 건드리지 않는다.
 * 실패한 문장의 메시지를 모아 돌려준다 — 비어 있으면 전부 성공.
 */
export async function saveForwardingQuoteRows(
  supabase: SupabaseClient,
  transactionId: string,
  rows: QuoteRow[],
): Promise<string[]> {
  const errors: string[] = []
  const check = (err: { message: string } | null) => { if (err) errors.push(err.message) }

  const validRows = rows.filter((r) => r.forwarder_name)
  const keptQuoteIds = new Set(validRows.filter((r) => r.id).map((r) => r.id!))

  const { data: dbQuotes } = await supabase.from('forwarding_quotes')
    .select('id').eq('transaction_id', transactionId)
  const quotesToDelete = (dbQuotes ?? []).map((q) => q.id).filter((id: string) => !keptQuoteIds.has(id))
  if (quotesToDelete.length) {
    check((await supabase.from('forwarding_quotes').delete().in('id', quotesToDelete)).error)
  }

  for (const [i, r] of validRows.entries()) {
    const payload = {
      transaction_id: transactionId,
      forwarder_name: r.forwarder_name,
      quote_date: r.quote_date || null,
      notes: r.notes || null,
      sort_order: i,
    }
    let quoteId = r.id
    if (quoteId) {
      check((await supabase.from('forwarding_quotes').update(payload).eq('id', quoteId)).error)
    } else {
      const { data: inserted, error } = await supabase.from('forwarding_quotes')
        .insert(payload).select('id').single()
      check(error)
      quoteId = inserted?.id
    }
    if (!quoteId) continue
    check(await saveItems(supabase, quoteId, r.items))
  }

  return errors
}

async function saveItems(
  supabase: SupabaseClient,
  quoteId: string,
  items: QuoteItemRow[],
): Promise<{ message: string } | null> {
  const valid = items.filter((it) => it.item_name.trim() || it.amount_krw)
  const keptIds = new Set(valid.filter((it) => it.id).map((it) => it.id!))

  const { data: dbItems } = await supabase.from('forwarding_quote_items')
    .select('id').eq('forwarding_quote_id', quoteId)
  const toDelete = (dbItems ?? []).map((it) => it.id).filter((id: string) => !keptIds.has(id))
  if (toDelete.length) {
    const { error } = await supabase.from('forwarding_quote_items').delete().in('id', toDelete)
    if (error) return error
  }

  const toInsert: Record<string, unknown>[] = []
  for (const [j, it] of valid.entries()) {
    const itemPayload = {
      item_type: it.item_type,
      item_name: it.item_name.trim() || null,
      amount_krw: it.amount_krw ? Number(it.amount_krw) : null,
      is_vat_taxable: it.is_vat_taxable,
      sort_order: j,
    }
    if (it.id) {
      const { error } = await supabase.from('forwarding_quote_items').update(itemPayload).eq('id', it.id)
      if (error) return error
    } else {
      toInsert.push({ ...itemPayload, forwarding_quote_id: quoteId })
    }
  }
  if (toInsert.length) {
    const { error } = await supabase.from('forwarding_quote_items').insert(toInsert)
    if (error) return error
  }
  return null
}
