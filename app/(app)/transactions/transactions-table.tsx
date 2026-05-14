import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatUsd } from '@/lib/utils/format'
import Link from 'next/link'

type Item = {
  spec: string | null; size: string | null; unit_price_usd: number | null
  quantity: number | null; unit: string | null; color: string | null; sort_order: number
}
type ContainerRow = { etd: string | null; eta: string | null }

export type TxRow = {
  id: string; round_no: number; round_label: string; order_no: string | null
  lc_open_date: string | null; import_amount_usd: number | null; margin_rate_pct: number | null
  settlement_status: string; is_locked: boolean
  manufacturers: { name: string } | { name: string }[] | null
  transaction_items: Item[] | null
  containers: ContainerRow[] | null
  closing_settlements: { paid_date: string | null }[] | null
  settlement_deadlines: { due_date: string; deadline_type: string }[] | null
}

function getMfr(raw: TxRow['manufacturers']): string {
  if (!raw) return '-'
  if (Array.isArray(raw)) return raw[0]?.name ?? '-'
  return (raw as { name: string }).name ?? '-'
}

function minDate(dates: (string | null)[]): string | null {
  const valid = dates.filter(Boolean) as string[]
  return valid.length ? valid.sort()[0] : null
}

function maxDate(dates: (string | null)[]): string | null {
  const valid = dates.filter(Boolean) as string[]
  return valid.length ? valid.sort().at(-1)! : null
}

const HEADS = [
  '회차','P/O No.','L/C 개설일','입금일(A1)','LC 만기',
  '수입금액(USD)','총판매금액(마진율%)','지불형태','제조사명',
  '스펙','사이즈','단가(USD)','수량','단위','색상/g','ETD','ETA','완료여부',
]

export function TransactionTable({ rows }: { rows: TxRow[] }) {
  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {HEADS.map(h => (
              <TableHead key={h} className="whitespace-nowrap text-xs">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(t => {
            const items = [...(t.transaction_items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
            const fi = items[0] ?? null
            const extra = Math.max(0, items.length - 1)
            const lcDeadline = t.settlement_deadlines?.find(d => d.deadline_type === 'lc_payment')
            const paidDate = t.closing_settlements?.[0]?.paid_date ?? null
            const done = t.settlement_status === 'closing_done'
            const usd = t.import_amount_usd != null ? Number(t.import_amount_usd) : null
            const mr = t.margin_rate_pct != null ? Number(t.margin_rate_pct) : null
            const totalSales = usd != null && mr != null ? usd * (1 + mr / 100) : null
            return (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap text-sm font-medium">
                  <Link href={`/transactions/${t.id}`} className="hover:underline">{t.round_label}</Link>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">{t.order_no ?? '-'}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{formatDate(t.lc_open_date)}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{formatDate(paidDate)}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{formatDate(lcDeadline?.due_date ?? null)}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-sm">{usd != null ? formatUsd(usd) : '-'}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {totalSales != null ? (
                    <>{formatUsd(totalSales)}<span className="ml-1 text-muted-foreground text-xs">({mr}%)</span></>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-sm">-</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{getMfr(t.manufacturers)}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {fi?.spec ?? '-'}
                  {extra > 0 && <Badge variant="secondary" className="ml-1 text-xs">+{extra}개</Badge>}
                </TableCell>
                <TableCell className="text-sm">{fi?.size ?? '-'}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-sm">
                  {fi?.unit_price_usd != null ? formatUsd(Number(fi.unit_price_usd)) : '-'}
                </TableCell>
                <TableCell className="text-sm">{fi?.quantity ?? '-'}</TableCell>
                <TableCell className="text-sm">{fi?.unit ?? '-'}</TableCell>
                <TableCell className="text-sm">{fi?.color ?? '-'}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatDate(minDate((t.containers ?? []).map(c => c.etd)))}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatDate(maxDate((t.containers ?? []).map(c => c.eta)))}
                </TableCell>
                <TableCell>
                  <Badge variant={done ? 'default' : 'secondary'}>{done ? '완료' : '진행중'}</Badge>
                </TableCell>
              </TableRow>
            )
          })}
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={18} className="text-center text-muted-foreground py-8">
                등록된 거래가 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
