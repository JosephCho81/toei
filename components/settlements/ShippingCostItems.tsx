'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import { computeVat } from '@/lib/calculations/interim'

export interface CostRow {
  id?: string
  item_name: string
  amount_krw: string
  is_vat_taxable: boolean
  vat_amount_krw: string
}

export const DEFAULT_SHIPPING: CostRow[] = [
  { item_name: '해상운임', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' },
  { item_name: '터미널 처리비(THC)', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' },
  { item_name: '서류발급비(D/O Fee)', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' },
  { item_name: '내륙운송비', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' },
  { item_name: '기타운임', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' },
]

interface Props { rows: CostRow[]; onChange: (rows: CostRow[]) => void; isLocked: boolean }

export function CostItemsGroup({ title, rows, onChange, isLocked }: Props & { title: string }) {
  function upd(i: number, field: keyof CostRow, value: string | boolean) {
    onChange(rows.map((r, j) => {
      if (j !== i) return r
      const next = { ...r, [field]: value }
      if (field === 'amount_krw' && next.is_vat_taxable)
        next.vat_amount_krw = String(computeVat(parseFloat(String(value)) || 0))
      if (field === 'is_vat_taxable')
        next.vat_amount_krw = value ? String(computeVat(parseFloat(r.amount_krw) || 0)) : '0'
      return next
    }))
  }

  const subtotal = rows.reduce((s, r) => s + (parseFloat(r.amount_krw) || 0), 0)
  const vatTotal = rows.reduce((s, r) =>
    s + (r.is_vat_taxable ? computeVat(parseFloat(r.amount_krw) || 0) : (parseFloat(r.vat_amount_krw) || 0)), 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {!isLocked && (
          <Button size="sm" variant="outline"
            onClick={() => onChange([...rows, { item_name: '', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' }])}>
            <Plus className="h-4 w-4 mr-1" />행 추가
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1 pb-1">
          <span className="col-span-4">항목명</span><span className="col-span-3">금액(원)</span>
          <span className="col-span-2 text-center">부가세</span><span className="col-span-2">부가세(원)</span>
          <span className="col-span-1" />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center mb-1">
            <Input className="col-span-4 h-7 text-xs" value={r.item_name}
              onChange={(e) => upd(i, 'item_name', e.target.value)} disabled={isLocked} />
            <Input className="col-span-3 h-7 text-xs font-mono" type="number"
              value={r.amount_krw} onChange={(e) => upd(i, 'amount_krw', e.target.value)} disabled={isLocked} />
            <div className="col-span-2 flex justify-center">
              <input type="checkbox" checked={r.is_vat_taxable}
                onChange={(e) => upd(i, 'is_vat_taxable', e.target.checked)} disabled={isLocked} className="h-4 w-4" />
            </div>
            <Input className="col-span-2 h-7 text-xs font-mono" type="number"
              value={r.is_vat_taxable ? computeVat(parseFloat(r.amount_krw) || 0) : (parseFloat(r.vat_amount_krw) || 0)}
              readOnly={r.is_vat_taxable} onChange={(e) => upd(i, 'vat_amount_krw', e.target.value)} disabled={isLocked} />
            {!isLocked && (
              <Button variant="ghost" size="icon" className="col-span-1 h-7 w-7 text-destructive"
                onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
        <div className="flex justify-between pt-2 text-sm font-semibold border-t mt-1">
          <span>소계</span>
          <span className="font-mono">{subtotal.toLocaleString('ko-KR')}원 (VAT {vatTotal.toLocaleString('ko-KR')}원)</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function ShippingCostItems(props: Props) {
  return <CostItemsGroup title="그룹 A: 해상운임 세부 내역" {...props} />
}
