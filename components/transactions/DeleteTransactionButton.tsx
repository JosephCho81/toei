'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'

const CHILDREN = [
  { table: 'transaction_items', label: '품목' },
  { table: 'containers', label: '컨테이너' },
  { table: 'interim_settlements', label: '중간정산' },
  { table: 'closing_settlements', label: '클로징정산' },
  { table: 'forwarding_quotes', label: '포워딩 견적' },
  { table: 'settlement_deadlines', label: '마감일 알림' },
  { table: 'transaction_flags', label: '이슈 플래그' },
  { table: 'transaction_amount_checks', label: '금액 대조' },
] as const

/**
 * 임시로 만든 차수(예: 한 차수를 LC별로 쪼개 놓은 가짜 차수)를 지울 수 있게 한다.
 * 정산 금액이 딸려 삭제되므로 차수 라벨을 그대로 입력해야만 실행된다.
 */
export function DeleteTransactionButton({
  transactionId, roundLabel,
}: {
  transactionId: string
  roundLabel: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [counts, setCounts] = useState<{ label: string; count: number }[] | null>(null)

  async function openDialog() {
    setOpen(true)
    setConfirmText('')
    setCounts(null)
    const rows = await Promise.all(
      CHILDREN.map(async (c) => {
        const { count } = await supabase
          .from(c.table)
          .select('id', { count: 'exact', head: true })
          .eq('transaction_id', transactionId)
        return { label: c.label, count: count ?? 0 }
      })
    )
    setCounts(rows)
  }

  async function handleDelete() {
    setBusy(true)
    try {
      // RLS로 막히면 error 없이 0건이 돌아온다 → select로 실제 반영 여부를 확인
      const { data, error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .select('id')
      if (error) throw error
      if (!data?.length) throw new Error('권한이 없거나 대상을 찾을 수 없습니다. 확정된 정산이 있으면 먼저 잠금을 해제하세요.')

      toast.success(`${roundLabel}을(를) 삭제했습니다.`)
      setOpen(false)
      router.push('/transactions')
      router.refresh()
    } catch (e) {
      toast.error(`삭제 실패: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const hasSettlement = (counts ?? []).some(
    (c) => (c.label === '중간정산' || c.label === '클로징정산') && c.count > 0
  )

  return (
    <Card className="border-destructive/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-destructive">위험 구역</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          이 차수를 삭제하면 품목·컨테이너·정산까지 전부 함께 사라집니다.
        </p>
        <Button variant="destructive" size="sm" onClick={openDialog}>
          <Trash2 className="h-4 w-4 mr-1" />차수 삭제
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{roundLabel}을(를) 삭제할까요?</DialogTitle>
            <DialogDescription>되돌릴 수 없습니다. 아래 데이터가 모두 함께 삭제됩니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            {counts === null ? (
              <p>확인 중...</p>
            ) : (
              <ul className="list-disc pl-4 space-y-1">
                {counts.map((c) => (
                  <li key={c.label} className={c.count > 0 ? 'text-foreground' : undefined}>
                    <b>{c.label}</b> {c.count}건
                  </li>
                ))}
              </ul>
            )}
            {hasSettlement && (
              <p className="text-destructive">
                이 차수에는 정산 데이터가 있습니다. 정말 지워도 되는지 다시 확인하세요.
              </p>
            )}
            <div className="space-y-1 pt-1">
              <Label className="text-sm">
                확인을 위해 <b className="text-foreground">{roundLabel}</b> 을(를) 그대로 입력하세요
              </Label>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={roundLabel} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>취소</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={busy || counts === null || confirmText.trim() !== roundLabel}
            >
              영구 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
