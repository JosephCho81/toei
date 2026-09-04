import { calcImportAmountKrw } from './helpers.ts'

export type RoundingPolicy = 'floor_100' | 'floor_10' | 'none'

/**
 * inclusive = 구방식. 수입부가세를 비용 한 줄로 합산한 부가세 포함가.
 * exclusive = 신방식. 수입부가세를 빼고 공급가를 만든 뒤 매출부가세 10%를 따로 더한다.
 *
 * 확정된 정산의 금액이 로직 변경으로 조용히 바뀌면 안 되므로 정산마다 스냅샷으로 보관한다.
 */
export type VatMode = 'inclusive' | 'exclusive'

export const VAT_RATE = 0.1

export interface CostItem {
  /** 항목 금액. 언제나 부가세를 뺀 공급가다 */
  amountKrw: number
  /** 통관 시 세관에 납부한 수입부가세 — 매입세액공제 대상이라 공급가에서 뺀다 */
  isImportVat?: boolean
  /**
   * 관세 — 공급가에 넣지 않고 매출부가세를 매긴 뒤 합계에 그대로 얹는다.
   * 이름으로 가르지 않는다. 「관세」로 시작하는 항목이 전부 관세인 것도,
   * 관세가 언제나 그 이름으로 들어오는 것도 아니다.
   */
  isDuty?: boolean
  /** 부가세가 별도로 붙는 항목 (보관료·트럭운송비 등). 부가세는 amountKrw × 10% */
  isVatTaxable?: boolean
  /** 과세 항목이 아니면서 부가세가 청구된 경우 직접 입력한 금액 */
  vatAmountKrw?: number
}

export interface InterimCalculation {
  vatMode: VatMode
  importAmountKrw: number   // USD × 환율 × (1 + margin/100)
  totalCostKrw: number      // 운송비 + 통관비 전체 (수입부가세·관세 포함)
  importVatKrw: number      // 그중 수입부가세
  /**
   * 비용 항목에 붙은 부가세 합계.
   * 공급가에 넣지 않는다 — 에이원이 매입세액으로 공제받을 몫이라 다시 청구하면 이중이다.
   * 화면에 「이 항목엔 부가세가 별도로 붙어 있다」를 보여주려고 계속 낸다.
   */
  itemVatKrw: number
  /** 그중 관세 — 공급가 밖에서 합계에만 얹힌다 */
  dutyKrw: number
  /** 절사 후 공급가. inclusive 모드에서는 절사 후 청구액 전체를 가리킨다. */
  supplyAmountKrw: number
  /** 매출부가세. inclusive 모드는 0 (청구액에 이미 섞여 있어 분리할 수 없다). */
  vatKrw: number
  /** 청구 합계 = supplyAmountKrw + vatKrw + dutyKrw */
  confirmedKrw: number
}

export function applyRounding(amount: number, policy: RoundingPolicy): number {
  // 절사는 0 방향 버림이다. 클로징은 음수(토에이→에이원 환급)가 나오는데
  // Math.floor 로 내리면 환급액이 오히려 커져 '절사'가 아니게 된다.
  const truncate = (unit: number) => Math.trunc(amount / unit) * unit
  if (policy === 'floor_100') return truncate(100)
  if (policy === 'floor_10') return truncate(10)
  // '절사 없음'이어도 원 단위 소수점은 남기지 않는다.
  // 정산금액 컬럼이 numeric(15,0) 이라 DB 가 어차피 반올림하므로 화면과 저장값을 맞춘다.
  return Math.round(amount)
}

export function calculateInterim(params: {
  importAmountUsd: number
  customsExchangeRate: number
  marginRatePct?: number
  costItems: CostItem[]
  roundingPolicy: RoundingPolicy
  vatMode?: VatMode
}): InterimCalculation {
  const {
    importAmountUsd, customsExchangeRate, marginRatePct = 0,
    costItems, roundingPolicy, vatMode = 'exclusive',
  } = params

  const importAmountKrw = calcImportAmountKrw(importAmountUsd, customsExchangeRate, marginRatePct)
  const totalCostKrw = costItems.reduce((sum, item) => sum + item.amountKrw, 0)
  const importVatKrw = costItems.reduce((sum, item) => sum + (item.isImportVat ? item.amountKrw : 0), 0)
  const itemVatKrw = costItems.reduce((sum, item) => sum + costItemVat(item), 0)
  const dutyKrw = costItems.reduce((sum, item) => sum + (item.isDuty ? item.amountKrw : 0), 0)

  // 절사는 공급가에 건다. 합계를 절사하면 공급가 + 부가세 ≠ 합계 가 되어 세금계산서가 맞지 않는다.
  //
  // 2026-09-04 규약 변경(담당자 요청, 전 차수 소급):
  //   · 항목 부가세를 공급가에 더하지 않는다 — 에이원이 매입세액으로 공제받을 몫이다
  //   · 관세는 공급가 밖으로 뺐다가 매출부가세를 매긴 뒤 합계에 그대로 얹는다
  //   · 세관에 낸 수입부가세는 종전대로 공급가에서 뺀다
  // 구방식(inclusive)은 부가세를 분리할 수 없어 손대지 않는다 — 스냅샷 그대로 둔다.
  const rawSupply = vatMode === 'exclusive'
    ? importAmountKrw + totalCostKrw - importVatKrw - dutyKrw
    : importAmountKrw + totalCostKrw
  const supplyAmountKrw = applyRounding(rawSupply, roundingPolicy)
  const vatKrw = vatMode === 'exclusive' ? computeVat(supplyAmountKrw) : 0

  return {
    vatMode,
    importAmountKrw,
    totalCostKrw,
    importVatKrw,
    itemVatKrw,
    dutyKrw: vatMode === 'exclusive' ? dutyKrw : 0,
    supplyAmountKrw,
    vatKrw,
    confirmedKrw: supplyAmountKrw + vatKrw + (vatMode === 'exclusive' ? dutyKrw : 0),
  }
}

export function computeVat(amountKrw: number): number {
  return Math.round(amountKrw * VAT_RATE)
}

/**
 * 이 항목에 붙은 부가세.
 * 과세 항목은 금액의 10% — 화면(ShippingCostItems)이 같은 규칙으로 표시하므로
 * 저장된 vat_amount_krw 가 0 이어도 계산이 흔들리지 않는다.
 */
export function costItemVat(item: CostItem): number {
  // 수입부가세는 그 자체가 세금이고, 관세에는 부가세가 붙지 않는다.
  if (item.isImportVat || item.isDuty) return 0
  if (item.isVatTaxable) return computeVat(item.amountKrw)
  return item.vatAmountKrw ?? 0
}
