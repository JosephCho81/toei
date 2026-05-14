import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  activeCount: number
  unsettledUsd: number
  todayRate: number | null
}

export function SummaryCards({ activeCount, unsettledUsd, todayRate }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">진행중 거래</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{activeCount}</p>
          <p className="text-xs text-muted-foreground mt-1">클로징 미완료 건수</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">미정산 금액</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            ${unsettledUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">클로징 미완료 수입금액 합계 (USD)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">오늘 환율</CardTitle>
        </CardHeader>
        <CardContent>
          {todayRate != null ? (
            <>
              <p className="text-3xl font-bold">
                {todayRate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">원/USD (한국은행 고시)</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-muted-foreground">-</p>
              <p className="text-xs text-muted-foreground mt-1">환율 조회 불가 (휴일 등)</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
