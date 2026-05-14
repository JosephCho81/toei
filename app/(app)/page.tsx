import { createClient } from '@/lib/supabase/server'
import { getBokExchangeRate } from '@/lib/api/bok'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { DeadlineAlerts } from '@/components/dashboard/DeadlineAlerts'
import { formatDate } from '@/lib/utils/format'
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
    .select('id, round_label, settlement_status, import_amount_usd, customs_date, manufacturers(name)')
    .order('round_no', { ascending: false })
    .limit(100)

  const all = transactions ?? []
  const active = all.filter((t) => t.settlement_status !== 'closing_done')
  const recent5 = all.slice(0, 5)

  const unsettledUsd = active.reduce(
    (sum, t) => sum + (t.import_amount_usd ? Number(t.import_amount_usd) : 0),
    0,
  )

  const now = new Date()
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const { data: closingDeadlines } = await supabase
    .from('settlement_deadlines')
    .select('id')
    .eq('deadline_type', 'closing_due')
    .eq('is_completed', false)
    .gte('due_date', firstDay)
    .lte('due_date', lastDay)
  const closingThisMonth = closingDeadlines?.length ?? 0

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  let todayRate: number | null = null
  try {
    todayRate = await getBokExchangeRate(todayStr)
  } catch {
    // BOK_API_KEY 미설정 시 무시
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">대시보드</h2>

      <SummaryCards
        activeCount={active.length}
        unsettledUsd={unsettledUsd}
        todayRate={todayRate}
        closingThisMonth={closingThisMonth}
      />

      <DeadlineAlerts />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 5차 거래</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3">
          {recent5.length === 0 ? (
            <p className="text-sm text-muted-foreground">거래 데이터가 없습니다.</p>
          ) : (
            recent5.map((t) => {
              const mfr = t.manufacturers as { name: string } | null
              return (
                <Link
                  key={t.id}
                  href={`/transactions/${t.id}`}
                  className="flex items-center justify-between p-2 border rounded-md hover:bg-accent transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium">{t.round_label}</span>
                    {mfr?.name && (
                      <span className="ml-2 text-xs text-muted-foreground">{mfr.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {t.customs_date && (
                      <span className="text-xs text-muted-foreground">통관 {formatDate(t.customs_date)}</span>
                    )}
                    {t.import_amount_usd != null && (
                      <span className="text-xs text-muted-foreground">
                        ${Number(t.import_amount_usd).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                    <Badge variant={t.settlement_status === 'closing_done' ? 'default' : 'secondary'}>
                      {STATUS_LABELS[t.settlement_status] ?? t.settlement_status}
                    </Badge>
                  </div>
                </Link>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
