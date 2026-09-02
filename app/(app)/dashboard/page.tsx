import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { VerificationIssueCard } from '@/components/dashboard/VerificationIssueCard'
import { PeriodFilterBar } from '@/components/dashboard/PeriodFilterBar'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { YearSummaryTable } from '@/components/dashboard/YearSummaryTable'
import { TransactionOverviewTable } from '@/components/dashboard/TransactionOverviewTable'
import { loadDashboardData, EARLIEST_YEAR } from '@/lib/data/dashboard'

export const metadata: Metadata = {
  title: '정산 현황',
}

/** 연도 문자열만 통과시킨다. 쿼리스트링이 그대로 SQL 범위로 들어가므로. */
function parseYear(value: string | undefined, fallback: number): string {
  const n = Number(value)
  if (!Number.isInteger(n) || n < EARLIEST_YEAR || n > 2100) return String(fallback)
  return String(n)
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; year?: string }>
}) {
  const sp = await searchParams
  const thisYear = new Date().getFullYear()

  // 기존 ?year= 링크도 그대로 동작하게 둔다.
  const from = parseYear(sp.from ?? sp.year, EARLIEST_YEAR)
  const rawTo = parseYear(sp.to ?? sp.year, thisYear)
  const to = rawTo < from ? from : rawTo

  const supabase = await createClient()
  const { rows, yearSummaries, totalCount, totalUsd, verRows } =
    await loadDashboardData(supabase, from, to)

  const periodLabel = from === to ? `${from}년` : `${from}~${to}년`

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold" style={{ color: '#1B5E20' }}>정산 현황</h2>
        <p className="text-xs text-muted-foreground">LC 개설일 기준</p>
        <PeriodFilterBar from={from} to={to} earliestYear={EARLIEST_YEAR} />
      </div>

      <KpiCards totalCount={totalCount} totalUsd={totalUsd} periodLabel={periodLabel} />

      <YearSummaryTable summaries={yearSummaries} />

      <TransactionOverviewTable rows={rows} />

      <VerificationIssueCard rows={verRows} />
    </div>
  )
}
