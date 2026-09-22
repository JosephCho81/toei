'use client'

import { CostItemsGroup, EMPTY_COST_ROW, type CostRow } from './ShippingCostItems'

export type { CostRow }

const row = (item_name: string, flags: Partial<CostRow> = {}): CostRow =>
  ({ ...EMPTY_COST_ROW, item_name, ...flags })

export const DEFAULT_CUSTOMS: CostRow[] = [
  // 관세는 공급가 밖에서 합계에만 얹힌다 (2026-09-04 규약)
  row('관세', { is_duty: true }),
  // 세관 납부 수입부가세 — 매입세액공제 대상이라 공급가에서 빠진다 (항목명은 담당자 2026-09-22)
  row('수입부가세', { is_import_vat: true }),
  // 아래 셋은 부가세가 별도로 붙는다 — 총액이 아니라 공급가를 넣을 것
  row('통관보수료', { is_vat_taxable: true }),
  row('검역수수료', { is_vat_taxable: true }),
  row('정밀검역비', { is_vat_taxable: true }),
  row('보관료'),
  row('기타통관비'),
]

type Props = Omit<React.ComponentProps<typeof CostItemsGroup>, 'title' | 'allowImportVat'>

/** 담당자 2026-09-22 요청 문구 그대로 — 통관서류를 보고 넣는 사람이 읽는다 */
const CUSTOMS_GUIDE = (
  <ul className="space-y-0.5">
    <li>★ 수입부가세 항목은 통관서류의 부가가치세를 입력합니다.</li>
    <li>
      ★ 수입금액만이 아닌 매출금액 및 기타 소요 비용까지 공급가로 잡고 공급가에 대한 매출부가세가 발생하므로,
      수입부가세는 계산에 포함하지 않습니다.
    </li>
    <li>
      ★ 통관보수료·검역수수료·정밀검역비는 부가세 과세 항목으로, 서류에 부가세 표시 없이 총액으로 기재된 경우에도
      부가세를 제외한 금액을 계산하여 기입합니다.
    </li>
    <li className="text-muted-foreground">
      국내발생비용(통관보수료·검역수수료·정밀검역비)은 「부가세」에 체크되어 있으며, 소계에는 입력 금액의 10%를 더해
      통관서류 총액과 맞춰 볼 수 있게 표시합니다. 이 부가세는 에이원이 매입세액으로 공제받는 몫이라 수입부가세와 함께
      공급가에서 제외합니다.
    </li>
  </ul>
)

export function CustomsCostItems(props: Props) {
  // 구방식(inclusive)은 부가세 칸 구성이 달라 안내가 맞지 않는다
  const hint = props.vatMode === 'inclusive' ? props.hint : CUSTOMS_GUIDE
  return <CostItemsGroup title="그룹 B: 통관 세부 내역" allowImportVat {...props} hint={hint} />
}
