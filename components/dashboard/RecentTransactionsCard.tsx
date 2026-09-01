import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { normalizeOne } from '@/lib/utils/normalize'
import { StatusBadge } from './StatusBadge'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RecentTransactionsCard({ recentTx }: { recentTx: any[] }) {
  return (
        <Card className="border-green-200">
          <CardHeader
            className="pb-2 flex flex-row items-center justify-between border-l-4 pl-3"
            style={{ borderColor: '#4CAF50' }}
          >
            <CardTitle className="text-base" style={{ color: '#2E7D32' }}>최근 거래 현황</CardTitle>
            <Link href="/transactions" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hover:bg-green-50')} style={{ color: '#4CAF50' }}>
              전체 보기 <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#E8F5E9' }}>
                  <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>회차</th>
                  <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>제조사</th>
                  <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>수입금액</th>
                  <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>ETD</th>
                  <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>ETA</th>
                  <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>정산상태</th>
                </tr>
              </thead>
              <tbody>
                {(recentTx ?? []).map((t, i) => {
                  const mfr = normalizeOne(t.manufacturers)
                  const ctrs = (Array.isArray(t.containers) ? t.containers : []) as { etd: string | null; eta: string | null }[]
                  const etd = ctrs.map((c) => c.etd).filter(Boolean).sort()[0] ?? null
                  const eta = ctrs.map((c) => c.eta).filter(Boolean).sort().at(-1) ?? null
                  return (
                    <tr
                      key={t.id}
                      className="border-b last:border-0 hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: i % 2 === 1 ? '#F1F8E9' : '#ffffff' }}
                    >
                      <td className="px-4 py-2.5 font-semibold text-center">
                        <Link href={`/transactions/${t.id}`} className="hover:underline" style={{ color: '#2E7D32' }}>
                          {t.round_label}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">
                        {(mfr as { name: string } | null)?.name ?? '-'}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono">
                        ${Number(t.import_amount_usd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-400">
                        {etd ? formatDate(etd) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-400">
                        {eta ? formatDate(eta) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge status={t.settlement_status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
  )
}
