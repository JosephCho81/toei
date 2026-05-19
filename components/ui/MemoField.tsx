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
}

export function MemoField({ notes, onSave, disabled = false }: MemoFieldProps) {
  const [lines, setLines] = useState<string[]>(() =>
    notes ? notes.split('\n').filter(l => l.trim() !== '') : []
  )
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  async function persist(newLines: string[]) {
    setSaving(true)
    try {
      const newNotes = newLines.length > 0 ? newLines.join('\n') : null
      await onSave(newNotes)
      setLines(newLines)
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
