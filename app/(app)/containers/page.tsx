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
      id, container_no, carrier, eta, etd, actual_arrival,
      vessel_name, tracking_status, last_tracked_at,
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
              <TableHead>컨테이너 번호</TableHead>
              <TableHead>선사</TableHead>
              <TableHead>거래</TableHead>
              <TableHead>ETD</TableHead>
              <TableHead>ETA</TableHead>
              <TableHead>실착일</TableHead>
              <TableHead>선박</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(containers ?? []).map((c) => {
              const txRaw = c.transactions
              const tx = Array.isArray(txRaw) ? txRaw[0] as { id: string; round_label: string } | undefined : txRaw as { id: string; round_label: string } | null
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-semibold">{c.container_no}</TableCell>
                  <TableCell>
                    {c.carrier ? (
                      <Badge variant="outline" className="text-xs">{c.carrier}</Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {tx ? (
                      <Link href={`/transactions/${tx.id}`} className="text-sm hover:underline">
                        {tx.round_label}
                      </Link>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(c.etd)}</TableCell>
                  <TableCell className="text-sm">{formatDate(c.eta)}</TableCell>
                  <TableCell className="text-sm">{formatDate(c.actual_arrival)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.vessel_name ?? '-'}</TableCell>
                  <TableCell>
                    {c.tracking_status ? (
                      <span className="text-xs text-muted-foreground">{c.tracking_status}</span>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              )
            })}
            {!containers?.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
