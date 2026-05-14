import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatDate, formatUsd } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Plus } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; variant: 'secondary' | 'default' | 'outline' | 'destructive' }> = {
  pending:       { label: '미진행', variant: 'secondary' },
  interim_saved: { label: '중간정산(임시)', variant: 'outline' },
  interim_done:  { label: '중간정산 완료', variant: 'default' },
  closing_saved: { label: '클로징(임시)', variant: 'outline' },
  closing_done:  { label: '클로징 완료', variant: 'default' },
}

export default async function TransactionsPage() {
  const supabase = await createClient()

  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id, round_no, round_label, order_no, customs_date,
      import_amount_usd, settlement_status, is_locked,
      manufacturers(name)
    `)
    .order('round_no', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">거래 목록</h2>
        <Link href="/transactions/new" className={cn(buttonVariants({ size: 'sm' }))}>
          <Plus className="h-4 w-4 mr-1" />
          새 거래 등록
        </Link>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">차수</TableHead>
              <TableHead>라벨</TableHead>
              <TableHead>발주번호</TableHead>
              <TableHead>제조사</TableHead>
              <TableHead>수입금액(USD)</TableHead>
              <TableHead>통관일</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(transactions ?? []).map((t) => {
              const status = STATUS_LABELS[t.settlement_status] ?? { label: t.settlement_status, variant: 'secondary' as const }
              const mfrRaw = t.manufacturers
              const mfr = Array.isArray(mfrRaw) ? (mfrRaw[0] as { name: string } | undefined) ?? null : mfrRaw as { name: string } | null
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-sm">{t.round_no}</TableCell>
                  <TableCell className="font-medium">{t.round_label}</TableCell>
                  <TableCell className="text-muted-foreground">{t.order_no ?? '-'}</TableCell>
                  <TableCell>{mfr?.name ?? '-'}</TableCell>
                  <TableCell className="font-mono">
                    {t.import_amount_usd ? formatUsd(Number(t.import_amount_usd)) : '-'}
                  </TableCell>
                  <TableCell>{formatDate(t.customs_date)}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {t.is_locked && <span className="ml-1 text-xs text-muted-foreground">🔒</span>}
                  </TableCell>
                  <TableCell>
                    <Link href={`/transactions/${t.id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>보기</Link>
                  </TableCell>
                </TableRow>
              )
            })}
            {!transactions?.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  등록된 거래가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
