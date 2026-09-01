'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { schema, toFormDefaults, toUpdatePayload, type FV, type InitData } from '@/lib/transactions/editSchema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/NumberInput'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusFields } from './StatusFields'
import { Plus, Trash2 } from 'lucide-react'

export default function TransactionEditForm({
  transactionId, manufacturers, initialData,
}: {
  transactionId: string
  manufacturers: { id: string; name: string }[]
  initialData: InitData
}) {
  const router = useRouter()
  const supabase = createClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deliveryDates, setDeliveryDates] = useState<Array<{_key: string; date: string}>>(
    (initialData.delivery_dates ?? []).map((d) => ({ _key: crypto.randomUUID(), date: d.date }))
  )
  const [deliveryDatesDirty, setDeliveryDatesDirty] = useState(false)

  function addDeliveryDate() {
    setDeliveryDates((p) => [...p, { _key: crypto.randomUUID(), date: '' }])
    setDeliveryDatesDirty(true)
  }
  function removeDeliveryDate(key: string) {
    setDeliveryDates((p) => p.filter((d) => d._key !== key))
    setDeliveryDatesDirty(true)
  }
  function updateDeliveryDate(key: string, date: string) {
    setDeliveryDates((p) => p.map((d) => d._key === key ? { ...d, date } : d))
    setDeliveryDatesDirty(true)
  }

  const { register, handleSubmit, watch, setValue, formState: { isDirty, isSubmitting, errors } } =
    useForm<FV>({ resolver: zodResolver(schema), defaultValues: toFormDefaults(initialData) })

  const [ls, lgs, ds] = watch(['lc_status', 'logistics_status', 'document_status'])

  /** 천단위 쉼표가 보이는 숫자 칸. RHF 에는 쉼표 없는 원시 문자열만 넣는다. */
  function numberField(name: 'import_amount_usd' | 'customs_exchange_rate' | 'margin_rate_pct') {
    return {
      value: watch(name),
      onValueChange: (v: string) => setValue(name, v, { shouldDirty: true }),
    }
  }

  async function onSubmit(v: FV) {
    setSubmitError(null)
    const { error } = await supabase.from('transactions')
      .update(toUpdatePayload(v, deliveryDates)).eq('id', transactionId)
    if (error) {
      setSubmitError(error.code === '23505'
        ? `차수 번호 ${v.round_no}은(는) 이미 다른 거래가 쓰고 있습니다.`
        : error.message)
      return
    }
    router.push(`/transactions/${transactionId}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <F label="제조사">
            <Select value={watch('manufacturer_id')} onValueChange={(v) => setValue('manufacturer_id', v ?? '', { shouldDirty: true })}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {manufacturers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
          <F label="차수 번호 *">
            <Input className="font-mono text-right" inputMode="numeric" {...register('round_no')} />
            {errors.round_no && <p className="text-xs text-destructive">{errors.round_no.message}</p>}
          </F>
          <div className="col-span-2">
            <F label="차수 라벨 *">
              <Input {...register('round_label')} />
              {errors.round_label && <p className="text-xs text-destructive">{errors.round_label.message}</p>}
            </F>
          </div>
          <F label="발주번호"><Input {...register('order_no')} /></F>
          <F label="수입금액 (USD)"><NumberInput className="font-mono text-right" {...numberField('import_amount_usd')} /></F>
          <F label="LC 번호"><Input {...register('lc_no')} /></F>
          <F label="LC 개설일"><Input type="date" {...register('lc_open_date')} /></F>
          <F label="A1 지불일"><Input type="date" {...register('a1_payment_date')} /></F>
          <F label="LC 만기일"><Input type="date" {...register('lc_expiry_date')} /></F>
          <F label="통관일"><Input type="date" {...register('customs_date')} /></F>
          <F label="통관환율 (원/$)"><NumberInput className="font-mono text-right" {...numberField('customs_exchange_rate')} /></F>
          <F label="마진율 (%)"><NumberInput className="font-mono text-right" {...numberField('margin_rate_pct')} /></F>
          <StatusFields
            values={{ lc_status: ls, logistics_status: lgs, document_status: ds }}
            onChange={(k, v) => setValue(k, v, { shouldDirty: true })}
          />
          <div className="col-span-2">
            <F label="메모"><Input {...register('notes')} /></F>
          </div>
          <div className="col-span-2 space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm">납기일</Label>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addDeliveryDate}>
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
                    onChange={(e) => updateDeliveryDate(d._key, e.target.value)}
                    placeholder="3월 22일"
                    className="h-8 text-sm"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeDeliveryDate(d._key)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      {submitError && <p className="text-sm text-destructive">{submitError}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
        <Button type="submit" disabled={isSubmitting || (!isDirty && !deliveryDatesDirty)}>
          {isSubmitting ? '저장 중...' : '저장'}
        </Button>
      </div>
    </form>
  )
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-sm">{label}</Label>{children}</div>
}
