import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'

interface DDayRow { id: string; round_label: string; a1_payment_date: string | null; dday: number }

/** 입금일 + 55일이 정산 마감. 지난 건은 빨강, 7일 이내는 주황. */
export function DDayCard({ ddayList }: { ddayList: DDayRow[] }) {
  return (
        <Card className="border-green-200">
          <CardHeader className="pb-2 border-l-4 pl-3" style={{ borderColor: '#4CAF50' }}>
            <CardTitle className="text-base flex items-center gap-2" style={{ color: '#2E7D32' }}>
              ⏰ D-Day 알림
              <span className="text-xs font-normal text-muted-foreground">(입금일 기준 55일 마감)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-3">
            {ddayList.length === 0 ? (
              <p className="text-sm text-muted-foreground">마감 임박 거래 없음</p>
            ) : ddayList.map((t) => {
              const isOverdue = t.dday < 0
              const isUrgent = t.dday >= 0 && t.dday <= 7
              const ddayLabel = isOverdue ? `D+${Math.abs(t.dday)} 초과` : t.dday === 0 ? 'D-Day' : `D-${t.dday}`
              return (
                <Link
                  key={t.id}
                  href={`/transactions/${t.id}`}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-md text-sm hover:opacity-80 transition-opacity',
                    isOverdue ? 'border border-red-200' : isUrgent ? 'border border-orange-200' : 'border border-green-200',
                  )}
                  style={{ backgroundColor: isOverdue ? '#FFEBEE' : isUrgent ? '#FFF3E0' : '#E8F5E9' }}
                >
                  <span className="font-semibold">{t.round_label}</span>
                  <span className="text-xs text-gray-400">입금일: {formatDate(t.a1_payment_date)}</span>
                  <span className={cn(
                    'font-bold text-sm',
                    isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-green-600',
                  )}>
                    {ddayLabel}
                  </span>
                </Link>
              )
            })}
          </CardContent>
        </Card>
  )
}
