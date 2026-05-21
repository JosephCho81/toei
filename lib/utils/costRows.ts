import type { CostRow } from '@/types/settlement'

export function toCostRow(item: Record<string, unknown>): CostRow {
  return {
    id: item.id as string | undefined,
    item_name: String(item.item_name ?? ''),
    amount_krw: String(item.amount_krw ?? ''),
    is_vat_taxable: Boolean(item.is_vat_taxable),
    vat_amount_krw: String(item.vat_amount_krw ?? '0'),
  }
}
