'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { fetchTransactionBase, fetchInterimSettlement, fetchInterimCostItems } from '@/lib/data/queries'
import { toCostRow } from '@/lib/utils/costRows'
import { calculateInterim, type RoundingPolicy, type CostItem } from '@/lib/calculations/interim'
import { formatKrw, formatUsd } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/NumberInput'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShippingCostItems, type CostRow, DEFAULT_SHIPPING } from '@/components/settlements/ShippingCostItems'
import { CustomsCostItems, DEFAULT_CUSTOMS } from '@/components/settlements/CustomsCostItems'
import { InterimResultsCard } from '@/components/settlements/InterimResultsCard'
import { MemoField } from '@/components/ui/MemoField'
import { UnlockButton } from '@/components/settlements/UnlockButton'
import { DeleteSettlementButton } from '@/components/settlements/DeleteSettlementButton'


export default function InterimSettlementPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [tx, setTx] = useState<{ import_amount_usd: number | null; customs_exchange_rate: number | null; margin_rate_pct: number | null } | null>(null)
  const [sid, setSid] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [customsRate, setCustomsRate] = useState('')
  const [roundingPolicy, setRoundingPolicy] = useState<RoundingPolicy>('floor_100')
  const [shippingRows, setShippingRows] = useState<CostRow[]>(DEFAULT_SHIPPING)
  const [customsRows, setCustomsRows] = useState<CostRow[]>(DEFAULT_CUSTOMS)
  const [prefilled, setPrefilled] = useState(false)
  // null이면 시스템 계산값을 그대로 따라간다. 담당자가 직접 입력했거나 DB에 저장된 확정금액이 있을 때만 문자열.
  const [confirmedOverride, setConfirmedOverride] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const t = await fetchTransactionBase(supabase, id)
      setTx(t)
      if (t?.customs_exchange_rate) setCustomsRate(String(t.customs_exchange_rate))

      const interim = await fetchInterimSettlement(supabase, id)
      let hasShippingItems = false
      if (interim) {
        setSid(interim.id); setIsLocked(interim.is_locked)
        setCustomsRate(String(interim.customs_exchange_rate))
        setRoundingPolicy(interim.rounding_policy as RoundingPolicy)
        setConfirmedOverride(interim.confirmed_amount_krw != null ? String(interim.confirmed_amount_krw) : null)
        setNotes(interim.notes ?? null)

        const items = await fetchInterimCostItems(supabase, interim.id)
        if (items?.length) {
          const ship = items.filter((i) => (i as Record<string, unknown>).group_type === 'shipping').map(toCostRow)
          const cust = items.filter((i) => (i as Record<string, unknown>).group_type !== 'shipping').map(toCostRow)
          if (ship.length) { setShippingRows(ship); hasShippingItems = true }
          if (cust.length) setCustomsRows(cust)
        }
      }

      if (!hasShippingItems) {
        const { data: fqList } = await supabase
          .from('forwarding_quotes')
          .select('id,forwarding_quote_items(item_name,amount_krw,vat_amount_krw,is_vat_taxable,sort_order,item_type)')
          .eq('transaction_id', id)
          .order('sort_order')
        type InvoiceItem = { item_name: string | null; amount_krw: number | null; vat_amount_krw: number | null; is_vat_taxable: boolean | null; sort_order: number | null; item_type: string }
        const firstFq = (fqList ?? []).find(fq =>
          (fq.forwarding_quote_items as InvoiceItem[]).some(i => i.item_type === 'invoice')
        )
        if (firstFq) {
          const invoiceItems = (firstFq.forwarding_quote_items as InvoiceItem[])
            .filter(i => i.item_type === 'invoice')
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          if (invoiceItems.length) {
            setShippingRows(invoiceItems.map(item => ({
              item_name: item.item_name ?? '',
              amount_krw: String(item.amount_krw ?? '0'),
              is_vat_taxable: item.is_vat_taxable ?? false,
              vat_amount_krw: String(item.vat_amount_krw ?? '0'),
            })))
            setPrefilled(true)
          }
        }
      }
    }
    load()
  }, [id])

  const costItems: CostItem[] = [...shippingRows, ...customsRows].map((r) => ({
    amountKrw: parseFloat(r.amount_krw) || 0,
  }))

  const calc = tx?.import_amount_usd && customsRate
    ? calculateInterim({ importAmountUsd: Number(tx.import_amount_usd), customsExchangeRate: parseFloat(customsRate), marginRatePct: tx.margin_rate_pct ?? 0, costItems, roundingPolicy })
    : null
  const systemAmount = calc?.confirmedKrw ?? 0
  const confirmed = confirmedOverride ?? (systemAmount > 0 ? String(systemAmount) : '')

  async function handleSave(lock = false) {
    setSaving(true)
    try {
      const payload = {
        transaction_id: id, customs_exchange_rate: parseFloat(customsRate), rounding_policy: roundingPolicy,
        confirmed_amount_krw: parseFloat(confirmed) || systemAmount, is_locked: lock,
      }
      let id2 = sid
      if (id2) {
        const { error } = await supabase.from('interim_settlements').update(payload).eq('id', id2)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('interim_settlements').insert(payload).select('id').single()
        if (error) throw error
        id2 = data?.id ?? null; setSid(id2)
      }
      if (!id2) throw new Error('중간정산 ID를 확인할 수 없습니다.')

      const mkItem = (r: CostRow, i: number, grp: string) => ({
        item_name: r.item_name, group_type: grp,
        amount_krw: parseFloat(r.amount_krw) || 0, is_vat_taxable: r.is_vat_taxable,
        vat_amount_krw: parseFloat(r.vat_amount_krw) || 0, sort_order: i,
      })
      const { error: itemsError } = await supabase.rpc('save_interim_cost_items', {
        p_interim_settlement_id: id2,
        p_items: [
          ...shippingRows.map((r, i) => mkItem(r, i, 'shipping')),
          ...customsRows.map((r, i) => mkItem(r, shippingRows.length + i, 'customs')),
        ],
      })
      if (itemsError) throw itemsError

      toast.success(lock ? '확정 및 잠금 완료' : '저장 완료')
      if (lock) { setIsLocked(true); router.push(`/transactions/${id}`) }
    } catch (e) {
      toast.error(`저장 실패: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  const shippingSubtotal = shippingRows.reduce((s, r) => s + (parseFloat(r.amount_krw) || 0), 0)
  const customsSubtotal = customsRows.reduce((s, r) => s + (parseFloat(r.amount_krw) || 0), 0)

  if (!tx) return <p className="p-6 text-muted-foreground">로딩 중...</p>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">중간정산</h2>
        <div className="flex items-center gap-2">
          {isLocked && <Badge variant="outline">🔒 확정</Badge>}
          {isLocked && sid && <UnlockButton table="interim_settlements" settlementId={sid} onUnlocked={() => setIsLocked(false)} />}
          {sid && (
            <DeleteSettlementButton
              table="interim_settlements" settlementId={sid} isLocked={isLocked}
              onDeleted={() => router.push(`/transactions/${id}`)}
            />
          )}
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>수입금액 (USD)</Label>
            <Input value={tx.import_amount_usd ? formatUsd(Number(tx.import_amount_usd)) : '-'} readOnly className="bg-muted font-mono text-right" />
          </div>
          <div className="space-y-1">
            <Label>통관환율 (원/$)</Label>
            <NumberInput value={customsRate} onValueChange={setCustomsRate} disabled={isLocked} className="font-mono text-right" />
          </div>
          <div className="space-y-1">
            <Label>원화 환산</Label>
            <Input value={calc ? formatKrw(calc.importAmountKrw) : '-'} readOnly className="bg-muted font-mono" />
          </div>
        </CardContent>
      </Card>
      <ShippingCostItems rows={shippingRows} onChange={setShippingRows} isLocked={isLocked}
        hint={prefilled ? '포워딩 견적 실청구액에서 자동 입력됐습니다. 수정 가능합니다.' : undefined} />
      <CustomsCostItems rows={customsRows} onChange={setCustomsRows} isLocked={isLocked} />
      <InterimResultsCard
        calc={calc} systemAmount={systemAmount} roundingPolicy={roundingPolicy}
        onRoundingChange={setRoundingPolicy} confirmedAmount={confirmed}
        onConfirmedChange={setConfirmedOverride} isLocked={isLocked}
        shippingSubtotal={shippingSubtotal} customsSubtotal={customsSubtotal}
      />
      {sid && (
        <Card>
          <CardHeader><CardTitle className="text-base">메모</CardTitle></CardHeader>
          <CardContent>
            <MemoField
              notes={notes}
              disabled={isLocked}
              onSave={async (newNotes) => {
                const { error } = await supabase.from('interim_settlements').update({ notes: newNotes }).eq('id', sid)
                if (error) throw error
                setNotes(newNotes)
              }}
            />
          </CardContent>
        </Card>
      )}
      {!isLocked && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>저장</Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>확정 및 잠금</Button>
          <Button variant="ghost" onClick={() => router.push(`/transactions/${id}`)}>취소</Button>
        </div>
      )}
    </div>
  )
}
