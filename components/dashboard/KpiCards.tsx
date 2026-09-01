import { Card, CardContent } from '@/components/ui/card'
import { Package, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react'

export function KpiCards({ totalCount, totalUsd, closingDone, pendingCount, totalPendingUsd }: {
  totalCount: number
  totalUsd: number
  closingDone: number
  pendingCount: number
  totalPendingUsd: number
}) {
  return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-base font-medium" style={{ color: '#2E7D32' }}>전체 거래</p>
                <Package className="h-5 w-5" style={{ color: '#81C784' }} />
              </div>
              <p className="text-2xl font-bold font-mono" style={{ color: '#2E7D32' }}>{totalCount}건</p>
              <p className="text-sm mt-1" style={{ color: '#4CAF50' }}>클로징 완료 {closingDone}건</p>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: '#F1F8E9', borderColor: '#C8E6C9' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-base font-medium" style={{ color: '#2E7D32' }}>총 수입금액</p>
                <TrendingUp className="h-5 w-5" style={{ color: '#4CAF50' }} />
              </div>
              <p className="text-2xl font-bold font-mono" style={{ color: '#2E7D32' }}>
                ${Math.round(totalUsd).toLocaleString('en-US')}
              </p>
              <p className="text-sm mt-1" style={{ color: '#388E3C' }}>누적 수입 합계</p>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: '#4CAF50', borderColor: '#388E3C' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-base font-medium text-white/80">클로징 완료</p>
                <CheckCircle2 className="h-5 w-5 text-white/80" />
              </div>
              <p className="text-2xl font-bold font-mono text-white">{closingDone}건</p>
              <p className="text-sm mt-1 text-white/70">
                완료율 {totalCount > 0 ? Math.round((closingDone / totalCount) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: '#FFF8E1', borderColor: '#FFE082' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-base font-medium" style={{ color: '#F57F17' }}>미정산 합계</p>
                <AlertTriangle className="h-5 w-5" style={{ color: '#FFA000' }} />
              </div>
              <p className="text-2xl font-bold font-mono" style={{ color: '#F57F17' }}>{pendingCount}건</p>
              <p className="text-sm mt-1" style={{ color: '#FF8F00' }}>
                ${Math.round(totalPendingUsd).toLocaleString('en-US')}
              </p>
            </CardContent>
          </Card>
        </div>
  )
}
