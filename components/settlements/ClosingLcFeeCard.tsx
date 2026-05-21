'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import { formatKrw } from '@/lib/utils/format'
import type { ClosingCalculation } from '@/lib/calculations/closing'

interface FeeRow {
  id?: string
  item_name: string
  amount_krw: string
}

function CalcRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

interface Props {
  lcFeeRows: FeeRow[]
  onLcFeeChange: (rows: FeeRow[]) => void
  isLocked: boolean
  calc: ClosingCalculation | null
  fxBurdenA1Pct: number
  onFxBurdenChange: (v: number) => void
}

export function ClosingLcFeeCard({
  lcFeeRows, onLcFeeChange, isLocked, calc, fxBurdenA1Pct, onFxBurdenChange,
}: Props) {
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">LC 수수료</CardTitle>
          {!isLocked && (
            <Button size="sm" variant="outline" onClick={() => onLcFeeChange([...lcFeeRows, { item_name: '', amount_krw: '0' }])}>
              <Plus className="h-4 w-4 mr-1" />항목 추가
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {lcFeeRows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                className="flex-1 text-sm"
                value={row.item_name}
                onChange={(e) => onLcFeeChange(lcFeeRows.map((r, j) => j === i ? { ...r, item_name: e.target.value } : r))}
                disabled={isLocked}
              />
              <Input
                className="w-36 font-mono text-sm"
                type="number"
                value={row.amount_krw}
                onChange={(e) => onLcFeeChange(lcFeeRows.map((r, j) => j === i ? { ...r, amount_krw: e.target.value } : r))}
                disabled={isLocked}
              />
              {!isLocked && i >= 6 && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onLcFeeChange(lcFeeRows.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          {calc && (
            <div className="flex justify-between pt-2 text-sm font-semibold">
              <span>LC 수수료 합계</span>
              <span className="font-mono">{formatKrw(calc.lcFeeTotalKrw)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">환차손익 분담 비율</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>에이원 {fxBurdenA1Pct}%</span>
            <span>토에이 {100 - fxBurdenA1Pct}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={fxBurdenA1Pct}
            onChange={(e) => onFxBurdenChange(parseInt(e.target.value))}
            disabled={isLocked}
            className="w-full"
          />
          {calc && (
            <div className="space-y-1 text-sm">
              <CalcRow label="추가비용 합계" value={`${calc.additionalCostKrw >= 0 ? '+' : ''}${formatKrw(calc.additionalCostKrw)}`} />
              <CalcRow label="에이원 부담분" value={`${calc.a1BurdenKrw >= 0 ? '+' : ''}${formatKrw(calc.a1BurdenKrw)}`} />
              <CalcRow label="에이원 부담분 + VAT" value={`${calc.a1BurdenWithVatKrw >= 0 ? '+' : ''}${formatKrw(calc.a1BurdenWithVatKrw)}`} bold />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
