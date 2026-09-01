'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/NumberInput'
import { TableCell, TableRow } from '@/components/ui/table'
import { Trash2 } from 'lucide-react'
import { itemSubtotalUsd } from '@/lib/calculations/itemTotals'
import type { ItemEditRow } from '@/lib/data/transactionItems'
import { usdLabel } from './AmountCheckRows'

export const TEXT_COLS = ['spec', 'glove_type', 'color', 'size'] as const
export const COL_LABELS = ['품목', '종류', '색상', '사이즈']

type TextCol = typeof TEXT_COLS[number]
type Field = keyof Omit<ItemEditRow, '_key' | 'id'>

export function ItemEditRowView({ row, rowIndex, isLocked, datalists, cellProps, onUpdate, onRemove, canRemove }: {
  row: ItemEditRow
  rowIndex: number
  isLocked: boolean
  datalists: Record<TextCol, string>
  cellProps: (r: number, c: number) => Record<string, unknown>
  onUpdate: (field: Field, value: string) => void
  onRemove: () => void
  canRemove: boolean
}) {
  return (
    <TableRow>
      {TEXT_COLS.map((f, colIndex) => (
        <TableCell key={f} className="p-1">
          {isLocked
            ? <span className="text-sm px-2">{row[f] || '-'}</span>
            : <Input className="h-7 text-xs" value={row[f]} list={datalists[f]}
                onChange={(e) => onUpdate(f, e.target.value)}
                {...cellProps(rowIndex, colIndex)} />}
        </TableCell>
      ))}
      {(['unit_price_usd', 'quantity'] as const).map((f, i) => (
        <TableCell key={f} className="p-1">
          {isLocked
            ? <span className="text-sm px-2 block text-right">{row[f] || '-'}</span>
            : <NumberInput className="h-7 text-xs text-right w-24" value={row[f]}
                onValueChange={(v) => onUpdate(f, v)}
                {...cellProps(rowIndex, 4 + i)} />}
        </TableCell>
      ))}
      <TableCell className="p-1">
        {isLocked
          ? <span className="text-sm px-2">{row.unit}</span>
          : <Input className="h-7 text-xs w-14" value={row.unit}
              onChange={(e) => onUpdate('unit', e.target.value)}
              {...cellProps(rowIndex, 6)} />}
      </TableCell>
      <TableCell className="text-right text-sm font-medium pr-3">
        {usdLabel(itemSubtotalUsd(row))}
      </TableCell>
      {!isLocked && (
        <TableCell className="p-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
            onClick={onRemove} disabled={!canRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  )
}
