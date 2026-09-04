import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { loadSettlementCompare } from '@/lib/data/settlementCompare'
import { CompareScreen } from '@/components/settlements/CompareScreen'

export const metadata: Metadata = { title: '중간정산' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const today = new Date().toISOString().slice(0, 10)
  const { rows, summary, error } = await loadSettlementCompare(await createClient(), 'interim', today)

  return (
    <CompareScreen
      kind="interim"
      rows={rows}
      today={today}
      summary={summary}
      error={error}
    />
  )
}
