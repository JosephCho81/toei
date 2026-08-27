'use client'

import { CostItemsGroup, EMPTY_COST_ROW, type CostRow } from './ShippingCostItems'

export type { CostRow }

const row = (item_name: string, is_import_vat = false): CostRow =>
  ({ ...EMPTY_COST_ROW, item_name, is_import_vat })

export const DEFAULT_CUSTOMS: CostRow[] = [
  row('관세'),
  // 세관 납부 수입부가세 — 매입세액공제 대상이라 공급가에서 빠진다
  row('부가세', true),
  row('통관보수료'),
  row('검역수수료'),
  row('정밀검역비'),
  row('보관료'),
  row('기타통관비'),
]

type Props = Omit<React.ComponentProps<typeof CostItemsGroup>, 'title' | 'allowImportVat'>

export function CustomsCostItems(props: Props) {
  return <CostItemsGroup title="그룹 B: 통관 세부 내역" allowImportVat {...props} />
}
