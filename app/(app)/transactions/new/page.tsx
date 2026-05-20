'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ItemsInputSection, blankItem, type ItemRow } from '@/components/transactions/ItemsInputSection'
import { Plus, Trash2 } from 'lucide-react'

interface Manufacturer { id: string; name: string }

interface ContainerRow {
  _key: string
  container_no: string
  carrier: string
  etd: string
  eta: string
}

interface DeliveryDateRow {
  _key: string
  date: string
}

interface ForwardingDetailRow {
  _key: string
  item_name: string
  quote_amount_krw: string
  actual_amount_krw: string
  is_vat_taxable: boolean
}

interface ForwardingRow {
  _key: string
  forwarder_name: string
  quote_date: string
  details: ForwardingDetailRow[]
}

const DEFAULT_FORWARDING_ITEMS = ['해상운임', '터미널 처리비(THC)', '서류발급비(D/O Fee)', '내륙운송비', '기타운임']

function blankDetail(item_name = ''): ForwardingDetailRow {
  return { _key: crypto.randomUUID(), item_name, quote_amount_krw: '', actual_amount_krw: '', is_vat_taxable: false }
}

function blankContainer(): ContainerRow {
  return { _key: crypto.randomUUID(), container_no: '', carrier: '', etd: '', eta: '' }
}

function blankForwarding(): ForwardingRow {
  return {
    _key: crypto.randomUUID(),
    forwarder_name: '오션마스터',
    quote_date: '',
    details: DEFAULT_FORWARDING_ITEMS.map((name) => blankDetail(name)),
  }
}

