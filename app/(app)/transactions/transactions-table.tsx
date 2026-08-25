'use client'

import { useState, Fragment } from 'react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_UNIT } from '@/lib/constants/units'
import { TransactionFlagPanel } from '@/components/transactions/TransactionFlagPanel'
import { summarizeAmountChecks, type AmountCheckLevel, type AmountCheckSummary } from '@/lib/calculations/amountCheckSummary'
import { formatDiffUsd } from '@/lib/calculations/itemTotals'
import type { TxFlag, TxAmountCheck } from '@/types/transaction'

/** 대조금액 차이 단계별 표시 */
const CHECK_STYLES: Record<Exclude<AmountCheckLevel, 'none'>, { row: string; badge: string; icon: string; label: string }> = {
  mismatch: {
    row: 'bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20',
    badge: 'text-red-600',
    icon: '🔴',
    label: '금액 불일치',
  },
  minor: {
    row: 'bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/20',
    badge: 'text-amber-600',
    icon: '⚠️',
    label: '금액 차이',
  },
  note: {
    row: '',
    badge: 'text-amber-600',
    icon: '📝',
    label: '검토 메모',
  },
}

const usd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** 확장 행에 펼쳐지는 '어디가 어떻게 다른지' 상세 */
function AmountCheckDetail({ summary }: { summary: AmountCheckSummary }) {
  if (summary.level === 'none') return null
  const style = CHECK_STYLES[summary.level]
  return (
    <div className={cn('mt-3 rounded-md border px-3 py-2 text-xs',
      summary.level === 'mismatch'
        ? 'border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/30'
        : 'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30')}>
      <p className="font-semibold mb-1">
        {style.icon} 토에이 자료 대조 — 품목 합계 {usd(summary.itemsTotalUsd)}
      </p>
      <ul className="space-y-1">
        {summary.entries.map((e, i) => (
          <li key={i} className="flex flex-wrap gap-x-3">
            <span className="font-medium">{e.label}</span>
            <span className="font-mono">{e.amountUsd != null ? usd(e.amountUsd) : '금액 미입력'}</span>
            {e.diff.status !== 'empty' && e.diff.status !== 'match' && (
              <span className={cn('font-mono', e.diff.status === 'mismatch' ? 'text-red-600 font-semibold' : 'text-amber-600')}>
                차액 {formatDiffUsd(e.diff.diffUsd)}
                {e.diff.diffPct != null && ` (${e.diff.diffPct.toFixed(2)}%)`}
              </span>
            )}
            {e.note && <span className="text-muted-foreground">사유: {e.note}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-muted-foreground">상세 수정은 해당 차수 상세보기 → 품목 명세에서.</p>
    </div>
  )
}

type Item = {
  spec: string | null; size: string | null; quantity: number | null
  color: string | null; glove_type: string | null; unit: string | null
  unit_price_usd: number | null; sort_order: number
}

export type { TxRow } from '@/types/transaction'
import type { TxRow } from '@/types/transaction'

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
  const unit = first.unit ?? DEFAULT_UNIT
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

function getEtaDisplay(eta: string | null, deliveryDates: Array<{ seq: number; date: string }> | null): string {
  if (eta) return formatDate(eta) ?? '-'
  if (deliveryDates && deliveryDates.length > 0) return deliveryDates.map((d) => `${d.seq}차: ${d.date}`).join(' / ')
  return '-'
}

export function TransactionTable({ rows, initialFlags = [], amountChecks = [] }: {
  rows: TxRow[]
  initialFlags?: TxFlag[]
  amountChecks?: TxAmountCheck[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [flags, setFlags] = useState<TxFlag[]>(initialFlags)

  function flagsOf(txId: string) {
    return flags.filter((f) => f.transaction_id === txId)
  }

  function replaceFlagsOf(txId: string, next: TxFlag[]) {
    setFlags((p) => [...p.filter((f) => f.transaction_id !== txId), ...next])
  }

  /** 체크 = 오류 있음. 체크 해제 시 열려 있는 항목을 모두 '처리 완료'로 바꾼다(이력 보존). */
  async function toggleError(txId: string, checked: boolean) {
    const current = flagsOf(txId)
    const openFlags = current.filter((f) => f.status === 'open')

    if (checked) {
      if (openFlags.length > 0) return
      const { data, error } = await supabase.from('transaction_flags')
        .insert({ transaction_id: txId, field: '기타' })
        .select('id,transaction_id,field,memo,status,resolved_memo,created_at')
        .single()
      if (error || !data) { toast.error(`오류 표시 실패: ${error?.message ?? '알 수 없는 오류'}`); return }
      replaceFlagsOf(txId, [...current, data as TxFlag])
      setExpandedId(txId)
      return
    }

    if (openFlags.length === 0) return
    replaceFlagsOf(txId, current.map((f) => f.status === 'open' ? { ...f, status: 'resolved' } : f))
    const { error } = await supabase.from('transaction_flags')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .in('id', openFlags.map((f) => f.id))
    if (error) toast.error(`처리 실패: ${error.message}`)
  }

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
                      onCheckedChange={(v) => toggleError(t.id, !!v)}
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
