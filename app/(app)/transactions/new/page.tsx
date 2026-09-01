'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/NumberInput'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { ItemsInputSection, blankItem, type ItemRow } from '@/components/transactions/ItemsInputSection'
import { Field } from '@/components/transactions/new/Field'
import { ContainerRowsCard } from '@/components/transactions/new/ContainerRowsCard'
import { ForwardingRowsCard } from '@/components/transactions/new/ForwardingRowsCard'
import {
  createTransaction, validateNewTransaction,
  type ContainerRow, type DeliveryDateRow, type ForwardingRow, type NewTransactionForm,
} from '@/lib/transactions/newTransaction'

interface Manufacturer { id: string; name: string }

export default function NewTransactionPage() {
  const router = useRouter()
  const [supabase] = useState(createClient)
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ItemRow[]>([blankItem()])
  const [containers, setContainers] = useState<ContainerRow[]>([])
  const [forwardings, setForwardings] = useState<ForwardingRow[]>([])
  const [deliveryDates, setDeliveryDates] = useState<DeliveryDateRow[]>([])
  const [form, setForm] = useState<NewTransactionForm>({
    round_no: '', round_label: '', order_no: '', manufacturer_id: '',
    import_amount_usd: '', lc_no: '', lc_open_date: '', customs_date: '',
    customs_exchange_rate: '', notes: '',
  })

  useEffect(() => {
    supabase.from('manufacturers').select('id,name').order('name').then(({ data }) => {
      setManufacturers(data ?? [])
    })
  }, [supabase])

  function set(key: keyof NewTransactionForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const input = { form, items, containers, forwardings, deliveryDates }
    const problem = validateNewTransaction(input)
    setError(problem)
    if (problem) return

    setSaving(true)
    try {
      const id = await createTransaction(supabase, input)
      router.push(`/transactions/${id}`)
    } catch (err) {
      setSaving(false)
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-2xl font-bold">새 거래 등록</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
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
                  {manufacturers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="수입금액 (USD)">
              <NumberInput className="font-mono text-right" value={form.import_amount_usd} onValueChange={(v) => set('import_amount_usd', v)} />
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
              <NumberInput className="font-mono text-right" value={form.customs_exchange_rate} onValueChange={(v) => set('customs_exchange_rate', v)} />
            </Field>
            <div className="col-span-2">
              <Field label="메모">
                <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </Field>
            </div>
            <div className="col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">납기일</label>
                <Button
                  type="button" size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => setDeliveryDates((p) => [...p, { _key: crypto.randomUUID(), date: '' }])}
                >
                  <Plus className="h-3 w-3 mr-1" />추가
                </Button>
              </div>
              {deliveryDates.length === 0 && (
                <p className="text-sm text-muted-foreground py-1">납기일이 없습니다.</p>
              )}
              <div className="space-y-1">
                {deliveryDates.map((d, i) => (
                  <div key={d._key} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-8 shrink-0">{i + 1}차</span>
                    <Input
                      value={d.date}
                      onChange={(e) => setDeliveryDates((p) => p.map((x) => x._key === d._key ? { ...x, date: e.target.value } : x))}
                      placeholder="3월 22일"
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => setDeliveryDates((p) => p.filter((x) => x._key !== d._key))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">품목</CardTitle></CardHeader>
          <CardContent>
            <ItemsInputSection items={items} onChange={setItems} />
          </CardContent>
        </Card>
        <ContainerRowsCard containers={containers} onChange={setContainers} />

        <ForwardingRowsCard forwardings={forwardings} onChange={setForwardings} />

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
          <Button type="submit" disabled={saving}>{saving ? '저장 중...' : '등록'}</Button>
        </div>
      </form>
    </div>
  )
}
