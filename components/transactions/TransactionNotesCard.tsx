'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export function TransactionNotesCard({ transactionId, initialNotes }: { transactionId: string; initialNotes: string }) {
  const supabase = createClient()
  const [notes, setNotes] = useState(initialNotes)

  if (!notes) return null

  async function deleteLine(idx: number) {
    const newLines = notes.split('\n').filter((_, i) => i !== idx).filter(l => l.trim() !== '')
    const newNotes = newLines.join('\n') || null
    await supabase.from('transactions').update({ notes: newNotes }).eq('id', transactionId)
    setNotes(newNotes ?? '')
  }

  const lines = notes.split('\n')

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">메모</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-0.5">
          {lines.map((line, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-sm whitespace-pre-wrap flex-1">{line}</span>
              {/^\d/.test(line.trim()) && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteLine(i)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
