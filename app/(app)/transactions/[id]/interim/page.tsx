'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calculateInterim, type RoundingPolicy, type CostItem } from '@/lib/calculations/interim'
import { formatKrw } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShippingCostItems, type CostRow, DEFAULT_SHIPPING } from '@/components/settlements/ShippingCostItems'
import { CustomsCostItems, DEFAULT_CUSTOMS } from '@/components/settlements/CustomsCostItems'
import { InterimResultsCard } from '@/components/settlements/InterimResultsCard'

function toRow(item: Record<string, unknown>): CostRow {
  return {
    id: item.id as string,
    item_name: String(item.item_name ?? ''),
    amount_krw: String(item.amount_krw ?? ''),
    is_vat_taxable: Boolean(item.is_vat_taxable),
    vat_amount_krw: String(item.vat_amount_krw ?? '0'),
  }
}

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
  const [confirmed, setConfirmed] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from('transactions').select('import_amount_usd,customs_exchange_rate,margin_rate_pct').eq('id', id).single()
      setTx(t)
      if (t?.customs_exchange_rate) setCustomsRate(String(t.customs_exchange_rate))

      const { data: interim } = await supabase.from('interim_settlements').select('*').eq('transaction_id', id).single()
      let hasShippingItems = false
      if (interim) {
        setSid(interim.id); setIsLocked(interim.is_locked)
        setCustomsRate(String(interim.customs_exchange_rate))
        setRoundingPolicy(interim.rounding_policy as RoundingPolicy)
        setConfirmed(String(interim.confirmed_amount_krw ?? ''))

        const { data: items } = await supabase.from('interim_cost_items').select('*').eq('interim_settlement_id', interim.id).order('sort_order')
        if (items?.length) {
          const ship = items.filter((i) => (i as Record<string, unknown>).group_type === 'shipping').map(toRow)
          const cust = items.filter((i) => (i as Record<string, unknown>).group_type !== 'shipping').map(toRow)
          if (ship.length) { setShippingRows(ship); hasShippingItems = true }
          if (cust.length) setCustomsRows(cust)
        }
      }

      if (!hasShippingItems) {
        const { data: fqList } = await supabase.from('forwarding_quotes').select('actual_amount_krw,notes').eq('transaction_id', id).order('sort_order')
        const fq = (fqList ?? []).find((q: { actual_amount_krw: number | null; notes: string | null }) => q.actual_amount_krw)
        if (fq?.actual_amount_krw) {
          let rows: CostRow[] = []
          if (fq.notes) {
            try {
              const parsed = fq.notes.split('|').map((entry: string) => {
                const colonIdx = entry.indexOf(':')
                const itemName = entry.slice(0, colonIdx)
                const amounts = entry.slice(colonIdx + 1).split('/')
                const actual = amounts[1] ?? amounts[0]
                return { item_name: itemName, amount_krw: String(parseInt(actual) || 0), is_vat_taxable: false, vat_amount_krw: '0' } as CostRow
              }).filter((r: CostRow) => r.item_name)
              if (parsed.length) rows = parsed
            } catch { /* notes 파싱 실패 시 단일 항목으로 폴백 */ }
          }
          if (!rows.length) {
            rows = [{ item_name: '해상운임', amount_krw: String(fq.actual_amount_krw), is_vat_taxable: false, vat_amount_krw: '0' }]
          }
          setShippingRows(rows)
          setPrefilled(true)
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

  useEffect(() => { if (systemAmount > 0 && !confirmed) setConfirmed(String(systemAmount)) }, [systemAmount])

  async function handleSave(lock = false) {
    setSaving(true)
    const payload = {
      transaction_id: id, customs_exchange_rate: parseFloat(customsRate), rounding_policy: roundingPolicy,
      system_amount_krw: systemAmount, confirmed_amount_krw: parseFloat(confirmed) || systemAmount, is_locked: lock,
    }
    let id2 = sid
    if (id2) { await supabase.from('interim_settlements').update(payload).eq('id', id2) }
    else {
      const { data } = await supabase.from('interim_settlements').insert(payload).select('id').single()
      id2 = data?.id ?? null; setSid(id2)
    }
    if (id2) {
      await supabase.from('interim_cost_items').delete().eq('interim_settlement_id', id2)
      const mkRow = (r: CostRow, i: number, grp: string) => ({
        interim_settlement_id: id2!, item_name: r.item_name, group_type: grp,
        amount_krw: parseFloat(r.amount_krw) || 0, is_vat_taxable: r.is_vat_taxable,
        vat_amount_krw: parseFloat(r.vat_amount_krw) || 0, sort_order: i,
      })
      await supabase.from('interim_cost_items').insert([
        ...shippingRows.map((r, i) => mkRow(r, i, 'shipping')),
        ...customsRows.map((r, i) => mkRow(r, shippingRows.length + i, 'customs')),
      ])
    }
    setSaving(false)
    if (lock) { setIsLocked(true); router.push(`/transactions/${id}`) }
  }

  const shippingSubtotal = shippingRows.reduce((s, r) => s + (parseFloat(r.amount_krw) || 0), 0)
  const customsSubtotal = customsRows.reduce((s, r) => s + (parseFloat(r.amount_krw) || 0), 0)

  if (!tx) return <p className="p-6 text-muted-foreground">로딩 중...</p>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">중간정산</h2>
        {isLocked && <Badge variant="outline">🔒 확정</Badge>}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>수입금액 (USD)</Label>
            <Input value={tx.import_amount_usd ? String(tx.import_amount_usd) : '-'} readOnly className="bg-muted font-mono" />
          </div>
          <div className="space-y-1">
            <Label>통관환율 (원/$)</Label>
            <Input type="number" step="0.0001" value={customsRate} onChange={(e) => setCustomsRate(e.target.value)} disabled={isLocked} className="font-mono" />
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
        onConfirmedChange={setConfirmed} isLocked={isLocked}
        shippingSubtotal={shippingSubtotal} customsSubtotal={customsSubtotal}
      />
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
