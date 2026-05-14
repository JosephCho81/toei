import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface TransactionItem {
  id: string
  spec: string | null
  glove_type: string | null
  color: string | null
  size: string | null
  unit_price_usd: number | null
  quantity: number | null
  unit: string | null
  sort_order: number
}

export async function ItemsTable({ transactionId }: { transactionId: string }) {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('transaction_items')
    .select('id, spec, glove_type, color, size, unit_price_usd, quantity, unit, sort_order')
    .eq('transaction_id', transactionId)
    .order('sort_order')

  if (!items || items.length === 0) return null

  const totalQty = items.reduce((s, r) => s + (r.quantity ?? 0), 0)
  const totalUsd = items.reduce(
    (s, r) => s + (r.unit_price_usd ?? 0) * (r.quantity ?? 0),
    0,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">품목 명세</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>사양</TableHead>
                <TableHead>종류</TableHead>
                <TableHead>색상</TableHead>
                <TableHead>사이즈</TableHead>
                <TableHead className="text-right">단가(USD)</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead>단위</TableHead>
                <TableHead className="text-right">소계(USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => {
                const sub = (r.unit_price_usd ?? 0) * (r.quantity ?? 0)
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.spec ?? '-'}</TableCell>
                    <TableCell className="text-sm">{r.glove_type ?? '-'}</TableCell>
                    <TableCell className="text-sm">{r.color ?? '-'}</TableCell>
                    <TableCell className="text-sm">{r.size ?? '-'}</TableCell>
                    <TableCell className="text-right text-sm">
                      {r.unit_price_usd != null
                        ? `$${Number(r.unit_price_usd).toFixed(2)}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {r.quantity?.toLocaleString('ko-KR') ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm">{r.unit ?? 'DZ'}</TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      ${sub.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={5} className="text-right text-sm">합계</TableCell>
                <TableCell className="text-right text-sm">
                  {totalQty.toLocaleString('ko-KR')}
                </TableCell>
                <TableCell />
                <TableCell className="text-right text-sm">
                  ${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
