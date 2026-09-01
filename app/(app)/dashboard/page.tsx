import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { VerificationIssueCard } from '@/components/dashboard/VerificationIssueCard'
import { YearFilterBar } from '@/components/dashboard/YearFilterBar'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { DDayCard } from '@/components/dashboard/DDayCard'
import { PendingCards } from '@/components/dashboard/PendingCards'
import { ContainerTrackingCard } from '@/components/dashboard/ContainerTrackingCard'
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard'
import { loadDashboardData } from '@/lib/data/dashboard'

export const metadata: Metadata = {
  title: '정산 현황',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const year = (await searchParams).year ?? '2026'
  const supabase = await createClient()

  const {
    totalCount, totalUsd, closingDone,
    interimPending, interimPendingUsd,
    closingPending, closingPendingUsd, totalPendingUsd, pendingCount,
    ddayList, containers, inTransit, arrivingSoon,
    verRows, recentTx,
  } = await loadDashboardData(supabase, year)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: '#1B5E20' }}>정산 현황</h2>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">LC 개설일 기준</p>
        <YearFilterBar currentYear={year} />
        <p className="text-sm" style={{ color: '#388E3C' }}>
          {year}년 거래 기준 · 총 {totalCount}건
        </p>
      </div>

      <KpiCards
        totalCount={totalCount} totalUsd={totalUsd} closingDone={closingDone}
        pendingCount={pendingCount} totalPendingUsd={totalPendingUsd}
      />

      <DDayCard ddayList={ddayList} />

      <PendingCards
        interimPending={interimPending} interimPendingUsd={interimPendingUsd}
        closingPending={closingPending} closingPendingUsd={closingPendingUsd}
      />

      <ContainerTrackingCard
        containers={containers} inTransit={inTransit} arrivingSoon={arrivingSoon}
      />

      <RecentTransactionsCard recentTx={recentTx} />

      <VerificationIssueCard rows={verRows} />
    </div>
  )
}
