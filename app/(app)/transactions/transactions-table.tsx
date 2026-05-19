'use client'

import { useState, Fragment } from 'react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils/format'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'

type Item = {
  spec: string | null; size: string | null; quantity: number | null
  color: string | null; glove_type: string | null; unit: string | null
  unit_price_usd: number | null; sort_order: number
}

export type TxRow = {
  id: string; round_no: number; round_label: string; order_no: string | null
  lc_open_date: string | null; settlement_status: string; is_locked: boolean
  manufacturers: { name: string } | { name: string }[] | null
  transaction_items: Item[] | null
  containers: { etd: string | null; eta: string | null }[] | null
  delivery_dates: Array<{ seq: number; date: string }> | null
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

function getEtd(containers: { etd: string | null }[]): string | null {
  const dates = containers.map((c) => c.etd).filter(Boolean) as string[]
  return dates.sort()[0] ?? null
}

function getEta(containers: { eta: string | null }[]): string | null {
  const dates = containers.map((c) => c.eta).filter(Boolean) as string[]
  return dates.sort().at(-1) ?? null
}

function formatDeliveryDates(dates: Array<{ seq: number; date: string }> | null): string {
  if (!dates || dates.length === 0) return '-'
  return dates.map((d) => `${d.seq}차: ${d.date}`).join(' / ')
}

export function TransactionTable({ rows }: { rows: TxRow[] }) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
            <TableHead>ETD</TableHead>
            <TableHead>ETA</TableHead>
            <TableHead>납기일</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                등록된 거래가 없습니다.
              </TableCell>
            </TableRow>
          )}
          {rows.map((t) => {
            const done = t.settlement_status === 'closing_done'
            const etd = getEtd(t.containers ?? [])
            const eta = getEta(t.containers ?? [])
            const items = [...(t.transaction_items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
            const isExpanded = expandedId === t.id
            return (
              <Fragment key={t.id}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/transactions/${t.id}`)}
                >
                  <TableCell className="font-medium whitespace-nowrap">{t.round_label}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{t.order_no ?? '-'}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{getMfr(t.manufacturers)}</TableCell>
                  <TableCell
                    className="text-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedId(isExpanded ? null : t.id)
                    }}
                  >
                    <div className="flex items-center gap-1.5 cursor-pointer select-none">
                      <span>{summarizeItems(items)}</span>
                      {items.length > 0 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 font-normal">{items.length}건</Badge>
                      )}
                      {isExpanded
                        ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{formatDate(t.lc_open_date)}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{formatDate(etd)}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{formatDate(eta)}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{formatDeliveryDates(t.delivery_dates)}</TableCell>
                  <TableCell>
                    <Badge variant={done ? 'default' : 'secondary'}>{done ? '완료' : '진행중'}</Badge>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={9} className="pt-0 pb-3 px-6">
                      {items.length === 0
                        ? <p className="text-xs text-muted-foreground py-2">품목 데이터가 없습니다.</p>
                        : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                {['스펙', '색상', '사이즈'].map((h) => (
                                  <th key={h} className="text-left py-1.5 pr-6 font-medium text-muted-foreground">{h}</th>
                                ))}
                                {['단가(USD)', '수량'].map((h) => (
                                  <th key={h} className="text-right py-1.5 pr-6 font-medium text-muted-foreground">{h}</th>
                                ))}
                                <th className="text-left py-1.5 font-medium text-muted-foreground">단위</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item, i) => (
                                <tr key={i} className="border-b border-dashed last:border-0">
                                  <td className="py-1.5 pr-6">{item.spec || '-'}</td>
                                  <td className="py-1.5 pr-6">{item.color || '-'}</td>
                                  <td className="py-1.5 pr-6">{item.size || '-'}</td>
                                  <td className="py-1.5 pr-6 text-right font-mono">
                                    {item.unit_price_usd != null ? `$${Number(item.unit_price_usd).toFixed(2)}` : '-'}
                                  </td>
                                  <td className="py-1.5 pr-6 text-right">
                                    {item.quantity != null ? item.quantity.toLocaleString('ko-KR') : '-'}
                                  </td>
                                  <td className="py-1.5">{item.unit || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
