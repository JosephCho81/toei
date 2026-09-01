'use client'
import React from 'react'
import { CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatKrw } from '@/lib/utils/format'
import { ITEM_TYPE_LABELS, quoteTotals, type QuoteRow } from '@/lib/data/forwardingQuotes'

const COL_SPAN = 3  // 포워더 | 항목 | 금액(KRW)

function ForwarderCell({ row, rowSpan }: { row: QuoteRow; rowSpan?: number }) {
  return (
    <TableCell rowSpan={rowSpan} className="align-top text-sm px-3 py-2 border-r">
      <div className="font-medium">{row.forwarder_name}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{row.quote_date || '-'}</div>
    </TableCell>
  )
}

/** 확정(잠금)된 거래에서 보여주는 읽기 전용 견적표. */
export function ForwardingQuoteReadOnly({ rows }: { rows: QuoteRow[] }) {
  return (
    <CardContent className="p-0">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">포워더</TableHead>
            <TableHead>항목</TableHead>
            <TableHead className="text-right w-36">금액(KRW)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const { quote, actual } = quoteTotals(r)
            return (
              <React.Fragment key={r._key}>
                {r.items.map((item, idx) => (
                  <TableRow key={item._key}>
                    {idx === 0 && <ForwarderCell row={r} rowSpan={r.items.length + 1} />}
                    <TableCell className="px-3 py-1 text-xs text-left">
                      <span className="text-muted-foreground mr-1.5">[{ITEM_TYPE_LABELS[item.item_type]}]</span>
                      <span className="font-medium">{item.item_name || '-'}</span>
                      {item.currency && item.currency !== 'KRW' && item.amount_cur != null && (
                        <span className="text-muted-foreground ml-1.5 text-[10px]">
                          {item.currency} {item.amount_cur.toLocaleString('ko-KR')}
                        </span>
                      )}
                      {item.is_vat_taxable && <span className="text-blue-500 text-[10px] ml-1">VAT</span>}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono px-3 py-1">
                      {item.amount_krw ? formatKrw(Number(item.amount_krw)) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30">
                  {r.items.length === 0 && <ForwarderCell row={r} />}
                  <TableCell className="px-3 py-1.5 text-xs text-muted-foreground">
                    합계 (견적 {formatKrw(quote)} / 실청구 {formatKrw(actual)})
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold font-mono px-3 py-1.5">
                    {formatKrw(actual || quote)}
                  </TableCell>
                </TableRow>
                {r.notes && (
                  <TableRow className="border-t-0">
                    <TableCell colSpan={COL_SPAN} className="px-3 pb-2 pt-0">
                      <p className="text-xs text-muted-foreground">메모: {r.notes}</p>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            )
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={COL_SPAN} className="text-center text-muted-foreground py-4 text-sm">
                견적 데이터가 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </CardContent>
  )
}
