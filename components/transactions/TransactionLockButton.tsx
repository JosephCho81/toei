'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Lock, LockOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

/**
 * 거래(차수)의 잠금을 화면에서 풀고 다시 건다.
 * 잠긴 거래는 수정 버튼도 정산 링크도 사라지므로, 이 버튼이 없으면 되돌릴 방법이 없었다.
 */
export function TransactionLockButton({
  transactionId, isLocked,
}: {
  transactionId: string
  isLocked: boolean
}) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [alsoSettlements, setAlsoSettlements] = useState(true)
  const [lockedCounts, setLockedCounts] = useState<{ interim: number; closing: number } | null>(null)

  async function openDialog() {
    setOpen(true)
    setLockedCounts(null)
    const [interim, closing] = await Promise.all([
      supabase.from('interim_settlements').select('id', { count: 'exact', head: true })
        .eq('transaction_id', transactionId).eq('is_locked', true),
      supabase.from('closing_settlements').select('id', { count: 'exact', head: true })
        .eq('transaction_id', transactionId).eq('is_locked', true),
    ])
    setLockedCounts({ interim: interim.count ?? 0, closing: closing.count ?? 0 })
  }

  /** RLS로 막히면 error 없이 0건이 돌아온다 → select로 실제 반영 여부를 확인 */
  async function setTxLock(locked: boolean) {
    const { data, error } = await supabase
      .from('transactions')
      .update({ is_locked: locked })
      .eq('id', transactionId)
      .select('id')
    if (error) throw error
    if (!data?.length) throw new Error('권한이 없거나 대상을 찾을 수 없습니다.')
  }

  async function handleUnlock() {
    setBusy(true)
    try {
      await setTxLock(false)
      if (alsoSettlements) {
        for (const table of ['interim_settlements', 'closing_settlements'] as const) {
          const { error } = await supabase
            .from(table)
            .update({ is_locked: false, locked_at: null })
            .eq('transaction_id', transactionId)
            .eq('is_locked', true)
          if (error) throw error
        }
      }
      toast.success(
        alsoSettlements
          ? '잠금 해제됨 — 거래와 정산을 모두 수정할 수 있습니다.'
          : '거래 잠금 해제됨 — 정산 금액은 각 정산 화면에서 따로 풀어야 합니다.'
      )
      setOpen(false)
      router.refresh()
    } catch (e) {
      toast.error(`잠금 해제 실패: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleLock() {
    setBusy(true)
    try {
      await setTxLock(true)
      toast.success('거래를 잠갔습니다.')
      router.refresh()
    } catch (e) {
      toast.error(`잠금 실패: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  if (!isLocked) {
    return (
      <Button variant="outline" size="sm" onClick={handleLock} disabled={busy}>
        <Lock className="h-4 w-4 mr-1" />잠금
      </Button>
    )
  }

  const settlementCount = (lockedCounts?.interim ?? 0) + (lockedCounts?.closing ?? 0)

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog}>
        <LockOpen className="h-4 w-4 mr-1" />잠금 해제 후 수정
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>이 차수의 잠금을 풀까요?</DialogTitle>
            <DialogDescription>기본 정보 · 품목 · 컨테이너 · 포워딩 견적을 다시 입력할 수 있게 됩니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <label className="flex items-start gap-2 rounded-md border p-3 text-foreground">
              <Checkbox checked={alsoSettlements} onCheckedChange={(v) => setAlsoSettlements(Boolean(v))} className="mt-0.5" />
              <span>
                중간정산 · 클로징정산 잠금도 함께 해제
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {lockedCounts === null
                    ? '확인 중...'
                    : settlementCount === 0
                      ? '잠긴 정산이 없습니다.'
                      : `잠긴 정산 ${settlementCount}건 (중간 ${lockedCounts.interim} · 클로징 ${lockedCounts.closing})`}
                </span>
              </span>
            </label>
            <ul className="list-disc pl-4 space-y-1">
              <li>입력값은 지워지지 않습니다. 편집 가능 상태로만 바뀝니다.</li>
              <li>정산을 함께 풀면 그 차수는 <b>정산 완료 집계에서 빠집니다.</b></li>
              <li>리포트·PDF의 확정금액이 수정 결과에 따라 바뀝니다.</li>
            </ul>
            <p>수정을 마치면 정산 화면에서 <b>확정 및 잠금</b>을 다시 눌러주세요.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>취소</Button>
            <Button onClick={handleUnlock} disabled={busy || lockedCounts === null}>잠금 해제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
