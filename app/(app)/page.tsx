import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatKrw } from '@/lib/utils/format'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  pending: '미진행',
  interim_saved: '중간정산(임시)',
  interim_done: '중간정산 완료',
  closing_saved: '클로징(임시)',
  closing_done: '클로징 완료',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, round_label, settlement_status, is_locked')
    .order('round_no', { ascending: false })
    .limit(100)

  const statusCounts = (transactions ?? []).reduce<Record<string, number>>((acc, t) => {
    acc[t.settlement_status] = (acc[t.settlement_status] ?? 0) + 1
    return acc
  }, {})

  const inProgress = (transactions ?? []).filter(
    (t) => !['closing_done'].includes(t.settlement_status)
  )

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">대시보드</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{statusCounts[key] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">진행 중인 거래</h3>
        {inProgress.length === 0 ? (
          <p className="text-muted-foreground text-sm">진행 중인 거래가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {inProgress.slice(0, 10).map((t) => (
              <Link
                key={t.id}
                href={`/transactions/${t.id}`}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <span className="text-sm font-medium">{t.round_label}</span>
                <Badge variant={t.settlement_status === 'pending' ? 'secondary' : 'default'}>
                  {STATUS_LABELS[t.settlement_status]}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
