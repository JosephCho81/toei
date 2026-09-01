import { costItemVat } from '../calculations/interim.ts'

export interface InterimPdfCostItem {
  itemName: string
  amountKrw: number
  groupType: string
  isImportVat: boolean
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
 * 신방식(exclusive)은 계산 규약대로 「항목 부가세 가산 → 수입부가세 차감 → 공급가 → 매출부가세」
 * 순으로 보여준다 — 이 두 줄이 빠지면 나열된 금액을 더해도 공급가가 나오지 않는다.
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
    amountKrw: c.amountKrw, isImportVat: c.isImportVat,
    isVatTaxable: c.isVatTaxable, vatAmountKrw: c.vatAmountKrw,
  }), 0)

  const costRow = (c: InterimPdfCostItem, formula: string): InterimCostRow =>
    ({ itemName: c.itemName, formula, amountKrw: c.amountKrw, indent: true })

  return [
    { itemName: '수입금액 (원화환산)', formula: input.importFormula, amountKrw: input.importAmountKrw, indent: false },
    ...shipping.map((c) => costRow(c, '')),
    ...customs.map((c) => costRow(
      c,
      exclusive && c.isImportVat ? '수입부가세 — 매입세액공제분이라 공급가에서 제외' : '',
    )),
    ...(exclusive
      ? [
          ...(itemVatKrw !== 0
            ? [{ itemName: '항목 부가세 가산', formula: '국내 비용에 붙은 부가세 — 토에이 실지급액', amountKrw: itemVatKrw, indent: false }]
            : []),
          ...(importVatKrw !== 0
            ? [{ itemName: '수입부가세 차감', formula: '공급가 계산에서 제외', amountKrw: -importVatKrw, indent: false }]
            : []),
          { itemName: '공급가 (부가세 별도)', formula: '', amountKrw: input.supplyAmountKrw, indent: false },
          { itemName: '부가세', formula: '공급가 x 10%', amountKrw: input.outputVatKrw, indent: false },
        ]
      : []),
  ]
}
