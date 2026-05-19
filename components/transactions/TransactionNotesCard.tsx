'use client'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MemoField } from '@/components/ui/MemoField'

export function TransactionNotesCard({ transactionId, initialNotes }: { transactionId: string; initialNotes: string | null }) {
  const supabase = createClient()

  async function save(newNotes: string | null) {
    const { error } = await supabase.from('transactions').update({ notes: newNotes }).eq('id', transactionId)
    if (error) throw error
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">메모</CardTitle></CardHeader>
      <CardContent>
        <MemoField notes={initialNotes} onSave={save} />
      </CardContent>
    </Card>
  )
}
