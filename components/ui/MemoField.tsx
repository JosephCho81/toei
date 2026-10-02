'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { toast } from 'sonner'

interface MemoFieldProps {
  notes: string | null
  onSave: (newNotes: string | null) => Promise<void>
  disabled?: boolean
  /** 마지막 저장 「토에이 · 10-02」. 메모 글에 넣지 않고 아래에 작게 보인다 (043) */
  stamp?: string | null
}

export function MemoField({ notes, onSave, disabled = false, stamp = null }: MemoFieldProps) {
  const [lines, setLines] = useState<string[]>(() =>
    notes ? notes.split('\n').filter(l => l.trim() !== '') : []
  )
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  // 저장 직후에는 옛 작성 정보가 남아 「에이원이 적었다」고 틀리게 말한다 — 새 값이 내려올 때까지 「방금」
  const [fresh, setFresh] = useState(false)
  const [seenStamp, setSeenStamp] = useState(stamp)
  if (stamp !== seenStamp) {
    setSeenStamp(stamp)
    setFresh(false)
  }

  async function persist(newLines: string[]) {
    setSaving(true)
    try {
      const newNotes = newLines.length > 0 ? newLines.join('\n') : null
      await onSave(newNotes)
      setLines(newLines)
      setFresh(true)
    } catch {
      toast.error('저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  async function deleteLine(idx: number) {
    await persist(lines.filter((_, i) => i !== idx))
  }

  async function addLine() {
    const trimmed = input.trim()
    if (!trimmed) return
    await persist([...lines, trimmed])
    setInput('')
  }

  return (
    <div className="space-y-1">
      {lines.map((line, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground w-5 shrink-0 text-right">{i + 1}.</span>
          <span className="text-sm flex-1">{line}</span>
          {!disabled && (
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => deleteLine(i)}
              disabled={saving}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
      {(fresh || stamp) && lines.length > 0 && (
        <p className="pl-7 text-xs text-muted-foreground">마지막 저장 {fresh ? '방금' : stamp}</p>
      )}
      {!disabled && (
        <div className="flex gap-2 pt-1">
          <Input
            className="text-sm h-8"
            placeholder="메모 추가..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLine() } }}
            disabled={saving}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0"
            onClick={addLine}
            disabled={saving || !input.trim()}
          >
            추가
          </Button>
        </div>
      )}
    </div>
  )
}
