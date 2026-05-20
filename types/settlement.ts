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
