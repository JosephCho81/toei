'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'

type SettlementTable = 'interim_settlements' | 'closing_settlements'

const LABEL: Record<SettlementTable, string> = {
  interim_settlements: '중간정산',
  closing_settlements: '클로징 정산',
}

const CHILD_TABLE: Record<SettlementTable, { table: string; fk: string; label: string }[]> = {
  interim_settlements: [{ table: 'interim_cost_items', fk: 'interim_settlement_id', label: '비용항목' }],
  closing_settlements: [
    { table: 'lc_fee_items', fk: 'closing_settlement_id', label: 'LC 수수료 항목' },
    { table: 'closing_cost_items', fk: 'closing_settlement_id', label: '추가비용 항목' },
  ],
}

/** 잘못 만든 정산을 통째로 지우고 처음부터 다시 입력할 수 있게 한다. 잠긴 정산은 먼저 잠금 해제해야 한다. */
export function DeleteSettlementButton({
  table, settlementId, isLocked, onDeleted,
}: {
  table: SettlementTable
  settlementId: string
  isLocked: boolean
  onDeleted: () => void
}) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [childCounts, setChildCounts] = useState<{ label: string; count: number }[] | null>(null)

  async function openDialog() {
    setOpen(true)
    setChildCounts(null)
    const counts = await Promise.all(
      CHILD_TABLE[table].map(async (c) => {
        const { count } = await supabase
          .from(c.table)
          .select('id', { count: 'exact', head: true })
          .eq(c.fk, settlementId)
        return { label: c.label, count: count ?? 0 }
      })
    )
    setChildCounts(counts)
  }

  async function handleDelete() {
    setBusy(true)
    try {
      // RLS로 막히면 error 없이 0건이 돌아온다 → select로 실제 반영 여부를 확인
      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq('id', settlementId)
        .select('id')
      if (error) throw error
      if (!data?.length) throw new Error('권한이 없거나 대상을 찾을 수 없습니다.')

      toast.success(`${LABEL[table]}을(를) 삭제했습니다.`)
      setOpen(false)
      onDeleted()
    } catch (e) {
      toast.error(`삭제 실패: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  if (isLocked) return null

  return (
    <>
      <Button variant="outline" size="sm" className="text-destructive" onClick={openDialog}>
        <Trash2 className="h-4 w-4 mr-1" />정산 삭제
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{LABEL[table]}을(를) 삭제할까요?</DialogTitle>
            <DialogDescription>이 차수의 {LABEL[table]} 입력값이 모두 사라집니다. 되돌릴 수 없습니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>함께 삭제되는 하위 데이터:</p>
            {childCounts === null ? (
              <p>확인 중...</p>
            ) : (
              <ul className="list-disc pl-4 space-y-1">
                {childCounts.map((c) => (
                  <li key={c.label}><b>{c.label}</b> {c.count}건</li>
                ))}
              </ul>
            )}
            <p>거래(차수)와 품목·컨테이너는 그대로 남습니다.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>취소</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy || childCounts === null}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
