import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/utils/format'
import { Info } from 'lucide-react'
import Link from 'next/link'

export default async function ContainersPage() {
  const supabase = await createClient()

  const { data: containers } = await supabase
    .from('containers')
    .select(`
      id, carrier, eta, etd, vessel_name, tracking_status, last_tracked_at,
      transactions(id, round_label)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">컨테이너 현황</h2>
      <div className="flex items-center gap-2 p-3 bg-muted rounded-md text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        컨테이너 등록/수정은 거래 상세 페이지에서 가능합니다.
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>차수</TableHead>
              <TableHead>선사</TableHead>
              <TableHead>ETD</TableHead>
              <TableHead>ETA</TableHead>
              <TableHead>현재위치</TableHead>
              <TableHead>추적상태</TableHead>
              <TableHead>마지막업데이트</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(containers ?? []).map((c) => {
              const txRaw = c.transactions
              const tx = Array.isArray(txRaw)
                ? txRaw[0] as { id: string; round_label: string } | undefined
                : txRaw as { id: string; round_label: string } | null
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    {tx ? (
                      <Link href={`/transactions/${tx.id}`} className="text-sm font-medium hover:underline">
                        {tx.round_label}
                      </Link>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {c.carrier ? <Badge variant="outline" className="text-xs">{c.carrier}</Badge> : '-'}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(c.etd)}</TableCell>
                  <TableCell className="text-sm">{formatDate(c.eta)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.vessel_name ?? '-'}</TableCell>
                  <TableCell>
                    {c.tracking_status
                      ? <span className="text-xs text-muted-foreground">{c.tracking_status}</span>
                      : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.last_tracked_at ? new Date(c.last_tracked_at).toLocaleDateString('ko-KR') : '-'}
                  </TableCell>
                </TableRow>
              )
            })}
            {!containers?.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  등록된 컨테이너가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
