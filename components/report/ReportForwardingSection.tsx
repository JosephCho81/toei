import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ReportSection } from './ReportSection'
import { formatDate } from '@/lib/utils/format'

interface QuoteRow {
  forwarder_name: string | null
  quote_date: string | null
  actual_supply_krw: number | null
  actual_with_vat_krw: number | null
  notes: string | null
}

function krw(v: number | null): string {
  return v != null ? `${v.toLocaleString('ko-KR')}원` : '-'
}

/** 포워딩 청구는 물건을 받은 뒤에 온다 — 견적·견적 대비 차이는 뺐다 (담당자 2026-10-06) */
export function ReportForwardingSection({ rows }: { rows: QuoteRow[] }) {
  if (!rows.length) return null

  const totalSupply = rows.reduce((s, r) => s + (r.actual_supply_krw ?? 0), 0)
  const totalWithVat = rows.reduce((s, r) => s + (r.actual_with_vat_krw ?? 0), 0)

  return (
    <ReportSection title="IV. 포워딩 청구">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>포워더</TableHead>
              <TableHead>견적일</TableHead>
              <TableHead className="text-right">청구금액 (VAT 미포함)</TableHead>
              <TableHead className="text-right">청구금액 (VAT 포함)</TableHead>
              <TableHead>메모</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{r.forwarder_name ?? '-'}</TableCell>
                <TableCell className="text-sm">{formatDate(r.quote_date)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{krw(r.actual_supply_krw)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{krw(r.actual_with_vat_krw)}</TableCell>
                <TableCell className="text-sm">{r.notes ?? '-'}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={2} className="text-sm">합계</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{krw(totalSupply)}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{krw(totalWithVat)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </ReportSection>
  )
}
