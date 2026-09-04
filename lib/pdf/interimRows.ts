import { costItemVat } from '../calculations/interim.ts'

export interface InterimPdfCostItem {
  itemName: string
  amountKrw: number
  groupType: string
  isImportVat: boolean
  /** 관세 — 공급가 밖에서 합계에만 얹힌다 */
  isDuty?: boolean
  isVatTaxable: boolean
  vatAmountKrw: number
}

export interface InterimCostRow {
  itemName: string
  formula: string
  amountKrw: number
  indent: boolean
}

/**
 * 수입 원가 계산표의 행 목록.
 * 신방식(exclusive)은 계산 규약대로 「수입부가세 차감 → 관세 차감 → 공급가 → 매출부가세 → 관세 가산」
 * 순으로 보여준다 — 차감·가산 줄이 빠지면 나열된 금액을 더해도 합계가 나오지 않는다.
 */
export function buildInterimCostRows(input: {
  costItems: InterimPdfCostItem[]
  importAmountKrw: number
  importFormula: string
  exclusive: boolean
  supplyAmountKrw: number
  outputVatKrw: number
}): InterimCostRow[] {
  const { costItems, exclusive } = input
  const shipping = costItems.filter((c) => c.groupType === 'shipping')
  const customs = costItems.filter((c) => c.groupType !== 'shipping')
  const importVatKrw = costItems.reduce((s, c) => s + (c.isImportVat ? c.amountKrw : 0), 0)
  const itemVatKrw = costItems.reduce((s, c) => s + costItemVat({
    amountKrw: c.amountKrw, isImportVat: c.isImportVat, isDuty: c.isDuty,
    isVatTaxable: c.isVatTaxable, vatAmountKrw: c.vatAmountKrw,
  }), 0)
  const dutyKrw = costItems.reduce((s, c) => s + (c.isDuty ? c.amountKrw : 0), 0)

  const costRow = (c: InterimPdfCostItem, formula: string): InterimCostRow =>
    ({ itemName: c.itemName, formula, amountKrw: c.amountKrw, indent: true })

  return [
    { itemName: '수입금액 (원화환산)', formula: input.importFormula, amountKrw: input.importAmountKrw, indent: false },
    ...shipping.map((c) => costRow(c, '')),
    ...customs.map((c) => costRow(
      c,
      exclusive && c.isImportVat ? '수입부가세 — 매입세액공제분이라 공급가에서 제외'
        : exclusive && c.isDuty ? '관세 — 공급가에서 빼고 부가세를 매긴 뒤 합계에 더한다'
        : '',
    )),
    ...(exclusive
      ? [
          ...(importVatKrw !== 0
            ? [{ itemName: '수입부가세 차감', formula: '공급가 계산에서 제외', amountKrw: -importVatKrw, indent: false }]
            : []),
          ...(dutyKrw !== 0
            ? [{ itemName: '관세 차감', formula: '부가세를 매긴 뒤 합계에서 되더한다', amountKrw: -dutyKrw, indent: false }]
            : []),
          ...(itemVatKrw !== 0
            ? [{ itemName: '(참고) 항목 부가세', formula: '국내 비용에 별도로 붙은 부가세 — 매입세액공제분이라 공급가에 넣지 않는다', amountKrw: 0, indent: false }]
            : []),
          { itemName: '공급가 (부가세 별도)', formula: '', amountKrw: input.supplyAmountKrw, indent: false },
          { itemName: '부가세', formula: '공급가 x 10%', amountKrw: input.outputVatKrw, indent: false },
          ...(dutyKrw !== 0
            ? [{ itemName: '관세 가산', formula: '부가세가 붙지 않는다', amountKrw: dutyKrw, indent: false }]
            : []),
        ]
      : []),
  ]
}
