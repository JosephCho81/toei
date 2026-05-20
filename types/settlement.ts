export type { RoundingPolicy } from '@/lib/calculations/interim'

export interface CostRow {
  id?: string
  item_name: string
  amount_krw: string
  is_vat_taxable: boolean
  vat_amount_krw: string
}

export interface FeeRow {
  id?: string
  item_name: string
  amount_krw: string
}

export interface ForwardingQuoteItem {
  id: string
  forwarding_quote_id: string
  item_type: 'quote' | 'invoice'
  invoice_no: string | null
  item_no: number | null
  item_name: string | null
  currency: string | null
  exchange_rate: number | null
  rate: number | null
  quantity: number | null
  amount_cur: number | null
  amount_krw: number | null
  vat_amount_krw: number | null
  is_vat_taxable: boolean | null
  sort_order: number | null
}
