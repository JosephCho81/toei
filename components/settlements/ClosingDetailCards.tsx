import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ForwardingRow, InterimSummary } from '@/lib/settlements/closingLoad'

const krw = (n: number | null | undefined) =>
  n != null ? `${n.toLocaleString('ko-KR')}원` : '-'

export function InterimSummaryCard({ interim }: { interim: InterimSummary | null }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">중간정산 요약</CardTitle></CardHeader>
      <CardContent className="text-sm">
        {interim?.is_locked ? (
          <div className="flex items-center gap-6">
            <div>
              <span className="text-muted-foreground">확정금액</span>
              <p className="font-bold text-lg font-mono">{krw(interim.confirmed_amount_krw)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">통관환율</span>
              <p className="font-mono">{interim.customs_exchange_rate?.toLocaleString('ko-KR')}원/$</p>
            </div>
            {interim.updated_at && (
              <div>
                <span className="text-muted-foreground">정산일</span>
                <p>{new Date(interim.updated_at).toLocaleDateString('ko-KR')}</p>
              </div>
            )}
            <Badge variant="default" className="text-xs">완료</Badge>
          </div>
        ) : (
          <Badge variant="destructive" className="text-xs">중간정산 미완료</Badge>
        )}
      </CardContent>
    </Card>
  )
}

/** 중간정산에서 넘어온 통관 항목 — 클로징에서는 읽기 전용 참고자료다. */
export function CustomsDetailCard({ items }: { items: { item_name: string; amount_krw: number }[] }) {
  if (items.length === 0) return null
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">통관 세부내역</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>항목</TableHead>
              <TableHead className="text-right">금액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{item.item_name}</TableCell>
                <TableCell className="text-right font-mono text-sm">{krw(item.amount_krw)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell className="text-sm">합계</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {krw(items.reduce((s, i) => s + i.amount_krw, 0))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function ForwardingDetailCard({ rows }: { rows: ForwardingRow[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">포워딩 세부내역</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>항목</TableHead>
              <TableHead className="text-right">견적금액</TableHead>
              <TableHead className="text-right">실청구액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{r.forwarder_name}</TableCell>
                <TableCell className="text-right font-mono text-sm">{krw(r.quote_amount_krw)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{krw(r.actual_amount_krw)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-4 text-sm">
                  포워딩 데이터 없음
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
