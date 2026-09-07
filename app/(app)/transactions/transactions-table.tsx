'use client'

import { useState, Fragment } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { TABLE, TABLE_WRAP, TH, TD, THEAD_ROW, CENTER, NUM, zebra } from '@/components/ui/table-style'

import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TransactionFlagPanel } from '@/components/transactions/TransactionFlagPanel'
import { AmountCheckDetail, CHECK_STYLES } from '@/components/transactions/AmountCheckDetail'
import { summarizeAmountChecks } from '@/lib/calculations/amountCheckSummary'
import { getEta, getEtaDisplay, getMfr, summarizeItems } from '@/lib/transactions/rowSummary'
import { useTxFlags } from '@/lib/transactions/useTxFlags'
import type { TxFlag, TxAmountCheck } from '@/types/transaction'

export type { TxRow } from '@/types/transaction'
import type { TxRow } from '@/types/transaction'

/**
 * 거래 목록 — 품목·금액을 토에이 자료와 대조하는 표.
 *
 * 표 규칙은 지급 현황과 같은 것(`table-style`)을 쓴다. 색도 같은 규칙이다:
 * **빨강은 손댈 곳에만**. 오류 표시가 붙은 줄은 왼쪽 세로선과 건수 글자만 빨갛고,
 * 줄 전체를 빨갛게 칠하지 않는다 — 열 줄이 물들면 어느 것이 급한지 알 수 없다.
 */
export function TransactionTable({ rows, initialFlags = [], amountChecks = [] }: {
  rows: TxRow[]
  initialFlags?: TxFlag[]
  amountChecks?: TxAmountCheck[]
}) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { flagsOf, replaceFlagsOf, toggleError } = useTxFlags(initialFlags)

  return (
    <div className={TABLE_WRAP}>
      <table className={TABLE}>
        <thead>
          <tr className={THEAD_ROW}>
            <th className={cn(TH, CENTER, 'w-12')}>오류</th>
            <th className={cn(TH, CENTER)}>회차</th>
            <th className={TH}>P/O No.</th>
            <th className={TH}>제조사</th>
            <th className={TH}>품목</th>
            <th className={cn(TH, CENTER)}>ETA</th>
            <th className={cn(TH, CENTER)}>상태</th>
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                등록된 거래가 없습니다.
              </td>
            </tr>
          )}
          {rows.map((t, i) => {
            const done = t.settlement_status === 'closing_done'
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
                <tr
                  className={cn(
                    'cursor-pointer border-t hover:bg-slate-100/70',
                    zebra(i),
                    !hasError && checkStyle?.row,
                    hasError && 'border-l-4 border-l-red-600',
                  )}
                  onClick={() => router.push(`/transactions/${t.id}`)}
                >
                  <td className={cn(TD, CENTER)} onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={hasError}
                      aria-label="오류 표시"
                      onCheckedChange={async (v) => { if (await toggleError(t.id, !!v)) setExpandedId(t.id) }}
                    />
                  </td>
                  <td className={cn(TD, CENTER, 'font-semibold')}>
                    {t.round_label}
                    {hasError && (
                      <span className="block font-normal text-red-700">오류 {openFlags.length}건</span>
                    )}
                    {checkStyle && (
                      <span
                        className={cn('block font-normal', checkStyle.badge)}
                        title="품목을 눌러 펼치면 어디가 다른지 볼 수 있습니다"
                      >
                        {checkStyle.label} {checkSummary.entries.length}건
                      </span>
                    )}
                  </td>
                  <td className={TD}>{t.order_no ?? '-'}</td>
                  <td className={TD}>{getMfr(t.manufacturers)}</td>
                  <td
                    className="px-3 py-2.5 align-middle"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedId(isExpanded ? null : t.id)
                    }}
                  >
                    <div className="flex cursor-pointer select-none items-center gap-1.5">
                      <span>{summarizeItems(items)}</span>
                      {items.length > 0 && (
                        <span className="text-muted-foreground">{items.length}건</span>
                      )}
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                        : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
                    </div>
                  </td>
                  <td className={cn(TD, CENTER, 'tabular-nums')}>{getEtaDisplay(eta, t.delivery_dates)}</td>
                  <td className={cn(TD, CENTER, done ? 'text-muted-foreground' : 'text-slate-800')}>
                    {done ? '완료' : '진행중'}
                  </td>
                </tr>
                {isExpanded && (
                  <tr onClick={(e) => e.stopPropagation()}>
                    <td colSpan={7} className="border-l-4 border-slate-300 bg-slate-100/70 px-6 py-3">
                      {items.length === 0
                        ? <p className="text-sm text-muted-foreground">품목 데이터가 없습니다.</p>
                        : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                {['스펙', '색상', '사이즈'].map((h) => (
                                  <th key={h} className="py-1.5 pr-6 text-left font-semibold text-slate-600">{h}</th>
                                ))}
                                {['단가(USD)', '수량'].map((h) => (
                                  <th key={h} className="py-1.5 pr-6 text-right font-semibold text-slate-600">{h}</th>
                                ))}
                                <th className="py-1.5 text-left font-semibold text-slate-600">단위</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item, j) => (
                                <tr key={j} className="border-b border-dashed last:border-0">
                                  <td className="py-1.5 pr-6">{item.spec || '-'}</td>
                                  <td className="py-1.5 pr-6">{item.color || '-'}</td>
                                  <td className="py-1.5 pr-6">{item.size || '-'}</td>
                                  <td className={cn('py-1.5 pr-6 tabular-nums', NUM)}>
                                    {item.unit_price_usd != null ? `$${Number(item.unit_price_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                  </td>
                                  <td className={cn('py-1.5 pr-6 tabular-nums', NUM)}>
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
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
