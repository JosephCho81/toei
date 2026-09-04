'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

/**
 * 지체상금 입력.
 *
 * 산식이 아직 없다 — 담당자가 「우선 수기로 별도 입력 후 차후 정리」하기로 했다.
 * 그래서 계산해 주지 않고 적어 넣게 한다. 지어낸 값이 사실처럼 굳는 것보다 낫다.
 *
 * 넣은 금액은 중간·최종정산과 똑같이 지급과 대사되어 미수금에 합산된다.
 */
export function PenaltyNote() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    roundNo: '', incurredOn: '', reason: '', amountKrw: '', dueDate: '', note: '',
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const res = await fetch('/api/penalties', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, roundNo: undefined, transactionId: form.roundNo }),
    })
    setBusy(false)

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: '저장하지 못했습니다' }))
      setError(msg)
      return
    }
    setForm({ roundNo: '', incurredOn: '', reason: '', amountKrw: '', dueDate: '', note: '' })
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="rounded-md border bg-slate-50 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground">
          지체상금은 <span className="font-semibold text-foreground">산식이 아직 정해지지 않아</span> 금액을 직접 넣습니다.
          넣은 금액은 중간·최종정산과 같은 방식으로 지급과 대사되어 미수금에 합산됩니다.
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-1 hover:bg-slate-100"
        >
          <Plus className="h-3.5 w-3.5" /> 지체상금 입력
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-3 grid grid-cols-1 gap-2 border-t pt-3 sm:grid-cols-3">
          <Field label="차수 (거래 ID)" hint="거래 상세 주소의 ID를 붙여 넣습니다">
            <input required value={form.roundNo}
              onChange={(e) => setForm({ ...form, roundNo: e.target.value })}
              className="w-full rounded-sm border px-2 py-1" />
          </Field>
          <Field label="발생일">
            <input required type="date" value={form.incurredOn}
              onChange={(e) => setForm({ ...form, incurredOn: e.target.value })}
              className="w-full rounded-sm border px-2 py-1" />
          </Field>
          <Field label="청구 기일" hint="비우면 중간정산 기일 규칙을 따릅니다">
            <input type="date" value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full rounded-sm border px-2 py-1" />
          </Field>
          <Field label="금액 (원)" hint="양수 = 에이원이 낼 돈, 음수 = 토에이 환급">
            <input required inputMode="numeric" value={form.amountKrw}
              onChange={(e) => setForm({ ...form, amountKrw: e.target.value })}
              className="w-full rounded-sm border px-2 py-1 text-right tabular-nums" />
          </Field>
          <Field label="사유" hint="산식이 없는 동안 유일한 근거입니다">
            <input required value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full rounded-sm border px-2 py-1" />
          </Field>
          <Field label="메모">
            <input value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full rounded-sm border px-2 py-1" />
          </Field>

          <div className="sm:col-span-3 flex items-center gap-2">
            <button type="submit" disabled={busy}
              className="rounded-md bg-slate-800 px-3 py-1.5 font-semibold text-white disabled:opacity-40">
              {busy ? '저장 중…' : '저장'}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-md border bg-white px-3 py-1.5 hover:bg-slate-100">
              취소
            </button>
            {error && <span className="text-red-700">{error}</span>}
          </div>
        </form>
      )}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}
