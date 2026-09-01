'use client'

import { useState, Fragment } from 'react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TransactionFlagPanel } from '@/components/transactions/TransactionFlagPanel'
import { AmountCheckDetail, CHECK_STYLES } from '@/components/transactions/AmountCheckDetail'
import { summarizeAmountChecks } from '@/lib/calculations/amountCheckSummary'
import { getEta, getEtaDisplay, getEtd, getMfr, summarizeItems } from '@/lib/transactions/rowSummary'
import { useTxFlags } from '@/lib/transactions/useTxFlags'
import type { TxFlag, TxAmountCheck } from '@/types/transaction'

export type { TxRow } from '@/types/transaction'
import type { TxRow } from '@/types/transaction'

export function TransactionTable({ rows, initialFlags = [], amountChecks = [] }: {
  rows: TxRow[]
  initialFlags?: TxFlag[]
  amountChecks?: TxAmountCheck[]
}) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { flagsOf, replaceFlagsOf, toggleError } = useTxFlags(initialFlags)

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">오류</TableHead>
            <TableHead>회차</TableHead>
            <TableHead>P/O No.</TableHead>
            <TableHead>제조사</TableHead>
            <TableHead>품목</TableHead>
            <TableHead>LC 개설일</TableHead>
            <TableHead>ETD</TableHead>
            <TableHead>ETA</TableHead>
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
            const txFlags = flagsOf(t.id)
            const checkSummary = summarizeAmountChecks(
              items,
              amountChecks.filter((c) => c.transaction_id === t.id)
            )
            const checkStyle = checkSummary.level === 'none' ? null : CHECK_STYLES[checkSummary.level]
            const openFlags = txFlags.filter((f) => f.status === 'open')
            const hasError = openFlags.length > 0
            return (
              <Fragment key={t.id}>
                <TableRow
                  className={cn(
                    'cursor-pointer hover:bg-muted/50',
                    !hasError && checkStyle?.row,
                    hasError && 'border-l-4 border-l-red-500 bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20'
                  )}
                  onClick={() => router.push(`/transactions/${t.id}`)}
                >
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={hasError}
                      aria-label="오류 표시"
                      onCheckedChange={async (v) => { if (await toggleError(t.id, !!v)) setExpandedId(t.id) }}
                    />
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {t.round_label}
                    {hasError && (
                      <span className="ml-1.5 text-xs text-red-600 font-normal">
                        🔴 {openFlags.length}건
                      </span>
                    )}
                    {checkStyle && (
                      <span
                        className={cn('ml-1.5 text-xs font-normal', checkStyle.badge)}
                        title="품목을 눌러 펼치면 어디가 다른지 볼 수 있습니다"
                      >
                        {checkStyle.icon} {checkStyle.label} {checkSummary.entries.length}건
                      </span>
                    )}
                  </TableCell>
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
                  <TableCell className="text-sm whitespace-nowrap">{getEtaDisplay(eta, t.delivery_dates)}</TableCell>
                  <TableCell>
                    <Badge variant={done ? 'default' : 'secondary'}>{done ? '완료' : '진행중'}</Badge>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30" onClick={(e) => e.stopPropagation()}>
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
                                    {item.unit_price_usd != null ? `$${Number(item.unit_price_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
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
                      <AmountCheckDetail summary={checkSummary} />
                      <TransactionFlagPanel
                        transactionId={t.id}
                        flags={txFlags}
                        onChange={(next) => replaceFlagsOf(t.id, next)}
                      />
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
