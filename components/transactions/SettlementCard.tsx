import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'
import { SettlementPdfButton } from '@/components/settlements/SettlementPdfButton'

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export function SettlementCard({
  label, href, amount, date, isLocked, settlementId, pdfType, txLocked, interimConfirmedKrw,
}: {
  label: string; href: string; amount: number | null; date: string | null
  isLocked: boolean; settlementId: string | null; pdfType: 'interim' | 'closing'; txLocked: boolean
  interimConfirmedKrw?: number | null
}) {
  const grandTotal = (interimConfirmedKrw != null && amount != null)
    ? interimConfirmedKrw + amount
    : null

  const closingDirection = amount != null && amount !== 0
    ? amount >= 0 ? '한국에이원 → 토에이산교 지급' : '토에이산교 → 한국에이원 지급'
    : null

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{label}</p>
          <span className={isLocked ? 'text-muted-foreground' : 'text-slate-800'}>
            {isLocked ? '완료' : '미정산'}
          </span>
        </div>

        {grandTotal != null ? (
          <>
            <div>
              <p className="text-sm text-muted-foreground">종합정산액</p>
              <p className="text-xl font-semibold tabular-nums tracking-tight">
                {grandTotal.toLocaleString('ko-KR')}
                <span className="ml-0.5 text-sm font-normal text-muted-foreground">원</span>
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                (중간 {interimConfirmedKrw!.toLocaleString('ko-KR')} + 클로징 {amount!.toLocaleString('ko-KR')})
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">클로징 정산금액</p>
              <p className={`text-base font-semibold tabular-nums ${amount! < 0 ? 'text-red-700' : ''}`}>
                {amount!.toLocaleString('ko-KR')}원
              </p>
              {closingDirection && (
                <p className="text-sm text-muted-foreground mt-0.5">{closingDirection}</p>
              )}
            </div>
          </>
        ) : amount != null ? (
          <p className="text-xl font-semibold tabular-nums tracking-tight">
            {amount.toLocaleString('ko-KR')}
            <span className="ml-0.5 text-sm font-normal text-muted-foreground">원</span>
          </p>
        ) : null}

        {date && <p className="text-sm text-muted-foreground">{formatDate(date)}</p>}
        <div className="flex gap-2 pt-1">
          <SettlementPdfButton type={pdfType} settlementId={settlementId} isLocked={isLocked} />
          {!txLocked && (
            <Link href={href} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              {amount == null ? '정산 시작' : '상세보기'}
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
