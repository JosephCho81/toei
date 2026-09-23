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

const vatOf = (c: InterimPdfCostItem) => costItemVat({
  amountKrw: c.amountKrw, isImportVat: c.isImportVat, isDuty: c.isDuty,
  isVatTaxable: c.isVatTaxable, vatAmountKrw: c.vatAmountKrw,
})

/**
 * 수입 원가 계산표의 행 목록.
 * 신방식(exclusive)은 중간정산 화면(InterimResultsCard)과 같은 말·순서로 선다 (담당자 2026-09-22):
 * 통관 항목에 국내발생비용 부가세를 더해 서류 총액과 맞추고, 그 부가세를 수입부가세와 한 줄로 뺀다 →
 * 관세 차감 → 공급가 → 부가세 → 관세.
 * 더했다 빼므로 **나열된 금액을 공급가 줄 앞까지 더하면 공급가가 나온다** — 받는 쪽이 검산할 수 있어야 한다.
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
  // 화면처럼 통관 그룹의 부가세만 소계에 더한다 — 해상운임 소계는 vat 제외다
  const customsItemVatKrw = customs.reduce((s, c) => s + vatOf(c), 0)
  const dutyKrw = costItems.reduce((s, c) => s + (c.isDuty ? c.amountKrw : 0), 0)
  const deductVatKrw = importVatKrw + customsItemVatKrw

  const costRow = (c: InterimPdfCostItem, formula: string): InterimCostRow =>
    ({ itemName: c.itemName, formula, amountKrw: c.amountKrw, indent: true })

  return [
    { itemName: '수입원가 (마진포함)', formula: input.importFormula, amountKrw: input.importAmountKrw, indent: false },
    ...shipping.map((c) => costRow(c, '')),
    ...customs.map((c) => costRow(
      c,
      exclusive && c.isImportVat ? '통관서류의 부가가치세 — 공급가에서 제외'
        : exclusive && c.isDuty ? '관세 — 공급가에서 제외'
        : exclusive && vatOf(c) !== 0 ? `부가세 과세 (국내발생비용) — 부가세 ${vatOf(c).toLocaleString('ko-KR')}`
        : '',
    )),
    ...(exclusive
      ? [
          ...(customsItemVatKrw !== 0
            ? [{ itemName: '국내발생비용 부가세', formula: '과세 항목 × 10% — 통관서류 총액(vat 포함)과 대조', amountKrw: customsItemVatKrw, indent: true }]
            : []),
          ...(deductVatKrw !== 0
            ? [{ itemName: '부가세 차감', formula: '수입부가세 + 국내발생비용 부가세', amountKrw: -deductVatKrw, indent: false }]
            : []),
          ...(dutyKrw !== 0
            ? [{ itemName: '관세 차감', formula: '부가세를 매긴 뒤 합계에 더한다', amountKrw: -dutyKrw, indent: false }]
            : []),
          { itemName: '공급가 (부가세 별도)', formula: '', amountKrw: input.supplyAmountKrw, indent: false },
          { itemName: '부가세 (공급가 × 10%)', formula: '', amountKrw: input.outputVatKrw, indent: false },
          ...(dutyKrw !== 0
            ? [{ itemName: '관세 (부가세 없음)', formula: '', amountKrw: dutyKrw, indent: false }]
            : []),
        ]
      : []),
  ]
}
