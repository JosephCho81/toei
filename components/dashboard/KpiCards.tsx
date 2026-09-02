import { Card, CardContent } from '@/components/ui/card'
import { Package, TrendingUp } from 'lucide-react'

/**
 * 보고 받는 사람이 먼저 보는 두 숫자: 기간 내 몇 건, 얼마.
 * 진행 상황은 아래 거래 테이블의 정산일 컬럼이 건별로 보여주므로 여기서 요약하지 않는다.
 */
export function KpiCards({ totalCount, totalUsd, periodLabel }: {
  totalCount: number
  totalUsd: number
  periodLabel: string
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card className="border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-medium" style={{ color: '#2E7D32' }}>전체 거래</p>
            <Package className="h-5 w-5" style={{ color: '#81C784' }} />
          </div>
          <p className="text-3xl font-bold font-mono" style={{ color: '#2E7D32' }}>{totalCount}건</p>
          <p className="text-sm mt-1" style={{ color: '#4CAF50' }}>{periodLabel}</p>
        </CardContent>
      </Card>

      <Card style={{ backgroundColor: '#F1F8E9', borderColor: '#C8E6C9' }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-medium" style={{ color: '#2E7D32' }}>총 수입금액</p>
            <TrendingUp className="h-5 w-5" style={{ color: '#4CAF50' }} />
          </div>
          <p className="text-3xl font-bold font-mono" style={{ color: '#2E7D32' }}>
            ${Math.round(totalUsd).toLocaleString('en-US')}
          </p>
          <p className="text-sm mt-1" style={{ color: '#388E3C' }}>{periodLabel} 합계</p>
        </CardContent>
      </Card>
    </div>
  )
}
