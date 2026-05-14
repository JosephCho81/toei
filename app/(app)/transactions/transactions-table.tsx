'use client'

import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils/format'
import { useRouter } from 'next/navigation'

type Item = {
  spec: string | null; size: string | null; quantity: number | null
  color: string | null; glove_type: string | null; unit: string | null; sort_order: number
}

export type TxRow = {
  id: string; round_no: number; round_label: string; order_no: string | null
  lc_open_date: string | null; settlement_status: string; is_locked: boolean
  manufacturers: { name: string } | { name: string }[] | null
  transaction_items: Item[] | null
  containers: { etd: string | null; eta: string | null }[] | null
}

function getMfr(raw: TxRow['manufacturers']): string {
  if (!raw) return '-'
  if (Array.isArray(raw)) return raw[0]?.name ?? '-'
  return (raw as { name: string }).name ?? '-'
}

function summarizeItems(items: Item[]): string {
  if (!items.length) return '-'
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order)
  const first = sorted[0]
  const label = [first.glove_type, first.color].filter(Boolean).join(' ')
  const sizes = [...new Set(sorted.map((i) => i.size).filter(Boolean as unknown as (v: string | null) => v is string))].join('/')
  const total = sorted.reduce((s, i) => s + (i.quantity ?? 0), 0)
  const unit = first.unit ?? 'Cases'
  const parts = [label || first.spec, sizes, total > 0 ? `${total.toLocaleString('ko-KR')} ${unit}` : '']
  return parts.filter(Boolean).join(' · ')
}

function getEta(containers: { eta: string | null }[]): string | null {
  const dates = containers.map((c) => c.eta).filter(Boolean) as string[]
  return dates.sort().at(-1) ?? null
}

export function TransactionTable({ rows }: { rows: TxRow[] }) {
  const router = useRouter()

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>회차</TableHead>
            <TableHead>P/O No.</TableHead>
            <TableHead>제조사</TableHead>
            <TableHead>품목</TableHead>
            <TableHead>LC 개설일</TableHead>
            <TableHead>ETA</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                등록된 거래가 없습니다.
              </TableCell>
            </TableRow>
          )}
          {rows.map((t) => {
            const done = t.settlement_status === 'closing_done'
            const eta = getEta(t.containers ?? [])
            return (
              <TableRow
                key={t.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/transactions/${t.id}`)}
              >
                <TableCell className="font-medium whitespace-nowrap">{t.round_label}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">{t.order_no ?? '-'}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">{getMfr(t.manufacturers)}</TableCell>
                <TableCell className="text-sm">{summarizeItems(t.transaction_items ?? [])}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">{formatDate(t.lc_open_date)}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">{formatDate(eta)}</TableCell>
                <TableCell>
                  <Badge variant={done ? 'default' : 'secondary'}>{done ? '완료' : '진행중'}</Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
