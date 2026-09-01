import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatKrw } from '@/lib/utils/format'

export interface FeeItem { item_name: string; amount_krw: number }

export function signed(n: number) {
  return `${n >= 0 ? '+' : ''}${formatKrw(n)}`
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex text-sm py-1 border-b last:border-0">
      <span className="w-48 text-muted-foreground shrink-0 font-medium">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

export function AmountRow({ label, value, color, bold, formula }: {
  label: string; value: string; color?: string; bold?: boolean; formula?: string
}) {
  return (
    <div className="py-0.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-mono ${bold ? 'font-semibold' : 'font-medium'} ${color ?? ''}`}>{value}</span>
      </div>
      {formula && <p className="text-xs text-gray-400 mt-0.5 font-mono">{formula}</p>}
    </div>
  )
}

export function FeeTable({ title, items, footerLabel, footerValue }: {
  title: string; items: FeeItem[]; footerLabel: string; footerValue: number
}) {
  if (!items.length) return null
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-muted-foreground mb-1">{title}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>항목</TableHead>
            <TableHead className="text-right">금액(원)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((f, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm">{f.item_name}</TableCell>
              <TableCell className="text-right text-sm font-mono">{f.amount_krw.toLocaleString('ko-KR')}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/50 font-semibold">
            <TableCell className="text-sm">{footerLabel}</TableCell>
            <TableCell className="text-right text-sm font-mono">{footerValue.toLocaleString('ko-KR')}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
