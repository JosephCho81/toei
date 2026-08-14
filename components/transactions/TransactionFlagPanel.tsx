'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Check, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format'
import { FLAG_FIELDS, type FlagField, type TxFlag } from '@/types/transaction'

interface Props {
  transactionId: string
  flags: TxFlag[]
  onChange: (flags: TxFlag[]) => void
}

/** 거래 하나의 오류 플래그·메모 편집 패널 (거래목록 펼침 영역에서 사용) */
export function TransactionFlagPanel({ transactionId, flags, onChange }: Props) {
  const supabase = createClient()
  const [busy, setBusy] = useState(false)

  const open = flags.filter((f) => f.status === 'open')
  const resolved = flags.filter((f) => f.status === 'resolved')

  async function addFlag() {
    setBusy(true)
    const { data, error } = await supabase.from('transaction_flags')
      .insert({ transaction_id: transactionId, field: '기타' })
      .select('id,transaction_id,field,memo,status,resolved_memo,created_at')
      .single()
    setBusy(false)
    if (error || !data) { toast.error(`오류 표시 추가 실패: ${error?.message ?? '알 수 없는 오류'}`); return }
    onChange([...flags, data as TxFlag])
  }

  async function patchFlag(id: string, patch: Partial<TxFlag>) {
    const next = flags.map((f) => f.id === id ? { ...f, ...patch } : f)
    onChange(next)
    const { error } = await supabase.from('transaction_flags').update(patch).eq('id', id)
    if (error) toast.error(`저장 실패: ${error.message}`)
  }

  async function removeFlag(id: string) {
    onChange(flags.filter((f) => f.id !== id))
    const { error } = await supabase.from('transaction_flags').delete().eq('id', id)
    if (error) toast.error(`삭제 실패: ${error.message}`)
  }

  async function resolveFlag(id: string) {
    const patch = { status: 'resolved' as const, resolved_at: new Date().toISOString() }
    onChange(flags.map((f) => f.id === id ? { ...f, status: 'resolved' } : f))
    const { error } = await supabase.from('transaction_flags').update(patch).eq('id', id)
    if (error) toast.error(`처리 실패: ${error.message}`)
  }

  async function reopenFlag(id: string) {
    const patch = { status: 'open' as const, resolved_at: null }
    onChange(flags.map((f) => f.id === id ? { ...f, status: 'open' } : f))
    const { error } = await supabase.from('transaction_flags').update(patch).eq('id', id)
    if (error) toast.error(`처리 실패: ${error.message}`)
  }

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">오류 검토</p>
        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={addFlag}>
          <Plus className="h-3 w-3 mr-1" />오류 항목 추가
        </Button>
      </div>

      {open.length === 0 && resolved.length === 0 && (
        <p className="text-xs text-muted-foreground py-1">표시된 오류가 없습니다.</p>
      )}

      {open.map((f) => (
        <div key={f.id} className="flex items-center gap-2">
          <Select value={f.field} onValueChange={(v) => patchFlag(f.id, { field: (v as FlagField) ?? '기타' })}>
            <SelectTrigger className="h-7 text-xs w-24 shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FLAG_FIELDS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            className="h-7 text-xs"
            defaultValue={f.memo ?? ''}
            placeholder="무엇이 잘못되었는지 메모 (예: 3행 수량 250 → 205)"
            onBlur={(e) => {
              const memo = e.target.value.trim() || null
              if (memo !== (f.memo ?? null)) patchFlag(f.id, { memo })
            }}
          />
          <span className="text-[10px] text-muted-foreground shrink-0 w-20">{formatDate(f.created_at)}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 shrink-0"
            title="수정 완료 처리" onClick={() => resolveFlag(f.id)}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0"
            title="삭제" onClick={() => removeFlag(f.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {resolved.length > 0 && (
        <div className="space-y-1 pt-1">
          <p className="text-[11px] text-muted-foreground">처리 완료</p>
          {resolved.map((f) => (
            <div key={f.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-24 shrink-0">[{f.field}]</span>
              <span className="flex-1 line-through">{f.memo || '(메모 없음)'}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0"
                title="다시 열기" onClick={() => reopenFlag(f.id)}>
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive shrink-0"
                title="삭제" onClick={() => removeFlag(f.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
