import { DEFAULT_UNIT } from '@/lib/constants/units'
import { findProduct, type Product } from '@/lib/products/useProducts'
import { nextSize, sizeSequenceFor } from '@/lib/products/sizes'

/** 품목 입력 행에서 마스터 자동입력이 관여하는 필드. */
export interface FillableRow {
  spec: string
  glove_type: string
  color: string
  size: string
  unit: string
}

/**
 * 품목명이 마스터와 일치하면 재질·색상·단위를 채운다.
 * 사이즈는 비어 있을 때만 순서의 첫 값을 넣는다(입력한 값을 덮어쓰지 않기 위함).
 */
export function applyProduct(row: FillableRow, products: Product[]): FillableRow {
  const product = findProduct(products, row.spec)
  if (!product) return row
  const sequence = sizeSequenceFor(product.size_sequence, product.glove_type)
  return {
    ...row,
    glove_type: product.glove_type ?? row.glove_type,
    color: product.color ?? row.color,
    unit: product.default_unit || row.unit || DEFAULT_UNIT,
    size: row.size || sequence[0] || '',
  }
}

/**
 * '행 추가' 시 채워 넣을 값.
 * 직전 행의 품목·재질·색상·단위를 이어받고 사이즈만 다음 순서로 넘긴다.
 * 단가·수량은 금액 오입력을 유발할 수 있으므로 절대 복사하지 않는다.
 */
export function nextRowValues(
  rows: FillableRow[],
  products: Product[],
): FillableRow {
  const prev = rows[rows.length - 1]
  if (!prev || !prev.spec) {
    return { spec: '', glove_type: '', color: '', size: '', unit: DEFAULT_UNIT }
  }
  const product = findProduct(products, prev.spec)
  const sequence = sizeSequenceFor(product?.size_sequence, prev.glove_type || product?.glove_type)
  const usedSizes = rows
    .filter((r) => r.spec.trim().toLowerCase() === prev.spec.trim().toLowerCase())
    .map((r) => r.size)
  return {
    spec: prev.spec,
    glove_type: prev.glove_type,
    color: prev.color,
    unit: prev.unit || DEFAULT_UNIT,
    size: nextSize(sequence, usedSizes),
  }
}
