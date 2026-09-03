'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NumberInput } from '@/components/ui/NumberInput'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import type { PaymentRow, Installment } from '@/lib/data/payments'

export type PaymentDraft =
  | { mode: 'create'; row: PaymentRow }
  | { mode: 'edit'; row: PaymentRow; installment: Installment }

/**
 * 지급 한 건 입력·수정.
 *
 * 담당자는 「배분」이라는 개념을 몰라도 된다 — 여기서 넣으면 그 차수 배분이 자동으로 생긴다.
 * 한 번의 이체가 여러 차수에 걸칠 때만 통장 원장으로 넘긴다.
 */
export function PaymentDialog({
  draft,
  onClose,
  onSaved,
}: {
  draft: PaymentDraft
  onClose: () => void
  onSaved: () => void
}) {
  const { row } = draft
  const editing = draft.mode === 'edit' ? draft.installment : null

  const [paidAt, setPaidAt] = useState(editing?.paidAt ?? new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState(editing ? String(Math.abs(editing.amountKrw)) : '')
  const [direction, setDirection] = useState<'out' | 'in'>(editing?.direction ?? 'out')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountNum = amount === '' ? null : Number(amount)
  const valid = amountNum != null && Number.isInteger(amountNum) && amountNum > 0
  // 이 건을 반영하면 잔액이 얼마가 되는지 저장 전에 보여준다.
  const delta = valid ? (direction === 'in' ? -amountNum : amountNum) : 0
  const before = editing ? row.balanceKrw + editing.amountKrw : row.balanceKrw
  const after = before - delta

  async function submit() {
    if (!valid) return
    setSaving(true)
    setError(null)

    const res = editing
      ? await fetch(`/api/payments/${editing.paymentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paidAt, amountKrw: amountNum, bankMemo: memo || null }),
        })
      : await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paidAt,
            amountKrw: amountNum,
            direction,
            bankMemo: memo || null,
            allocations: [
              { transactionId: row.transactionId, kind: 'interim', amountKrw: amountNum },
            ],
          }),
        })

    setSaving(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: '저장하지 못했습니다' }))
      setError(body.error ?? '저장하지 못했습니다')
      return
    }
    onSaved()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {row.roundLabel} 지급 {editing ? '수정' : '입력'}
          </DialogTitle>
          <DialogDescription>
            청구 {row.billedKrw == null ? '—' : row.billedKrw.toLocaleString('ko-KR')}원
            {' · '}
            {editing ? '이 회차만 고칩니다' : `현재 잔액 ${row.balanceKrw.toLocaleString('ko-KR')}원`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-[76px_1fr] items-center gap-3">
            <Label htmlFor="paidAt">지급일</Label>
            <Input id="paidAt" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>

          <div className="grid grid-cols-[76px_1fr] items-center gap-3">
            <Label htmlFor="amount">금액</Label>
            <NumberInput
              id="amount"
              value={amount}
              onValueChange={setAmount}
              placeholder="0"
              className="text-right font-mono"
            />
          </div>

          {!editing && (
            <div className="grid grid-cols-[76px_1fr] items-center gap-3">
              <Label htmlFor="direction">구분</Label>
              <select
                id="direction"
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'out' | 'in')}
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="out">출금 (토에이 → 에이원)</option>
                <option value="in">입금 (환급·상계)</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-[76px_1fr] items-center gap-3">
            <Label htmlFor="memo">메모</Label>
            <Input
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="통장 적요 · 선택"
            />
          </div>

          {!editing && (
            <p className="text-xs text-muted-foreground">
              한 번의 이체가 여러 차수에 걸친다면{' '}
              <Link href="/payments/ledger" className="text-primary underline">
                통장 원장에서 나눠 넣으세요
              </Link>
              .
            </p>
          )}

          {error && (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="items-center justify-between sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {valid
              ? <>반영 후 잔액 <b className="font-mono text-foreground">{after.toLocaleString('ko-KR')}원</b></>
              : '금액을 입력하세요'}
          </span>
          <span className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>취소</Button>
            <Button size="sm" onClick={submit} disabled={!valid || saving}>
              {saving ? '저장 중…' : '저장'}
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
