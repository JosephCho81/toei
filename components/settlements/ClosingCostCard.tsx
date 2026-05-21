'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatKrw } from '@/lib/utils/format'
import type { ClosingCalculation } from '@/lib/calculations/closing'

interface CostRow {
  id?: string
  item_name: string
  amount_krw: string
  includes_vat: boolean
}

interface Props {
  closingCostRows: CostRow[]
  onCostChange: (rows: CostRow[]) => void
  isLocked: boolean
  calc: ClosingCalculation | null
}

export function ClosingCostCard({ closingCostRows, onCostChange, isLocked, calc }: Props) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">클로징 추가비용 (A+B+C)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {closingCostRows.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-sm w-6 text-muted-foreground">{String.fromCharCode(65 + i)})</span>
            <Input
              className="flex-1 text-sm"
              value={row.item_name}
              onChange={(e) => onCostChange(closingCostRows.map((r, j) => j === i ? { ...r, item_name: e.target.value } : r))}
              disabled={isLocked}
            />
            <Input
              className="w-36 font-mono text-sm"
              type="number"
              value={row.amount_krw}
              onChange={(e) => onCostChange(closingCostRows.map((r, j) => j === i ? { ...r, amount_krw: e.target.value } : r))}
              disabled={isLocked}
            />
            <label className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <input
                type="checkbox"
                checked={row.includes_vat}
                onChange={(e) => onCostChange(closingCostRows.map((r, j) => j === i ? { ...r, includes_vat: e.target.checked } : r))}
                disabled={isLocked}
              />
              VAT포함
            </label>
          </div>
        ))}
        {calc && (
          <div className="flex justify-between pt-2 text-sm font-semibold">
            <span>소계</span>
            <span className="font-mono">{formatKrw(calc.closingCostsTotalKrw)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
