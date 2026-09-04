import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { loadSettlementCompare } from '@/lib/data/settlementCompare'
import { CompareScreen } from '@/components/settlements/CompareScreen'

export const metadata: Metadata = { title: '최종정산' }
export const dynamic = 'force-dynamic'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const view = (await searchParams).view === 'a1' ? 'a1' : 'toei'
  const { rows, summary, error } = await loadSettlementCompare(await createClient(), 'closing')

  return (
    <CompareScreen
      kind="closing"
      rows={rows}
      summary={summary}
      view={view}
      error={error}
    />
  )
}
