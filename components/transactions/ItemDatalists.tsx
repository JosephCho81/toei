'use client'
import { findProduct, type Product } from '@/lib/products/useProducts'
import { sizeSequenceFor } from '@/lib/products/sizes'

/** 품목 입력칸의 선택 목록 id — 화면당 한 번만 렌더한다. */
export const ITEM_DATALIST = {
  spec: 'dl-item-spec',
  gloveType: 'dl-item-glove-type',
  color: 'dl-item-color',
  size: 'dl-item-size',
} as const

export const GLOVE_TYPES = ['니트릴', '라텍스', '비닐']
/** 마스터에 없는 품목을 입력할 때 쓰는 일반 목록. XS 는 A1 제품 전용이라 넣지 않는다. */
const SIZES = ['S', 'M', 'L', 'XL']

function unique(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v && v.trim() !== ''))]
}

/** 선택한 품목에 등록된 사이즈만 보여주기 위한 목록 id. 마스터에 없으면 일반 목록. */
function sizeListId(product: Product | undefined): string {
  return product ? `dl-item-size-${product.id}` : ITEM_DATALIST.size
}

/** 선택한 품목(같은 재질 계열)에 등록된 색상만 보여주기 위한 목록 id. */
function colorListId(product: Product | undefined): string {
  return product ? `dl-item-color-${product.id}` : ITEM_DATALIST.color
}

/** 품목명으로 마스터를 찾아 사이즈·색상 목록 id 를 돌려준다. */
export function listIdsForSpec(products: Product[], spec: string) {
  const product = findProduct(products, spec)
  return { size: sizeListId(product), color: colorListId(product) }
}

/** 같은 재질 계열의 색상 (자기 색상이 맨 앞). */
function colorsFor(product: Product, products: Product[]): string[] {
  const sameType = product.glove_type
    ? products.filter((p) => p.glove_type === product.glove_type)
    : []
  return unique([product.color, ...sameType.map((p) => p.color)])
}

/**
 * 품목 마스터 기반 선택 목록.
 * datalist 이므로 목록에 없는 값도 그대로 직접 입력할 수 있다.
 */
export function ItemDatalists({ products }: { products: Product[] }) {
  const colors = unique(products.map((p) => p.color))
  const types = unique([...GLOVE_TYPES, ...products.map((p) => p.glove_type)])

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
        {SIZES.map((s) => <option key={s} value={s} />)}
      </datalist>

      {/* 품목별 목록 — 품목을 고르면 그 품목에 있는 사이즈·색상만 보인다 */}
      {products.map((p) => (
        <datalist key={`size-${p.id}`} id={sizeListId(p)}>
          {sizeSequenceFor(p.size_sequence, p.name).map((s) => <option key={s} value={s} />)}
        </datalist>
      ))}
      {products.map((p) => (
        <datalist key={`color-${p.id}`} id={colorListId(p)}>
          {colorsFor(p, products).map((c) => <option key={c} value={c} />)}
        </datalist>
      ))}
    </>
  )
}
