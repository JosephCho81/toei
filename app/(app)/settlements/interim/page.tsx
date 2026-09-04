import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { loadSettlementCompare } from '@/lib/data/settlementCompare'
import { CompareScreen } from '@/components/settlements/CompareScreen'

export const metadata: Metadata = { title: '중간정산' }
export const dynamic = 'force-dynamic'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const view = (await searchParams).view === 'a1' ? 'a1' : 'toei'
  const { rows, summary, error } = await loadSettlementCompare(await createClient(), 'interim')

  return (
    <CompareScreen
      kind="interim"
      rows={rows}
      summary={summary}
      view={view}
      error={error}
    />
  )
}
