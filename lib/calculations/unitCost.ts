/**
 * 차수 정산 총액을 품목별로 배부해 제품 단위원가(landed cost)를 낸다.
 * 법인세 예납 자료로 나가는 숫자라 배부액 합계는 반드시 정산 총액과 1원까지 일치해야 하며,
 * 배부 기준(금액/수량)이 무엇이었는지도 함께 남긴다.
 */

import { DEFAULT_UNIT } from '../constants/units.ts'

const SCALE = 10_000 // unit_price_usd numeric(15,4)

function num(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return n == null || !Number.isFinite(n) ? 0 : n
}

/** 배부 기준: 금액(품목 USD 소계) 또는 수량. */
export type AllocationBasis = 'amount' | 'quantity'

export const BASIS_LABEL: Record<AllocationBasis, string> = {
  amount: '금액(USD 소계) 기준',
  quantity: '수량 기준',
}

/**
 * 총액을 가중치 비율로 정수 배부한다 (최대잔여법).
 * 단순 반올림은 합계가 총액과 어긋나므로, 내림 후 잔여분을 소수부가 큰 행부터 1원씩 준다.
 * 가중치 합이 0이면 배부하지 않는다(전부 0).
 */
export function allocateByWeight(totalKrw: number, weights: number[]): number[] {
  const safe = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0))
  const weightSum = safe.reduce((s, w) => s + w, 0)
  if (weightSum <= 0 || !Number.isFinite(totalKrw)) return safe.map(() => 0)

  const sign = totalKrw < 0 ? -1 : 1
  const abs = Math.round(Math.abs(totalKrw))
  const raw = safe.map((w) => (abs * w) / weightSum)
  const allocated = raw.map(Math.floor)

  let remainder = abs - allocated.reduce((s, v) => s + v, 0)
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (let k = 0; remainder > 0 && k < order.length; k++, remainder--) {
    allocated[order[k].i] += 1
  }

  return allocated.map((v) => v * sign)
}

export interface UnitCostItemInput {
  spec: string | null
  glove_type: string | null
  color: string | null
  size: string | null
  unit: string | null
  unit_price_usd: number | string | null
  quantity: number | string | null
  sort_order?: number | null
}

export interface UnitCostItemRow {
  productName: string
  spec: string
  gloveType: string
  color: string
  size: string
  unit: string
  unitPriceUsd: number
  quantity: number
  subtotalUsd: number
  /** 정산 총액 중 이 품목에 배부된 금액(원). 행 합계 = 정산 총액. */
  allocatedKrw: number
  /** 단위(카톤 등) 1개당 총원가(원). 수량이 없으면 null. */
  unitCostKrw: number | null
}

/** 사양·색상으로 만든 표시용 제품명. 둘 다 비면 '(미입력)'. */
export function productName(item: UnitCostItemInput): string {
  const spec = (item.spec ?? '').trim()
  const color = (item.color ?? '').trim()
  if (spec && color) return `${spec} (${color})`
  return spec || color || '(미입력)'
}

/** 품목 USD 소계 (부동소수 오차 없이 1/10000 USD 정수로 계산). */
export function subtotalUsd(item: UnitCostItemInput): number {
  const qty = Math.trunc(num(item.quantity))
  return (Math.round(num(item.unit_price_usd) * SCALE) * qty) / SCALE
}

/** 정산 총액을 품목에 배부한다. 기준 가중치가 전부 0이면 수량 기준으로 대체한다. */
export function allocateRoundCost(
  items: UnitCostItemInput[],
  totalKrw: number,
  basis: AllocationBasis
): { rows: UnitCostItemRow[]; effectiveBasis: AllocationBasis } {
  const base = items.map((item) => ({
    item,
    qty: Math.trunc(num(item.quantity)),
    sub: subtotalUsd(item),
  }))

  const amountWeights = base.map((b) => Math.round(b.sub * SCALE))
  const qtyWeights = base.map((b) => b.qty)
  const amountUsable = amountWeights.some((w) => w > 0)
  const effectiveBasis: AllocationBasis =
    basis === 'amount' && amountUsable ? 'amount' : 'quantity'
  const weights = effectiveBasis === 'amount' ? amountWeights : qtyWeights

  const allocations = allocateByWeight(totalKrw, weights)

  const rows = base.map((b, i) => ({
    productName: productName(b.item),
    spec: (b.item.spec ?? '').trim(),
    gloveType: (b.item.glove_type ?? '').trim(),
    color: (b.item.color ?? '').trim(),
    size: (b.item.size ?? '').trim(),
    unit: (b.item.unit ?? '').trim() || DEFAULT_UNIT,
    unitPriceUsd: num(b.item.unit_price_usd),
    quantity: b.qty,
    subtotalUsd: b.sub,
    allocatedKrw: allocations[i],
    unitCostKrw: b.qty > 0 ? Math.round(allocations[i] / b.qty) : null,
  }))

  return { rows, effectiveBasis }
}

/** 총액이 무엇으로 구성됐는지 — 세무 자료라 잠정치 여부를 반드시 구분해서 표기한다. */
export type CostBasisKind = 'final' | 'interim_only' | 'none'

export const COST_BASIS_LABEL: Record<CostBasisKind, string> = {
  final: '중간+클로징 확정',
  interim_only: '중간정산만 (잠정)',
  none: '정산 미입력',
}

export interface RoundUnitCost {
  transactionId: string
  roundNo: number
  roundLabel: string
  manufacturer: string
  lcOpenDate: string | null
  customsDate: string | null
  interimKrw: number | null
  closingKrw: number | null
  totalKrw: number
  costBasis: CostBasisKind
  basis: AllocationBasis
  itemsTotalUsd: number
  totalQuantity: number
  /** 총액 ÷ 총수량 — 차수 전체 평균 단위원가. 수량이 없으면 null. */
  averageUnitCostKrw: number | null
  items: UnitCostItemRow[]
}

export interface RoundUnitCostInput {
  transactionId: string
  roundNo: number
  roundLabel: string
  manufacturer: string
  lcOpenDate: string | null
  customsDate: string | null
  interimKrw: number | null
  closingKrw: number | null
  items: UnitCostItemInput[]
}

export function buildRoundUnitCost(
  input: RoundUnitCostInput,
  basis: AllocationBasis
): RoundUnitCost {
  const { interimKrw, closingKrw } = input
  const costBasis: CostBasisKind =
    interimKrw != null && closingKrw != null ? 'final'
    : interimKrw != null ? 'interim_only'
    : 'none'
  const totalKrw = (interimKrw ?? 0) + (closingKrw ?? 0)

  const sorted = [...input.items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const { rows, effectiveBasis } = allocateRoundCost(sorted, totalKrw, basis)

  const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0)
  const itemsTotalUsd = rows.reduce((s, r) => s + r.subtotalUsd, 0)

  return {
    transactionId: input.transactionId,
    roundNo: input.roundNo,
    roundLabel: input.roundLabel,
    manufacturer: input.manufacturer,
    lcOpenDate: input.lcOpenDate,
    customsDate: input.customsDate,
    interimKrw,
    closingKrw,
    totalKrw,
    costBasis,
    basis: effectiveBasis,
    itemsTotalUsd: Math.round(itemsTotalUsd * SCALE) / SCALE,
    totalQuantity,
    averageUnitCostKrw: totalQuantity > 0 ? Math.round(totalKrw / totalQuantity) : null,
    items: rows,
  }
}
