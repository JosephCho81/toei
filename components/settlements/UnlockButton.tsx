'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

type LockTable = 'interim_settlements' | 'closing_settlements'

const LABEL: Record<LockTable, string> = {
  interim_settlements: '중간정산',
  closing_settlements: '클로징 정산',
}

export function UnlockButton({
  table, settlementId, onUnlocked,
}: {
  table: LockTable
  settlementId: string
  onUnlocked: () => void
}) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleUnlock() {
    setBusy(true)
    try {
      // RLS로 막히면 error 없이 0건이 돌아온다 → select로 실제 반영 여부를 확인
      const { data, error } = await supabase
        .from(table)
        .update({ is_locked: false, locked_at: null })
        .eq('id', settlementId)
        .select('id')
      if (error) throw error
      if (!data?.length) throw new Error('권한이 없거나 대상을 찾을 수 없습니다.')

      toast.success(`${LABEL[table]} 잠금 해제됨 — 수정 후 다시 "확정 및 잠금"을 눌러주세요.`)
      setOpen(false)
      onUnlocked()
    } catch (e) {
      toast.error(`잠금 해제 실패: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>🔓 잠금 해제 후 수정</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{LABEL[table]} 잠금을 해제할까요?</DialogTitle>
            <DialogDescription>확정된 정산을 다시 편집 가능한 상태로 되돌립니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc pl-4 space-y-1">
              <li>정산 상태가 <b>임시 저장</b>으로 내려갑니다.</li>
              <li>리포트·PDF에 표시되는 확정금액이 바뀔 수 있습니다.</li>
              <li>다시 확정하기 전까지는 정산 완료로 집계되지 않습니다.</li>
            </ul>
            <p>수정을 마치면 반드시 <b>확정 및 잠금</b>을 다시 눌러주세요.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>취소</Button>
            <Button onClick={handleUnlock} disabled={busy}>잠금 해제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
