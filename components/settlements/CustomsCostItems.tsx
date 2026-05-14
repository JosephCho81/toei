'use client'

import { CostItemsGroup, type CostRow } from './ShippingCostItems'

export type { CostRow }

export const DEFAULT_CUSTOMS: CostRow[] = [
  { item_name: '관세', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' },
  { item_name: '부가세', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' },
  { item_name: '통관보수료', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' },
  { item_name: '검역수수료', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' },
  { item_name: '정밀검역비', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' },
  { item_name: '보관료', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' },
  { item_name: '기타통관비', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' },
]

interface Props { rows: CostRow[]; onChange: (rows: CostRow[]) => void; isLocked: boolean }

export function CustomsCostItems(props: Props) {
  return <CostItemsGroup title="그룹 B: 통관 세부 내역" {...props} />
}
