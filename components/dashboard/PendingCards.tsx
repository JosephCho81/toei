import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

interface PendingRow { id: string; round_label: string; import_amount_usd: number | string | null }

export function PendingCards({ interimPending, interimPendingUsd, closingPending, closingPendingUsd }: {
  interimPending: PendingRow[]
  interimPendingUsd: number
  closingPending: PendingRow[]
  closingPendingUsd: number
}) {
  return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 중간정산 미완료 */}
          <Card className="border-green-200">
            <CardHeader className="pb-2 border-l-4 pl-3" style={{ borderColor: '#4CAF50' }}>
              <CardTitle className="text-base" style={{ color: '#2E7D32' }}>중간정산 미완료</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 p-4">
              <p className="text-2xl font-bold font-mono" style={{ color: '#2E7D32' }}>{interimPending.length}건</p>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                ${Math.round(interimPendingUsd).toLocaleString('en-US')}
              </p>
              <div className="space-y-0.5">
                {interimPending.slice(0, 4).map((t) => (
                  <Link key={t.id} href={`/transactions/${t.id}/interim`}
                    className="text-sm font-medium hover:text-foreground flex justify-between py-1 text-muted-foreground">
                    <span>{t.round_label}</span>
                    <span className="font-semibold">${Number(t.import_amount_usd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                  </Link>
                ))}
                {interimPending.length > 4 && (
                  <p className="text-xs text-muted-foreground">외 {interimPending.length - 4}건</p>
                )}
              </div>
              <Link
                href="/transactions"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-2 w-full justify-center border-green-300')}
              >
                거래 목록 <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </CardContent>
          </Card>

          {/* 클로징 미완료 */}
          <Card className="border-green-200">
            <CardHeader className="pb-2 border-l-4 pl-3" style={{ borderColor: '#4CAF50' }}>
              <CardTitle className="text-base" style={{ color: '#2E7D32' }}>클로징 미완료</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 p-4">
              <p className="text-2xl font-bold font-mono" style={{ color: '#2E7D32' }}>{closingPending?.length ?? 0}건</p>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                ${Math.round(closingPendingUsd).toLocaleString('en-US')}
              </p>
              <div className="space-y-0.5">
                {(closingPending ?? []).slice(0, 4).map((t) => (
                  <Link key={t.id} href={`/transactions/${t.id}/closing`}
                    className="text-sm font-medium hover:text-foreground flex justify-between py-1 text-muted-foreground">
                    <span>{t.round_label}</span>
                    <span className="font-semibold">${Number(t.import_amount_usd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                  </Link>
                ))}
                {(closingPending?.length ?? 0) > 4 && (
                  <p className="text-xs text-muted-foreground">외 {(closingPending?.length ?? 0) - 4}건</p>
                )}
              </div>
              <Link
                href="/transactions"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-2 w-full justify-center border-green-300')}
              >
                거래 목록 <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </CardContent>
          </Card>
        </div>
  )
}
