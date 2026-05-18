import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ReportSection } from './ReportSection'
import { formatDate } from '@/lib/utils/format'

interface QuoteRow {
  forwarder_name: string | null
  quote_date: string | null
  quote_amount_krw: number | null
  actual_amount_krw: number | null
  notes: string | null
}

function krw(v: number | null): string {
  return v != null ? `${v.toLocaleString('ko-KR')}원` : '-'
}

function diffLabel(diff: number): string {
  return `${diff > 0 ? '+' : ''}${diff.toLocaleString('ko-KR')}원 (${diff > 0 ? '초과' : '절감'})`
}

export function ReportForwardingSection({ rows }: { rows: QuoteRow[] }) {
  if (!rows.length) return null

  const totalQuote = rows.reduce((s, r) => s + (r.quote_amount_krw ?? 0), 0)
  const totalActual = rows.reduce((s, r) => s + (r.actual_amount_krw ?? 0), 0)
  const totalDiff = totalActual - totalQuote

  return (
    <ReportSection title="IV. 포워딩 견적">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>포워더</TableHead>
              <TableHead>견적일</TableHead>
              <TableHead className="text-right">견적금액(KRW)</TableHead>
              <TableHead className="text-right">실청구금액(KRW)</TableHead>
              <TableHead className="text-right">차이</TableHead>
              <TableHead>메모</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => {
              const hasBoth = r.quote_amount_krw != null && r.actual_amount_krw != null
              const diff = hasBoth ? (r.actual_amount_krw! - r.quote_amount_krw!) : null
              return (
                <TableRow key={i}>
                  <TableCell className="text-sm">{r.forwarder_name ?? '-'}</TableCell>
                  <TableCell className="text-sm">{formatDate(r.quote_date)}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{krw(r.quote_amount_krw)}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{krw(r.actual_amount_krw)}</TableCell>
                  <TableCell className={`text-right text-sm font-mono ${diff == null ? '' : diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {diff == null ? '-' : diffLabel(diff)}
                  </TableCell>
                  <TableCell className="text-sm">{r.notes ?? '-'}</TableCell>
                </TableRow>
              )
            })}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={2} className="text-sm">합계</TableCell>
              <TableCell className="text-right text-sm font-mono">{krw(totalQuote)}</TableCell>
              <TableCell className="text-right text-sm font-mono">{krw(totalActual)}</TableCell>
              <TableCell className={`text-right text-sm font-mono ${totalDiff > 0 ? 'text-red-600' : totalDiff < 0 ? 'text-green-600' : ''}`}>
                {totalDiff !== 0 ? diffLabel(totalDiff) : '0원'}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </ReportSection>
  )
}
