'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'

export type ItemRow = {
  _key: string
  spec: string; glove_type: string; color: string; size: string
  unit_price_usd: string; quantity: string; unit: string
}

export function blankItem(): ItemRow {
  return {
    _key: crypto.randomUUID(),
    spec: '', glove_type: '', color: '', size: '',
    unit_price_usd: '', quantity: '', unit: 'DZ',
  }
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL']
const TYPES = ['nitrile', 'latex', 'vinyl']

interface Props {
  items: ItemRow[]
  onChange: (items: ItemRow[]) => void
}

export function ItemsInputSection({ items, onChange }: Props) {
  function upd(key: string, field: keyof Omit<ItemRow, '_key'>, value: string) {
    onChange(items.map((r) => r._key === key ? { ...r, [field]: value } : r))
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              {['스펙','종류','색상/g','사이즈','단가(USD)','수량','단위','소계',''].map((h, i) => (
                <th key={i} className={`pb-1 pr-1 font-medium ${i >= 4 && i <= 7 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const sub = (parseFloat(r.unit_price_usd) || 0) * (parseInt(r.quantity) || 0)
              return (
                <tr key={r._key} className="border-b border-dashed">
                  <td className="py-1 pr-1">
                    <Input className="h-7 text-xs w-24" value={r.spec} onChange={(e) => upd(r._key, 'spec', e.target.value)} />
                  </td>
                  <td className="py-1 pr-1">
                    <Select value={r.glove_type} onValueChange={(v) => upd(r._key, 'glove_type', v ?? '')}>
                      <SelectTrigger className="h-7 text-xs w-20"><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="py-1 pr-1">
                    <Input className="h-7 text-xs w-20" value={r.color} onChange={(e) => upd(r._key, 'color', e.target.value)} />
                  </td>
                  <td className="py-1 pr-1">
                    <Select value={r.size} onValueChange={(v) => upd(r._key, 'size', v ?? '')}>
                      <SelectTrigger className="h-7 text-xs w-16"><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>{SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="py-1 pr-1">
                    <Input className="h-7 text-xs text-right w-20" type="number" step="0.01" value={r.unit_price_usd} onChange={(e) => upd(r._key, 'unit_price_usd', e.target.value)} />
                  </td>
                  <td className="py-1 pr-1">
                    <Input className="h-7 text-xs text-right w-20" type="number" value={r.quantity} onChange={(e) => upd(r._key, 'quantity', e.target.value)} />
                  </td>
                  <td className="py-1 pr-1">
                    <Input className="h-7 text-xs w-12" value={r.unit} onChange={(e) => upd(r._key, 'unit', e.target.value)} />
                  </td>
                  <td className="py-1 pr-1 text-right font-medium whitespace-nowrap">${sub.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
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
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, blankItem()])}>
        <Plus className="h-4 w-4 mr-1" />품목 추가
      </Button>
    </div>
  )
}
