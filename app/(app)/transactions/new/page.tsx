'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Manufacturer {
  id: string
  name: string
}

export default function NewTransactionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    round_no: '',
    round_label: '',
    order_no: '',
    manufacturer_id: '',
    import_amount_usd: '',
    lc_no: '',
    lc_open_date: '',
    customs_date: '',
    customs_exchange_rate: '',
    margin_rate_pct: '',
    notes: '',
  })

  useEffect(() => {
    supabase.from('manufacturers').select('id,name').order('name').then(({ data }) => {
      setManufacturers(data ?? [])
    })
  }, [])

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.round_no || !form.round_label) {
      setError('차수 번호와 라벨은 필수입니다.')
      return
    }
    setSaving(true)
    const { data, error: err } = await supabase.from('transactions').insert({
      round_no: parseInt(form.round_no),
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
    }).select('id').single()

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    router.push(`/transactions/${data.id}`)
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-2xl font-bold">새 거래 등록</h2>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="차수 번호 *">
              <Input type="number" value={form.round_no} onChange={(e) => set('round_no', e.target.value)} required />
            </Field>
            <Field label="차수 라벨 *">
              <Input value={form.round_label} onChange={(e) => set('round_label', e.target.value)} placeholder="26년 42차" required />
            </Field>
            <Field label="발주번호">
              <Input value={form.order_no} onChange={(e) => set('order_no', e.target.value)} placeholder="TOSK01/27" />
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
              <Input type="number" step="0.0001" value={form.import_amount_usd} onChange={(e) => set('import_amount_usd', e.target.value)} />
            </Field>
            <Field label="마진율 (%)">
              <Input type="number" step="0.01" value={form.margin_rate_pct} onChange={(e) => set('margin_rate_pct', e.target.value)} />
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
              <Input type="number" step="0.0001" value={form.customs_exchange_rate} onChange={(e) => set('customs_exchange_rate', e.target.value)} />
            </Field>
            <div className="col-span-2">
              <Field label="메모">
                <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </Field>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        <div className="flex gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
          <Button type="submit" disabled={saving}>{saving ? '저장 중...' : '등록'}</Button>
        </div>
      </form>
    </div>
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