export default function NewTransactionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ItemRow[]>([blankItem()])
  const [containers, setContainers] = useState<ContainerRow[]>([])
  const [forwardings, setForwardings] = useState<ForwardingRow[]>([])
  const [deliveryDates, setDeliveryDates] = useState<DeliveryDateRow[]>([])
  const [form, setForm] = useState({
    round_no: '', round_label: '', order_no: '', manufacturer_id: '',
    import_amount_usd: '', lc_no: '', lc_open_date: '', customs_date: '',
    customs_exchange_rate: '', notes: '',
  })

  useEffect(() => {
    supabase.from('manufacturers').select('id,name').order('name').then(({ data }) => {
      setManufacturers(data ?? [])
    })
  }, [])

  function set(key: string, value: string) { setForm((prev) => ({ ...prev, [key]: value })) }

  function setContainer(key: string, field: keyof Omit<ContainerRow, '_key'>, value: string) {
    setContainers((prev) => prev.map((r) => r._key === key ? { ...r, [field]: value } : r))
  }

  function setForwardingHeader(fKey: string, field: 'forwarder_name' | 'quote_date', value: string) {
    setForwardings((prev) => prev.map((r) => r._key === fKey ? { ...r, [field]: value } : r))
  }

  function setForwardingDetail(fKey: string, dKey: string, field: keyof Omit<ForwardingDetailRow, '_key'>, value: string | boolean) {
    setForwardings((prev) => prev.map((r) => r._key !== fKey ? r : {
      ...r,
      details: r.details.map((d) => d._key === dKey ? { ...d, [field]: value } : d),
    }))
  }

  function addForwardingDetail(fKey: string) {
    setForwardings((prev) => prev.map((r) => r._key !== fKey ? r : {
      ...r,
      details: [...r.details, blankDetail()],
    }))
  }

  function removeForwardingDetail(fKey: string, dKey: string) {
    setForwardings((prev) => prev.map((r) => r._key !== fKey ? r : {
      ...r,
      details: r.details.filter((d) => d._key !== dKey),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.round_no || !form.round_label) { setError('차수 번호와 라벨은 필수입니다.'); return }
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
      notes: form.notes || null,
      delivery_dates: deliveryDates.length > 0
        ? deliveryDates.map((d, i) => ({ seq: i + 1, date: d.date }))
        : null,
    }).select('id').single()

    if (err) { setSaving(false); setError(err.message); return }

    const validItems = items.filter((r) => r.spec || r.quantity || r.unit_price_usd)
    if (validItems.length > 0) {
      await supabase.from('transaction_items').insert(
        validItems.map((r, i) => ({
          transaction_id: data.id,
          spec: r.spec || null, glove_type: r.glove_type || null,
          color: r.color || null, size: r.size || null,
          unit_price_usd: r.unit_price_usd ? parseFloat(r.unit_price_usd) : null,
          quantity: r.quantity ? parseInt(r.quantity) : null,
          unit: r.unit || 'DZ',
          sort_order: i,
        }))
      )
    }

    const validContainers = containers.filter((r) => r.container_no || r.etd || r.eta)
    if (validContainers.length > 0) {
      await supabase.from('containers').insert(
        validContainers.map((r) => ({
          transaction_id: data.id,
          container_no: r.container_no || null,
          carrier: r.carrier || null,
          etd: r.etd || null,
          eta: r.eta || null,
          api_type: 'manual' as const,
        }))
      )
    }

    const validForwardings = forwardings.filter((r) => r.forwarder_name)
    for (const [i, r] of validForwardings.entries()) {
      const { data: fq } = await supabase.from('forwarding_quotes').insert({
        transaction_id: data.id,
        forwarder_name: r.forwarder_name,
        quote_date: r.quote_date || null,
        sort_order: i,
      }).select('id').single()
      if (fq?.id) {
        const itemRows = r.details.filter(d => d.item_name).flatMap((d, j) => {
          const quoteAmt = parseInt(d.quote_amount_krw) || 0
          const actualAmt = parseInt(d.actual_amount_krw) || 0
          const rows = []
          if (quoteAmt) rows.push({ forwarding_quote_id: fq.id, item_type: 'quote', item_name: d.item_name, amount_krw: quoteAmt, is_vat_taxable: false, sort_order: j * 2 })
          if (actualAmt) rows.push({ forwarding_quote_id: fq.id, item_type: 'invoice', item_name: d.item_name, amount_krw: actualAmt, is_vat_taxable: d.is_vat_taxable, sort_order: j * 2 + 1 })
          return rows
        })
        if (itemRows.length) await supabase.from('forwarding_quote_items').insert(itemRows)
      }
    }

    setSaving(false)
    router.push(`/transactions/${data.id}`)
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
              <Input type="number" step="0.0001" value={form.import_amount_usd} onChange={(e) => set('import_amount_usd', e.target.value)} />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">컨테이너</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => setContainers((p) => [...p, blankContainer()])}>
              <Plus className="h-4 w-4 mr-1" />행 추가
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {containers.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">컨테이너 정보가 없습니다. 행 추가 버튼을 눌러 추가하세요.</p>
            )}
            {containers.map((r) => (
              <div key={r._key} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
                <Field label="ETD">
                  <Input type="date" value={r.etd} onChange={(e) => setContainer(r._key, 'etd', e.target.value)} />
                </Field>
                <Field label="ETA">
                  <Input type="date" value={r.eta} onChange={(e) => setContainer(r._key, 'eta', e.target.value)} />
                </Field>
                <Field label="컨테이너 번호">
                  <Input value={r.container_no} onChange={(e) => setContainer(r._key, 'container_no', e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="MRKU1234567" className="font-mono" />
                </Field>
                <Field label="선사">
                  <Input value={r.carrier} onChange={(e) => setContainer(r._key, 'carrier', e.target.value)} placeholder="Maersk" />
                </Field>
                <Button type="button" variant="ghost" size="icon" className="text-destructive mb-0.5" onClick={() => setContainers((p) => p.filter((x) => x._key !== r._key))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">포워딩 견적</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => setForwardings((p) => [...p, blankForwarding()])}>
              <Plus className="h-4 w-4 mr-1" />견적 추가
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {forwardings.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">포워딩 견적이 없습니다. 견적 추가 버튼을 눌러 추가하세요.</p>
            )}
            {forwardings.map((r) => {
              const quoteTotal = r.details.reduce((s, d) => s + (parseInt(d.quote_amount_krw) || 0), 0)
              const actualTotal = r.details.reduce((s, d) => s + (parseInt(d.actual_amount_krw) || 0), 0)
              return (
                <div key={r._key} className="border rounded-md p-3 space-y-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Field label="포워더명">
                        <Input value={r.forwarder_name} onChange={(e) => setForwardingHeader(r._key, 'forwarder_name', e.target.value)} />
                      </Field>
                    </div>
                    <div className="w-36">
                      <Field label="견적일">
                        <Input type="date" value={r.quote_date} onChange={(e) => setForwardingHeader(r._key, 'quote_date', e.target.value)} />
                      </Field>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive mb-0.5" onClick={() => setForwardings((p) => p.filter((x) => x._key !== r._key))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left font-medium py-1 pr-2">항목명</th>
                        <th className="text-right font-medium py-1 px-2">견적금액 (원)</th>
                        <th className="text-right font-medium py-1 px-2">실청구금액 (원)</th>
                        <th className="text-center font-medium py-1 px-2 whitespace-nowrap">부가세</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {r.details.map((d) => (
                        <tr key={d._key} className="border-b border-dashed">
                          <td className="py-1 pr-2">
                            <Input
                              value={d.item_name}
                              onChange={(e) => setForwardingDetail(r._key, d._key, 'item_name', e.target.value)}
                              className="h-7 text-sm"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <Input
                              type="number"
                              value={d.quote_amount_krw}
                              onChange={(e) => setForwardingDetail(r._key, d._key, 'quote_amount_krw', e.target.value)}
                              className="h-7 text-sm text-right"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <Input
                              type="number"
                              value={d.actual_amount_krw}
                              onChange={(e) => setForwardingDetail(r._key, d._key, 'actual_amount_krw', e.target.value)}
                              className="h-7 text-sm text-right"
                            />
                          </td>
                          <td className="py-1 px-2 text-center">
                            <Checkbox
                              checked={d.is_vat_taxable}
                              onCheckedChange={(v) => setForwardingDetail(r._key, d._key, 'is_vat_taxable', !!v)}
                            />
                          </td>
                          <td className="py-1 pl-1">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeForwardingDetail(r._key, d._key)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="pt-2 text-muted-foreground text-xs">소계</td>
                        <td className="pt-2 px-2 text-right font-medium">{quoteTotal.toLocaleString()}</td>
                        <td className="pt-2 px-2 text-right font-medium">{actualTotal.toLocaleString()}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>

                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => addForwardingDetail(r._key)}>
                    <Plus className="h-3 w-3 mr-1" />항목 추가
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
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
