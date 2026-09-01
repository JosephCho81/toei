import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils/format'
import { Ship } from 'lucide-react'
import { normalizeOne } from '@/lib/utils/normalize'
import type { ContainerRow } from '@/lib/data/dashboard'

export function ContainerTrackingCard({ containers, inTransit, arrivingSoon }: {
  containers: ContainerRow[]
  inTransit: number
  arrivingSoon: number
}) {
  return (
        <Card className="border-green-200">
          <CardHeader className="pb-2 border-l-4 pl-3" style={{ borderColor: '#4CAF50' }}>
            <CardTitle className="text-base flex items-center gap-2" style={{ color: '#2E7D32' }}>
              <Ship className="h-4 w-4" />
              컨테이너 추적 현황
              <span className="text-xs font-normal text-muted-foreground ml-1">
                운송중 {inTransit}건 · ETA 7일 이내 {arrivingSoon}건
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {containers.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-3">운송 중인 컨테이너 없음</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#E8F5E9' }}>
                    <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>차수</th>
                    <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>제조사</th>
                    <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>제품</th>
                    <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>컨테이너</th>
                    <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>ETD</th>
                    <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>ETA</th>
                    <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {(containers as ContainerRow[]).map((c, i) => {
                    const tx = normalizeOne(c.transactions)
                    const mfr = tx ? normalizeOne(tx.manufacturers) : null
                    const rawItems = tx?.transaction_items
                    const items: { spec: string | null }[] =
                      rawItems == null ? [] : Array.isArray(rawItems) ? rawItems : [rawItems]
                    const productSummary = [...new Set(items.map((it) => it.spec).filter(Boolean))].join(', ') || '-'
                    const isArrivingSoon = c.isArrivingSoon
                    return (
                      <tr
                        key={c.id}
                        className="border-b last:border-0"
                        style={{ backgroundColor: i % 2 === 1 ? '#F1F8E9' : '#ffffff' }}
                      >
                        <td className="px-4 py-2 text-center font-semibold">
                          {tx ? (
                            <Link href={`/transactions/${tx.id}`} className="hover:underline" style={{ color: '#2E7D32' }}>
                              {tx.round_label}
                            </Link>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-2 text-center text-muted-foreground text-xs">
                          {(mfr as { name: string } | null)?.name ?? '-'}
                        </td>
                        <td className="px-4 py-2 text-center text-muted-foreground text-xs">
                          {productSummary}
                        </td>
                        <td className="px-4 py-2 text-center font-mono text-xs">
                          {c.container_no ?? '-'}
                        </td>
                        <td className="px-4 py-2 text-center text-gray-400 text-xs">
                          {c.etd ? formatDate(c.etd) : '-'}
                        </td>
                        <td className="px-4 py-2 text-center text-xs">
                          <span className={isArrivingSoon ? 'text-orange-400 font-semibold' : 'text-gray-400'}>
                            {c.eta ? formatDate(c.eta) : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center text-xs text-muted-foreground">
                          {c.tracking_status ?? '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
  )
}
