import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { loadSettlementCompare } from '@/lib/data/settlementCompare'
import { CompareScreen } from '@/components/settlements/CompareScreen'
import { PenaltyNote } from '@/components/settlements/PenaltyNote'

export const metadata: Metadata = { title: '지체상금' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const today = new Date().toISOString().slice(0, 10)
  const { rows, summary, error } = await loadSettlementCompare(await createClient(), 'penalty', today)

  return (
    <CompareScreen
      kind="penalty"
      rows={rows}
      today={today}
      summary={summary}
      error={error}
      note={<PenaltyNote />}
    />
  )
}
