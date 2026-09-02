import { Card, CardContent } from '@/components/ui/card'
import { Package, TrendingUp } from 'lucide-react'

/**
 * 선택한 기간의 두 숫자: 몇 건, 얼마.
 * 진행 상황은 아래 거래 테이블의 정산일 컬럼이 건별로 보여주므로 여기서 요약하지 않는다.
 */
export function KpiCards({ totalCount, totalUsd, periodLabel }: {
  totalCount: number
  totalUsd: number
  periodLabel: string
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Card className="border-green-200">
        <CardContent className="px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="h-4 w-4 shrink-0" style={{ color: '#81C784' }} />
            <span className="text-sm font-medium whitespace-nowrap" style={{ color: '#2E7D32' }}>거래 건수</span>
            <span className="text-xs text-muted-foreground truncate">{periodLabel}</span>
          </div>
          <span className="text-xl font-bold font-mono shrink-0" style={{ color: '#2E7D32' }}>
            {totalCount}건
          </span>
        </CardContent>
      </Card>

      <Card style={{ backgroundColor: '#F1F8E9', borderColor: '#C8E6C9' }}>
        <CardContent className="px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="h-4 w-4 shrink-0" style={{ color: '#4CAF50' }} />
            <span className="text-sm font-medium whitespace-nowrap" style={{ color: '#2E7D32' }}>총 수입금액</span>
            <span className="text-xs truncate" style={{ color: '#66A96A' }}>{periodLabel}</span>
          </div>
          <span className="text-xl font-bold font-mono shrink-0" style={{ color: '#2E7D32' }}>
            ${Math.round(totalUsd).toLocaleString('en-US')}
          </span>
        </CardContent>
      </Card>
    </div>
  )
}
