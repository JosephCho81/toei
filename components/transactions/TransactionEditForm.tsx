'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusFields } from './StatusFields'

const schema = z.object({
  round_label: z.string().min(1, '필수'),
  order_no: z.string(), import_amount_usd: z.string(),
  lc_no: z.string(), lc_open_date: z.string(),
  a1_payment_date: z.string(), lc_expiry_date: z.string(),
  customs_date: z.string(), customs_exchange_rate: z.string(),
  margin_rate_pct: z.string(),
  lc_status: z.string(), logistics_status: z.string(), document_status: z.string(),
  notes: z.string(),
})
type FV = z.infer<typeof schema>

interface InitData {
  round_label: string; order_no: string | null
  import_amount_usd: string | number | null; lc_no: string | null
  lc_open_date: string | null; a1_payment_date: string | null
  lc_expiry_date: string | null; customs_date: string | null
  customs_exchange_rate: string | number | null; margin_rate_pct: string | number | null
  lc_status: string | null; logistics_status: string | null; document_status: string | null
  notes: string | null
}

function s(v: unknown): string { return v == null ? '' : String(v) }

export default function TransactionEditForm({
  transactionId, manufacturerName, initialData,
}: {
  transactionId: string
  manufacturerName: string | null
  initialData: InitData
}) {
  const router = useRouter()
  const supabase = createClient()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const defaults: FV = {
    round_label: initialData.round_label,
    order_no: initialData.order_no ?? '',
    import_amount_usd: s(initialData.import_amount_usd),
    lc_no: initialData.lc_no ?? '',
    lc_open_date: initialData.lc_open_date ?? '',
    a1_payment_date: initialData.a1_payment_date ?? '',
    lc_expiry_date: initialData.lc_expiry_date ?? '',
    customs_date: initialData.customs_date ?? '',
    customs_exchange_rate: s(initialData.customs_exchange_rate),
    margin_rate_pct: s(initialData.margin_rate_pct),
    lc_status: initialData.lc_status ?? '',
    logistics_status: initialData.logistics_status ?? '',
    document_status: initialData.document_status ?? '',
    notes: initialData.notes ?? '',
  }

  const { register, handleSubmit, watch, setValue, formState: { isDirty, isSubmitting, errors } } =
    useForm<FV>({ resolver: zodResolver(schema), defaultValues: defaults })

  const [ls, lgs, ds] = watch(['lc_status', 'logistics_status', 'document_status'])

  async function onSubmit(v: FV) {
    setSubmitError(null)
    const { error } = await supabase.from('transactions').update({
      round_label: v.round_label,
      order_no: v.order_no || null,
      import_amount_usd: v.import_amount_usd ? parseFloat(v.import_amount_usd) : null,
      lc_no: v.lc_no || null,
      lc_open_date: v.lc_open_date || null,
      a1_payment_date: v.a1_payment_date || null,
      lc_expiry_date: v.lc_expiry_date || null,
      customs_date: v.customs_date || null,
      customs_exchange_rate: v.customs_exchange_rate ? parseFloat(v.customs_exchange_rate) : null,
      margin_rate_pct: v.margin_rate_pct ? parseFloat(v.margin_rate_pct) : null,
      lc_status: v.lc_status || null,
      logistics_status: v.logistics_status || null,
      document_status: v.document_status || null,
      notes: v.notes || null,
    }).eq('id', transactionId)
    if (error) { setSubmitError(error.message); return }
    router.push(`/transactions/${transactionId}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <F label="제조사 (변경 불가)">
            <div className="h-9 px-3 py-2 text-sm border rounded-md bg-muted">{manufacturerName ?? '-'}</div>
          </F>
          <F label="차수 라벨 *">
            <Input {...register('round_label')} />
            {errors.round_label && <p className="text-xs text-destructive">{errors.round_label.message}</p>}
          </F>
          <F label="발주번호"><Input {...register('order_no')} /></F>
          <F label="수입금액 (USD)"><Input type="number" step="0.0001" {...register('import_amount_usd')} /></F>
          <F label="LC 번호"><Input {...register('lc_no')} /></F>
          <F label="LC 개설일"><Input type="date" {...register('lc_open_date')} /></F>
          <F label="A1 지불일"><Input type="date" {...register('a1_payment_date')} /></F>
          <F label="LC 만기일"><Input type="date" {...register('lc_expiry_date')} /></F>
          <F label="통관일"><Input type="date" {...register('customs_date')} /></F>
          <F label="통관환율 (원/$)"><Input type="number" step="0.0001" {...register('customs_exchange_rate')} /></F>
          <F label="마진율 (%)"><Input type="number" step="0.01" {...register('margin_rate_pct')} /></F>
          <StatusFields
            values={{ lc_status: ls, logistics_status: lgs, document_status: ds }}
            onChange={(k, v) => setValue(k, v, { shouldDirty: true })}
          />
          <div className="col-span-2">
            <F label="메모"><Input {...register('notes')} /></F>
          </div>
        </CardContent>
      </Card>
      {submitError && <p className="text-sm text-destructive">{submitError}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? '저장 중...' : '저장'}
        </Button>
      </div>
    </form>
  )
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-sm">{label}</Label>{children}</div>
}
