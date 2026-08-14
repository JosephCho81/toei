'use client'
import type { Product } from '@/lib/products/useProducts'

/** 품목 입력칸의 선택 목록 id — 화면당 한 번만 렌더한다. */
export const ITEM_DATALIST = {
  spec: 'dl-item-spec',
  gloveType: 'dl-item-glove-type',
  color: 'dl-item-color',
  size: 'dl-item-size',
} as const

export const GLOVE_TYPES = ['니트릴', '라텍스', '비닐']
export const SIZES = ['XS', 'S', 'M', 'L', 'XL']

function unique(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v && v.trim() !== ''))]
}

/**
 * 품목 마스터 기반 선택 목록.
 * datalist 이므로 목록에 없는 값도 그대로 직접 입력할 수 있다.
 */
export function ItemDatalists({ products }: { products: Product[] }) {
  const colors = unique([...products.map((p) => p.color)])
  const types = unique([...GLOVE_TYPES, ...products.map((p) => p.glove_type)])
  const sizes = unique([...SIZES, ...products.flatMap((p) => p.size_sequence ?? [])])

  return (
    <>
      <datalist id={ITEM_DATALIST.spec}>
        {products.map((p) => (
          <option key={p.id} value={p.name}>
            {[p.glove_type, p.color].filter(Boolean).join(' ')}
          </option>
        ))}
      </datalist>
      <datalist id={ITEM_DATALIST.gloveType}>
        {types.map((t) => <option key={t} value={t} />)}
      </datalist>
      <datalist id={ITEM_DATALIST.color}>
        {colors.map((c) => <option key={c} value={c} />)}
      </datalist>
      <datalist id={ITEM_DATALIST.size}>
        {sizes.map((s) => <option key={s} value={s} />)}
      </datalist>
    </>
  )
}
