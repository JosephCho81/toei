'use client'

import { CostItemsGroup, EMPTY_COST_ROW, type CostRow } from './ShippingCostItems'

export type { CostRow }

const row = (item_name: string, flags: Partial<CostRow> = {}): CostRow =>
  ({ ...EMPTY_COST_ROW, item_name, ...flags })

export const DEFAULT_CUSTOMS: CostRow[] = [
  // 관세는 공급가 밖에서 합계에만 얹힌다 (2026-09-04 규약)
  row('관세', { is_duty: true }),
  // 세관 납부 수입부가세 — 매입세액공제 대상이라 공급가에서 빠진다
  row('부가세', { is_import_vat: true }),
  // 아래 셋은 부가세가 별도로 붙는다 — 총액이 아니라 공급가를 넣을 것
  row('통관보수료', { is_vat_taxable: true }),
  row('검역수수료', { is_vat_taxable: true }),
  row('정밀검역비', { is_vat_taxable: true }),
  row('보관료'),
  row('기타통관비'),
]

type Props = Omit<React.ComponentProps<typeof CostItemsGroup>, 'title' | 'allowImportVat'>

export function CustomsCostItems(props: Props) {
  return <CostItemsGroup title="그룹 B: 통관 세부 내역" allowImportVat {...props} />
}
