import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

const TYPE_LABELS: Record<string, string> = {
  lc_payment: 'LC 결제', interim: '중간정산', closing: '클로징정산',
  custom: '기타', interim_due: '중간정산 기한', closing_due: '클로징 기한',
}

function tierClass(diffDays: number) {
  if (diffDays < 0)  return 'border-gray-400 bg-gray-50 text-gray-700'
  if (diffDays <= 7) return 'border-red-400 bg-red-50 text-red-800'
  return 'border-yellow-400 bg-yellow-50 text-yellow-800'
}

function diffLabel(diffDays: number) {
  if (diffDays < 0)  return `D+${Math.abs(diffDays)} 초과`
  if (diffDays === 0) return 'D-DAY'
  return `D-${diffDays}`
}

export async function DeadlineAlerts() {
  const supabase = await createClient()
  const today = new Date()
  const plus30 = new Date(today)
  plus30.setDate(plus30.getDate() + 30)

  const { data: deadlines } = await supabase
    .from('settlement_deadlines')
    .select('id, deadline_type, due_date, notes, transactions(id, round_label)')
    .eq('is_completed', false)
    .lte('due_date', plus30.toISOString().slice(0, 10))
    .order('due_date')

  if (!deadlines || deadlines.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">마감일 알림 (D-30 이내)</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">임박한 마감일이 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">마감일 알림 (D-30 이내)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {deadlines.map((d) => {
          const txArr = d.transactions as { id: string; round_label: string }[] | null
          const tx = Array.isArray(txArr) ? txArr[0] : (txArr as unknown as { id: string; round_label: string } | null)
          const due = new Date(d.due_date)
          const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          return (
            <div key={d.id} className={`flex items-center justify-between p-2 rounded-md border text-sm ${tierClass(diffDays)}`}>
              <div>
                <span className="font-semibold">{tx?.round_label ?? '-'}</span>
                <span className="ml-2 text-xs opacity-80">{TYPE_LABELS[d.deadline_type] ?? d.deadline_type}</span>
                {d.notes && <span className="ml-2 text-xs opacity-70">— {d.notes}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">{diffLabel(diffDays)}</span>
                <span className="text-xs opacity-70">{d.due_date}</span>
                {tx && <Link href={`/transactions/${tx.id}`} className="underline text-xs">보기</Link>}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
