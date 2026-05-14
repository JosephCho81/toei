'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface TransactionData {
  id: string
  round_no: number
  round_label: string
  order_no: string | null
  manufacturer_id: string | null
  import_amount_usd: string | number | null
  lc_no: string | null
  lc_open_date: string | null
  customs_date: string | null
  customs_exchange_rate: string | number | null
  margin_rate_pct: string | number | null
  notes: string | null
}

interface Manufacturer {
  id: string
  name: string
}

interface Props {
  transactionId: string
  initialData: TransactionData
  manufacturers: Manufacturer[]
}

function toStr(v: string | number | null | undefined): string {
  return v == null ? '' : String(v)
}

export default function TransactionEditForm({ transactionId, initialData, manufacturers }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const initial = {
    round_label: initialData.round_label,
    order_no: initialData.order_no ?? '',
    manufacturer_id: initialData.manufacturer_id ?? '',
    import_amount_usd: toStr(initialData.import_amount_usd),
    lc_no: initialData.lc_no ?? '',
    lc_open_date: initialData.lc_open_date ?? '',
    customs_date: initialData.customs_date ?? '',
    customs_exchange_rate: toStr(initialData.customs_exchange_rate),
    margin_rate_pct: toStr(initialData.margin_rate_pct),
    notes: initialData.notes ?? '',
  }

  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDirty = (Object.keys(initial) as (keyof typeof initial)[]).some(
    (k) => form[k] !== initial[k]
  )

  function set(key: keyof typeof initial, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.round_label) {
      setError('차수 라벨은 필수입니다.')
      return
    }
    setSaving(true)
    const { error: err } = await supabase
      .from('transactions')
      .update({
        round_label: form.round_label,
        order_no: form.order_no || null,
        manufacturer_id: form.manufacturer_id || null,
        import_amount_usd: form.import_amount_usd ? parseFloat(form.import_amount_usd) : null,
        lc_no: form.lc_no || null,
        lc_open_date: form.lc_open_date || null,
        customs_date: form.customs_date || null,
        customs_exchange_rate: form.customs_exchange_rate ? parseFloat(form.customs_exchange_rate) : null,
        margin_rate_pct: form.margin_rate_pct ? parseFloat(form.margin_rate_pct) : null,
        notes: form.notes || null,
      })
      .eq('id', transactionId)

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    router.push(`/transactions/${transactionId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="차수 번호 (변경 불가)">
            <Input value={initialData.round_no} disabled className="bg-muted" />
          </Field>
          <Field label="차수 라벨 *">
            <Input
              value={form.round_label}
              onChange={(e) => set('round_label', e.target.value)}
              required
            />
          </Field>
          <Field label="발주번호">
            <Input
              value={form.order_no}
              onChange={(e) => set('order_no', e.target.value)}
              placeholder="TOSK01/27"
            />
          </Field>
          <Field label="제조사">
            <Select value={form.manufacturer_id} onValueChange={(v) => set('manufacturer_id', v ?? '')}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {manufacturers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="수입금액 (USD)">
            <Input
              type="number"
              step="0.0001"
              value={form.import_amount_usd}
              onChange={(e) => set('import_amount_usd', e.target.value)}
            />
          </Field>
          <Field label="마진율 (%)">
            <Input
              type="number"
              step="0.01"
              value={form.margin_rate_pct}
              onChange={(e) => set('margin_rate_pct', e.target.value)}
            />
          </Field>
          <Field label="LC 번호">
            <Input value={form.lc_no} onChange={(e) => set('lc_no', e.target.value)} />
          </Field>
          <Field label="LC 개설일">
            <Input type="date" value={form.lc_open_date} onChange={(e) => set('lc_open_date', e.target.value)} />
          </Field>
          <Field label="통관일">
            <Input type="date" value={form.customs_date} onChange={(e) => set('customs_date', e.target.value)} />
          </Field>
          <Field label="통관환율 (원/$)">
            <Input
              type="number"
              step="0.0001"
              value={form.customs_exchange_rate}
              onChange={(e) => set('customs_exchange_rate', e.target.value)}
            />
          </Field>
          <div className="col-span-2">
            <Field label="메모">
              <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
        <Button type="submit" disabled={saving || !isDirty}>
          {saving ? '저장 중...' : '저장'}
        </Button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  )
}
