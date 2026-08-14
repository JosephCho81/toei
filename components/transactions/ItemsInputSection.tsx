'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { DEFAULT_UNIT } from '@/lib/constants/units'
import { useProducts } from '@/lib/products/useProducts'
import { applyProduct, nextRowValues } from '@/lib/products/rowFill'
import { useGridNav } from '@/lib/hooks/useGridNav'
import { ItemDatalists, ITEM_DATALIST } from './ItemDatalists'
import { itemSubtotalUsd } from '@/lib/calculations/itemTotals'

export type ItemRow = {
  _key: string
  spec: string; glove_type: string; color: string; size: string
  unit_price_usd: string; quantity: string; unit: string
}

export function blankItem(): ItemRow {
  return {
    _key: crypto.randomUUID(),
    spec: '', glove_type: '', color: '', size: '',
    unit_price_usd: '', quantity: '', unit: DEFAULT_UNIT,
  }
}

interface Props {
  items: ItemRow[]
  onChange: (items: ItemRow[]) => void
}

export function ItemsInputSection({ items, onChange }: Props) {
  const { products } = useProducts()
  const { cellProps } = useGridNav('items-new')

  function upd(key: string, field: keyof Omit<ItemRow, '_key'>, value: string) {
    onChange(items.map((r) => {
      if (r._key !== key) return r
      const next = { ...r, [field]: value }
      // 품목명을 마스터에서 고르면 재질·색상·단위를 자동으로 채운다
      return field === 'spec' ? { ...next, ...applyProduct(next, products) } : next
    }))
  }

  function addRow() {
    onChange([...items, { ...blankItem(), ...nextRowValues(items, products) }])
  }

  return (
    <div className="space-y-2">
      <ItemDatalists products={products} />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              {['품목','종류','색상/g','사이즈','단가(USD)','수량','단위','소계',''].map((h, i) => (
                <th key={i} className={`pb-1 pr-1 font-medium ${i >= 4 && i <= 7 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((r, rowIndex) => {
              const sub = itemSubtotalUsd(r)
              return (
                <tr key={r._key} className="border-b border-dashed">
                  <td className="py-1 pr-1">
                    <Input className="h-7 text-xs w-40" list={ITEM_DATALIST.spec}
                      placeholder="선택 또는 입력"
                      value={r.spec} onChange={(e) => upd(r._key, 'spec', e.target.value)}
                      {...cellProps(rowIndex, 0)} />
                  </td>
                  <td className="py-1 pr-1">
                    <Input className="h-7 text-xs w-20" list={ITEM_DATALIST.gloveType}
                      value={r.glove_type} onChange={(e) => upd(r._key, 'glove_type', e.target.value)}
                      {...cellProps(rowIndex, 1)} />
                  </td>
                  <td className="py-1 pr-1">
                    <Input className="h-7 text-xs w-24" list={ITEM_DATALIST.color}
                      value={r.color} onChange={(e) => upd(r._key, 'color', e.target.value)}
                      {...cellProps(rowIndex, 2)} />
                  </td>
                  <td className="py-1 pr-1">
                    <Input className="h-7 text-xs w-16" list={ITEM_DATALIST.size}
                      value={r.size} onChange={(e) => upd(r._key, 'size', e.target.value)}
                      {...cellProps(rowIndex, 3)} />
                  </td>
                  <td className="py-1 pr-1">
                    <Input className="h-7 text-xs text-right w-20" type="number" step="0.01" value={r.unit_price_usd}
                      onChange={(e) => upd(r._key, 'unit_price_usd', e.target.value)}
                      {...cellProps(rowIndex, 4)} />
                  </td>
                  <td className="py-1 pr-1">
                    <Input className="h-7 text-xs text-right w-20" type="number" value={r.quantity}
                      onChange={(e) => upd(r._key, 'quantity', e.target.value)}
                      {...cellProps(rowIndex, 5)} />
                  </td>
                  <td className="py-1 pr-1">
                    <Input className="h-7 text-xs w-14" value={r.unit}
                      onChange={(e) => upd(r._key, 'unit', e.target.value)}
                      {...cellProps(rowIndex, 6)} />
                  </td>
                  <td className="py-1 pr-1 text-right font-medium whitespace-nowrap">${sub.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-1">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => onChange(items.filter((x) => x._key !== r._key))}
                      disabled={items.length <= 1}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" />품목 추가
        </Button>
        <span className="text-xs text-muted-foreground">↑·↓ 로 위아래 칸 이동, Tab 으로 오른쪽 이동</span>
      </div>
    </div>
  )
}
