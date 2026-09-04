import { computeVat, costItemVat } from '@/lib/calculations/interim'
import type { InterimCostData } from './ReportInterimSection'

/**
 * 중간정산 섹션이 보여줄 금액과 계산식 문자열.
 * 금액은 `calculateInterim` 과 같은 규약을 따른다 —
 * 수입부가세와 관세를 공급가에서 빼고, 항목 부가세는 더하지 않는다.
 */
export function interimSummary(data: InterimCostData) {
  const exclusive = data.vatMode !== 'inclusive'
  const shippingTotal = data.shippingItems.reduce((s, r) => s + r.amount_krw, 0)
  const customsTotal = data.customsItems.reduce((s, r) => s + r.amount_krw, 0)
  const allItems = [...data.shippingItems, ...data.customsItems]
  const importVatKrw = allItems.reduce((s, r) => s + (r.is_import_vat ? r.amount_krw : 0), 0)
  // 항목 부가세는 에이원 매입세액공제분이라 공급가에 넣지 않는다. 표시용으로만 낸다.
  const itemVatKrw = allItems.reduce((s, r) => s + costItemVat({
    amountKrw: r.amount_krw, isImportVat: r.is_import_vat, isDuty: r.is_duty,
    isVatTaxable: r.is_vat_taxable, vatAmountKrw: r.vat_amount_krw,
  }), 0)
  // 관세는 공급가 밖에서 합계에만 얹힌다. 구방식(inclusive)은 종전대로 전부 합산한다.
  const dutyKrw = exclusive ? allItems.reduce((s, r) => s + (r.is_duty ? r.amount_krw : 0), 0) : 0

  // 신방식은 확정 공급가가 있으면 그 값을, 없으면 항목 합계를 기준으로 보여준다.
  const rawSupply = exclusive
    ? data.importAmountKrw + shippingTotal + customsTotal - importVatKrw - dutyKrw
    : data.importAmountKrw + shippingTotal + customsTotal
  const supplyKrw = exclusive ? (data.supplyAmountKrw ?? rawSupply) : rawSupply
  const outputVatKrw = exclusive ? (data.outputVatKrw ?? computeVat(supplyKrw)) : 0

  const subTotal = exclusive
    ? supplyKrw + outputVatKrw + dutyKrw
    : data.importAmountKrw + shippingTotal + customsTotal + data.vatAmountKrw
  const showConfirmed = data.confirmedAmountKrw != null
  const confirmedDiff = showConfirmed ? data.confirmedAmountKrw! - subTotal : 0
  const diffIsRounding = Math.abs(confirmedDiff) > 0 && Math.abs(confirmedDiff) < 100

  const marginSuffix = data.marginRatePct
    ? ` × ${(1 + data.marginRatePct / 100).toFixed(2)}(마진율 1+${data.marginRatePct}%)`
    : ''
  const importFormula = data.importAmountUsd > 0 && data.customs_exchange_rate
    ? `$${data.importAmountUsd.toLocaleString('en-US')}(수입금액USD) × ${data.customs_exchange_rate.toLocaleString('ko-KR')}원(통관환율)${marginSuffix}`
    : ''

  const vatItems = [...data.shippingItems, ...data.customsItems].filter((i) => i.vat_amount_krw > 0)
  const vatFormula = vatItems.map((i) => i.vat_amount_krw.toLocaleString('ko-KR')).join(' + ')

  const supplyParts = [
    `수입금액 ${data.importAmountKrw.toLocaleString('ko-KR')}`,
    ...(shippingTotal !== 0 ? [`해상운임 ${shippingTotal.toLocaleString('ko-KR')}`] : []),
    ...(customsTotal !== 0 ? [`통관비용 ${customsTotal.toLocaleString('ko-KR')}`] : []),
  ].join(' + ')
  const supplyFormula = [
    supplyParts,
    ...(importVatKrw !== 0 ? [`− 수입부가세 ${importVatKrw.toLocaleString('ko-KR')}`] : []),
    ...(dutyKrw !== 0 ? [`− 관세 ${dutyKrw.toLocaleString('ko-KR')}`] : []),
  ].join(' ')

  const subTotalFormula = exclusive
    ? `공급가 ${supplyKrw.toLocaleString('ko-KR')} + 부가세 ${outputVatKrw.toLocaleString('ko-KR')}`
      + (dutyKrw !== 0 ? ` + 관세 ${dutyKrw.toLocaleString('ko-KR')}` : '')
    : [
        `수입금액 ${data.importAmountKrw.toLocaleString('ko-KR')}`,
        ...(shippingTotal !== 0 ? [`해상운임 ${shippingTotal.toLocaleString('ko-KR')}`] : []),
        ...(customsTotal !== 0 ? [`통관비용 ${customsTotal.toLocaleString('ko-KR')}`] : []),
        ...(data.vatAmountKrw > 0 ? [`부가세 ${data.vatAmountKrw.toLocaleString('ko-KR')}`] : []),
      ].join(' + ')

  return {
    exclusive, shippingTotal, customsTotal, importVatKrw, itemVatKrw, dutyKrw,
    supplyKrw, outputVatKrw, subTotal, showConfirmed, confirmedDiff, diffIsRounding,
    importFormula, vatFormula, supplyFormula, subTotalFormula,
  }
}
