import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_UNIT } from '@/lib/constants/units'
import { PRODUCT_SELECT, type Product } from './useProducts'
import { sizeSequenceFor } from './sizes'
import { syncRows } from '@/lib/data/syncRows'

export interface ProductRow {
  _key: string
  id?: string
  name: string
  glove_type: string
  color: string
  default_unit: string
  /** 쉼표 구분 문자열로 편집한다 */
  size_sequence: string
  is_active: boolean
}

export function blankProductRow(): ProductRow {
  return {
    _key: crypto.randomUUID(),
    name: '', glove_type: '', color: '',
    default_unit: DEFAULT_UNIT, size_sequence: 'S, M, L', is_active: true,
  }
}

function toRow(p: Product): ProductRow {
  return {
    _key: crypto.randomUUID(),
    id: p.id,
    name: p.name,
    glove_type: p.glove_type ?? '',
    color: p.color ?? '',
    default_unit: p.default_unit || DEFAULT_UNIT,
    size_sequence: (p.size_sequence ?? []).join(', '),
    is_active: p.is_active,
  }
}

function parseSizes(v: string): string[] {
  return v.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
}

export async function loadProductRows(supabase: SupabaseClient): Promise<ProductRow[]> {
  const { data, error } = await supabase.from('products')
    .select(PRODUCT_SELECT).order('sort_order').order('name')
  if (error) throw new Error(`품목 마스터를 불러오지 못했습니다: ${error.message}`)
  return ((data as Product[] | null) ?? []).map(toRow)
}

export async function saveProductRows(
  supabase: SupabaseClient,
  rows: ProductRow[],
): Promise<string[]> {
  return syncRows(supabase, {
    // 마스터 테이블이라 부모가 없다 — 화면 목록이 곧 테이블 전체다
    table: 'products',
    rows: rows.filter((r) => r.name.trim()),
    toPayload: (r, i) => ({
      name: r.name.trim(),
      glove_type: r.glove_type.trim() || null,
      color: r.color.trim() || null,
      default_unit: r.default_unit.trim() || DEFAULT_UNIT,
      size_sequence: parseSizes(r.size_sequence).length
        ? parseSizes(r.size_sequence)
        : sizeSequenceFor(null, r.name),
      is_active: r.is_active,
      sort_order: i,
    }),
  })
}

const mostCommon = (values: string[]): string =>
  [...values.reduce((m, v) => m.set(v, (m.get(v) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

/** 기존 거래 품목에서 마스터에 없는 품목명을 끌어온다(재질·색상·단위는 최빈값). */
export async function importProductsFromTransactions(
  supabase: SupabaseClient,
  existingRows: ProductRow[],
): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from('transaction_items')
    .select('spec,glove_type,color,unit')
    .not('spec', 'is', null)
    .limit(5000)
  if (error) throw new Error(error.message)

  type Entry = { types: string[]; colors: string[]; units: string[] }
  const bySpec = new Map<string, Entry>()
  for (const it of (data ?? []) as { spec: string; glove_type: string | null; color: string | null; unit: string | null }[]) {
    const key = it.spec.trim()
    if (!key) continue
    const entry = bySpec.get(key) ?? { types: [], colors: [], units: [] }
    if (it.glove_type) entry.types.push(it.glove_type)
    if (it.color) entry.colors.push(it.color)
    if (it.unit) entry.units.push(it.unit)
    bySpec.set(key, entry)
  }

  const existing = new Set(existingRows.map((r) => r.name.trim().toLowerCase()))
  return [...bySpec]
    .filter(([name]) => !existing.has(name.toLowerCase()))
    .map(([name, entry]) => ({
      ...blankProductRow(),
      name,
      glove_type: mostCommon(entry.types),
      color: mostCommon(entry.colors),
      default_unit: mostCommon(entry.units) || DEFAULT_UNIT,
      size_sequence: sizeSequenceFor(null, name).join(', '),
    }))
}
