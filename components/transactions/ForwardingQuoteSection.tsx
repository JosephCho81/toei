'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  blankQuote, loadForwardingQuoteRows, saveForwardingQuoteRows, type QuoteRow,
} from '@/lib/data/forwardingQuotes'
import { ForwardingQuoteReadOnly } from './ForwardingQuoteReadOnly'
import { ForwardingQuoteEditor } from './ForwardingQuoteEditor'

export function ForwardingQuoteSection({ transactionId, isLocked }: {
  transactionId: string
  isLocked: boolean
}) {
  const supabase = createClient()
  const [rows, setRows] = useState<QuoteRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setRows(await loadForwardingQuoteRows(supabase, transactionId))
    setLoaded(true)
  }, [supabase, transactionId])

  useEffect(() => {
    async function run() { await load() }
    run()
  }, [load])

  /** 편집이 일어나면 '저장됨' 표시를 내려 저장하지 않은 변경이 감춰지지 않게 한다. */
  function edit(next: (prev: QuoteRow[]) => QuoteRow[]) {
    setRows(next)
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    const errors = await saveForwardingQuoteRows(supabase, transactionId, rows)
    await load()
    setSaving(false)
    if (errors.length) {
      toast.error(`저장 실패: ${errors[0]}`)
      return
    }
    setSaved(true)
    toast.success('저장했습니다')
  }

  if (!loaded) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">포워딩 견적</CardTitle>
        {!isLocked && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => edit((p) => [...p, blankQuote()])}>
              <Plus className="h-4 w-4 mr-1" />견적 추가
            </Button>
            <Button size="sm" onClick={save} disabled={saving || saved}>
              {saved ? '저장됨' : saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        )}
      </CardHeader>

      {isLocked ? (
        <ForwardingQuoteReadOnly rows={rows} />
      ) : (
        <CardContent className="space-y-4">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              견적 데이터가 없습니다. 견적 추가 버튼을 눌러 추가하세요.
            </p>
          )}
          {rows.map((r) => (
            <ForwardingQuoteEditor
              key={r._key}
              row={r}
              onChange={(next) => edit((p) => p.map((x) => x._key === r._key ? next : x))}
              onRemove={() => edit((p) => p.filter((x) => x._key !== r._key))}
            />
          ))}
        </CardContent>
      )}
    </Card>
  )
}
