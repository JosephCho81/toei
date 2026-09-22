import type { CostRow } from '@/types/settlement'
import type { CostItem } from '@/lib/calculations/interim'

export function toCostRow(item: Record<string, unknown>): CostRow {
  return {
    id: item.id as string | undefined,
    item_name: String(item.item_name ?? ''),
    amount_krw: String(item.amount_krw ?? ''),
    is_vat_taxable: Boolean(item.is_vat_taxable),
    vat_amount_krw: String(item.vat_amount_krw ?? '0'),
    is_import_vat: Boolean(item.is_import_vat),
    is_duty: Boolean(item.is_duty),
  }
}

/** 입력 행 → 계산 입력. 화면의 소계와 계산이 같은 변환을 거치게 한 곳에 둔다 */
export function toCostItem(r: CostRow): CostItem {
  return {
    amountKrw: parseFloat(r.amount_krw) || 0,
    isImportVat: r.is_import_vat,
    isDuty: r.is_duty,
    isVatTaxable: r.is_vat_taxable,
    vatAmountKrw: parseFloat(r.vat_amount_krw) || 0,
  }
}
