'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Product {
  id: string
  name: string
  glove_type: string | null
  color: string | null
  default_unit: string
  size_sequence: string[] | null
  is_active: boolean
  sort_order: number
}

export const PRODUCT_SELECT = 'id,name,glove_type,color,default_unit,size_sequence,is_active,sort_order'

/** 활성 품목 마스터 목록. 마스터가 비어 있어도 직접 입력이 가능하므로 실패는 무시한다. */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase.from('products').select(PRODUCT_SELECT)
      .eq('is_active', true)
      .order('sort_order').order('name')
      .then(({ data }) => {
        if (!active) return
        setProducts((data as Product[] | null) ?? [])
        setLoaded(true)
      })
    return () => { active = false }
  }, [])

  return { products, loaded }
}

/** 품목명(대소문자·공백 무시)으로 마스터 찾기. */
export function findProduct(products: Product[], name: string | null | undefined): Product | undefined {
  const key = (name ?? '').trim().toLowerCase()
  if (!key) return undefined
  return products.find((p) => p.name.trim().toLowerCase() === key)
}
