import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/format'
import {
  Package, TrendingUp, CheckCircle2, Clock, Ship, ArrowRight, BarChart3,
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pending: '미진행',
  interim_saved: '중간정산(임시)',
  interim_done: '중간정산 완료',
  closing_saved: '클로징(임시)',
  closing_done: '클로징 완료',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: allTx },
    { data: ddayTx },
    { data: interimPending },
    { data: closingPending },
    { data: inTransitContainers },
    { data: recentTx },
  ] = await Promise.all([
    supabase.from('transactions').select('import_amount_usd, settlement_status, margin_rate_pct'),
    supabase.from('transactions')
      .select('id, round_label, a1_payment_date, settlement_status')
      .not('a1_payment_date', 'is', null)
      .neq('settlement_status', 'closing_done')
      .order('a1_payment_date'),
    supabase.from('transactions')
      .select('id, round_label, import_amount_usd')
      .in('settlement_status', ['pending', 'interim_saved']),
    supabase.from('transactions')
      .select('id, round_label, import_amount_usd')
      .in('settlement_status', ['interim_done', 'closing_saved']),
    supabase.from('containers')
      .select('id, eta, actual_arrival')
      .is('actual_arrival', null)
      .not('eta', 'is', null),
    supabase.from('transactions')
      .select('id, round_label, round_no, import_amount_usd, settlement_status, manufacturers(name), containers(etd, eta)')
      .order('round_no', { ascending: false })
      .limit(5),
  ])

  const totalCount = allTx?.length ?? 0
  const totalUsd = allTx?.reduce((s, t) => s + Number(t.import_amount_usd ?? 0), 0) ?? 0
  const closingDone = allTx?.filter((t) => t.settlement_status === 'closing_done').length ?? 0
  const validMargins = (allTx ?? []).filter((t) => t.margin_rate_pct != null)
  const avgMargin = validMargins.length
    ? validMargins.reduce((s, t) => s + Number(t.margin_rate_pct), 0) / validMargins.length
    : 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const ddayList = (ddayTx ?? []).map((t) => {
    const payDate = new Date(t.a1_payment_date!)
    payDate.setHours(0, 0, 0, 0)
    const elapsed = Math.floor((today.getTime() - payDate.getTime()) / 86400000)
    return { ...t, dday: 55 - elapsed }
  }).sort((a, b) => a.dday - b.dday)

  const inTransit = inTransitContainers?.length ?? 0
  const arrivingSoon = (inTransitContainers ?? []).filter((c) => {
    const eta = new Date(c.eta!)
    eta.setHours(0, 0, 0, 0)
    return Math.floor((eta.getTime() - today.getTime()) / 86400000) <= 7
  }).length

  const interimPendingUsd = (interimPending ?? []).reduce((s, t) => s + Number(t.import_amount_usd ?? 0), 0)
  const closingPendingUsd = (closingPending ?? []).reduce((s, t) => s + Number(t.import_amount_usd ?? 0), 0)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">대시보드</h2>

      {/* 요약 통계 카드 4개 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          title="전체 거래"
          value={`${totalCount}건`}
          icon={Package}
          sub={`클로징 완료 ${closingDone}건`}
        />
        <SummaryCard
          title="총 수입금액"
          value={`$${Math.round(totalUsd).toLocaleString('en-US')}`}
          icon={TrendingUp}
          sub="누적 수입 합계"
        />
        <SummaryCard
          title="클로징 완료"
          value={`${closingDone}건`}
          icon={CheckCircle2}
          sub={`완료율 ${totalCount > 0 ? Math.round((closingDone / totalCount) * 100) : 0}%`}
        />
        <SummaryCard
          title="평균 마진율"
          value={`${avgMargin.toFixed(1)}%`}
          icon={BarChart3}
          sub="전체 거래 평균"
        />
      </div>

      {/* D-Day 알림 */}
      {ddayList.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              D-Day 알림
              <span className="text-xs font-normal text-muted-foreground">(입금일 기준 55일 마감)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {ddayList.map((t) => {
              const isOverdue = t.dday < 0
              const isUrgent = t.dday >= 0 && t.dday <= 7
              const ddayLabel = isOverdue ? `D+${Math.abs(t.dday)} 초과` : t.dday === 0 ? 'D-Day' : `D-${t.dday}`
              return (
                <Link
                  key={t.id}
                  href={`/transactions/${t.id}`}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-md text-sm hover:opacity-80 transition-opacity',
                    isOverdue
                      ? 'bg-red-50 border border-red-200'
                      : isUrgent
                      ? 'bg-orange-50 border border-orange-200'
                      : 'bg-green-50 border border-green-200',
                  )}
                >
                  <span className="font-semibold">{t.round_label}</span>
                  <span className="text-xs text-muted-foreground">입금일: {formatDate(t.a1_payment_date)}</span>
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
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              D-Day 알림
              <span className="text-xs font-normal text-muted-foreground">(입금일 기준 55일 마감)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">마감 임박 거래 없음</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 미정산 현황 — 중간 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">중간정산 미완료</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{interimPending?.length ?? 0}건</p>
            <p className="text-sm text-muted-foreground mt-1">
              ${Math.round(interimPendingUsd).toLocaleString('en-US')}
            </p>
            <div className="mt-3 space-y-1">
              {(interimPending ?? []).slice(0, 4).map((t) => (
                <Link key={t.id} href={`/transactions/${t.id}/interim`}
                  className="text-xs text-muted-foreground hover:text-foreground flex justify-between">
                  <span>{t.round_label}</span>
                  <span>${Number(t.import_amount_usd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </Link>
              ))}
              {(interimPending?.length ?? 0) > 4 && (
                <p className="text-xs text-muted-foreground">외 {(interimPending?.length ?? 0) - 4}건</p>
              )}
            </div>
            <Link
              href="/transactions"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3 w-full justify-center')}
            >
              거래 목록 <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </CardContent>
        </Card>

        {/* 미정산 현황 — 클로징 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">클로징 미완료</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{closingPending?.length ?? 0}건</p>
            <p className="text-sm text-muted-foreground mt-1">
              ${Math.round(closingPendingUsd).toLocaleString('en-US')}
            </p>
            <div className="mt-3 space-y-1">
              {(closingPending ?? []).slice(0, 4).map((t) => (
                <Link key={t.id} href={`/transactions/${t.id}/closing`}
                  className="text-xs text-muted-foreground hover:text-foreground flex justify-between">
                  <span>{t.round_label}</span>
                  <span>${Number(t.import_amount_usd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </Link>
              ))}
              {(closingPending?.length ?? 0) > 4 && (
                <p className="text-xs text-muted-foreground">외 {(closingPending?.length ?? 0) - 4}건</p>
              )}
            </div>
            <Link
              href="/transactions"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3 w-full justify-center')}
            >
              거래 목록 <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 컨테이너 추적 현황 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="h-4 w-4" />
            컨테이너 추적 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-10">
          <div>
            <p className="text-3xl font-bold font-mono">{inTransit}</p>
            <p className="text-sm text-muted-foreground">운송 중</p>
          </div>
          <div>
            <p className={cn('text-3xl font-bold font-mono', arrivingSoon > 0 ? 'text-orange-600' : '')}>
              {arrivingSoon}
            </p>
            <p className="text-sm text-muted-foreground">ETA 7일 이내</p>
          </div>
          <div className="ml-auto">
            <Link href="/containers" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              전체 보기 <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 최근 5차 거래 */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">최근 거래 현황</CardTitle>
          <Link href="/transactions" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            전체 보기 <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left px-4 py-2 font-medium">회차</th>
                <th className="text-left px-4 py-2 font-medium">제조사</th>
                <th className="text-right px-4 py-2 font-medium">수입금액</th>
                <th className="text-center px-4 py-2 font-medium">ETD</th>
                <th className="text-center px-4 py-2 font-medium">ETA</th>
                <th className="text-center px-4 py-2 font-medium">정산상태</th>
              </tr>
            </thead>
            <tbody>
              {(recentTx ?? []).map((t, i) => {
                const mfr = Array.isArray(t.manufacturers) ? t.manufacturers[0] : t.manufacturers
                const ctrs = (Array.isArray(t.containers) ? t.containers : []) as { etd: string | null; eta: string | null }[]
                const etd = ctrs.map((c) => c.etd).filter(Boolean).sort()[0] ?? null
                const eta = ctrs.map((c) => c.eta).filter(Boolean).sort().at(-1) ?? null
                return (
                  <tr
                    key={t.id}
                    className={cn(
                      'border-b last:border-0 hover:bg-muted/40 transition-colors',
                      i % 2 === 1 ? 'bg-muted/20' : '',
                    )}
                  >
                    <td className="px-4 py-2.5 font-semibold">
                      <Link href={`/transactions/${t.id}`} className="hover:underline">
                        {t.round_label}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {(mfr as { name: string } | null)?.name ?? '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      ${Number(t.import_amount_usd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">
                      {etd ? formatDate(etd) : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">
                      {eta ? formatDate(eta) : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <StatusBadge status={t.settlement_status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  title, value, icon: Icon, sub,
}: {
  title: string; value: string; icon: React.ElementType; sub?: string
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold font-mono">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  const variant =
    status === 'closing_done'
      ? 'default'
      : status === 'interim_done'
      ? 'secondary'
      : 'outline'
  return (
    <Badge variant={variant as 'default' | 'secondary' | 'outline'} className="text-xs whitespace-nowrap">
      {label}
    </Badge>
  )
}
