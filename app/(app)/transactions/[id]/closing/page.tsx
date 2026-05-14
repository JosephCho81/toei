'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calculateClosing, type RoundingPolicy } from '@/lib/calculations/closing'
import { formatKrw, formatDate } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'

interface FeeRow {
  id?: string
  item_name: string
  amount_krw: string
}

interface CostRow {
  id?: string
  item_name: string
  amount_krw: string
  includes_vat: boolean
}

export default function ClosingSettlementPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [transaction, setTransaction] = useState<{
    import_amount_usd: number | null
    customs_exchange_rate: number | null
  } | null>(null)
  const [settlementId, setSettlementId] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  const [closingDate, setClosingDate] = useState('')
  const [bokRate, setBokRate] = useState('')
  const [bokLoading, setBokLoading] = useState(false)
  const [lcPayment, setLcPayment] = useState('')
  const [fxBurdenA1Pct, setFxBurdenA1Pct] = useState(50)
  const [roundingPolicy, setRoundingPolicy] = useState<RoundingPolicy>('floor_100')

  const [lcFeeRows, setLcFeeRows] = useState<FeeRow[]>([
    { item_name: '개설', amount_krw: '' },
    { item_name: '기한연장', amount_krw: '0' },
    { item_name: '조건변경', amount_krw: '0' },
    { item_name: '인수', amount_krw: '' },
    { item_name: '기타', amount_krw: '0' },
    { item_name: '환급', amount_krw: '0' },
  ])
  const [closingCostRows, setClosingCostRows] = useState<CostRow[]>([
    { item_name: '통관보수료', amount_krw: '0', includes_vat: false },
    { item_name: '검역수수료', amount_krw: '0', includes_vat: false },
    { item_name: '운송추가운임', amount_krw: '0', includes_vat: true },
  ])
  const [confirmedAmount, setConfirmedAmount] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase
        .from('transactions')
        .select('import_amount_usd,customs_exchange_rate')
        .eq('id', id)
        .single()
      setTransaction(t)

      const { data: closing } = await supabase
        .from('closing_settlements')
        .select('*')
        .eq('transaction_id', id)
        .single()

      if (closing) {
        setSettlementId(closing.id)
        setIsLocked(closing.is_locked)
        setClosingDate(closing.closing_date ?? '')
        setBokRate(String(closing.bok_exchange_rate ?? ''))
        setLcPayment(String(closing.lc_payment_total_krw ?? ''))
        setFxBurdenA1Pct(closing.fx_burden_a1_pct ?? 50)
        setRoundingPolicy(closing.rounding_policy as RoundingPolicy)
        setConfirmedAmount(String(closing.confirmed_amount_krw ?? ''))

        const { data: fees } = await supabase
          .from('lc_fee_items')
          .select('*')
          .eq('closing_settlement_id', closing.id)
          .order('sort_order')
        if (fees?.length) {
          setLcFeeRows(fees.map((f) => ({ id: f.id, item_name: f.item_name, amount_krw: String(f.amount_krw) })))
        }

        const { data: costs } = await supabase
          .from('closing_cost_items')
          .select('*')
          .eq('closing_settlement_id', closing.id)
          .order('sort_order')
        if (costs?.length) {
          setClosingCostRows(costs.map((c) => ({ id: c.id, item_name: c.item_name, amount_krw: String(c.amount_krw), includes_vat: c.includes_vat })))
        }
      }
    }
    load()
  }, [id])

  async function fetchBokRate() {
    if (!closingDate) return
    setBokLoading(true)
    const dateStr = closingDate.replace(/-/g, '')
    const res = await fetch(`/api/exchange-rate?date=${dateStr}`)
    const data = await res.json()
    if (data.rate) setBokRate(String(data.rate))
    setBokLoading(false)
  }

  const calc = transaction?.import_amount_usd && transaction?.customs_exchange_rate && lcPayment
    ? calculateClosing({
        lcPaymentTotalKrw: parseFloat(lcPayment),
        importAmountUsd: Number(transaction.import_amount_usd),
        customsExchangeRate: Number(transaction.customs_exchange_rate),
        lcFeeItems: lcFeeRows.map((r) => ({ amountKrw: parseFloat(r.amount_krw) || 0 })),
        fxBurdenA1Pct,
        closingCostItems: closingCostRows.map((r) => ({
          amountKrw: parseFloat(r.amount_krw) || 0,
          includesVat: r.includes_vat,
        })),
        roundingPolicy,
      })
    : null

  const systemAmount = calc?.roundedFinalKrw ?? 0

  useEffect(() => {
    if (systemAmount !== 0 && !confirmedAmount) {
      setConfirmedAmount(String(systemAmount))
    }
  }, [systemAmount])

  async function handleSave(lock = false) {
    setSaving(true)
    const upsertData = {
      transaction_id: id,
      closing_date: closingDate,
      bok_exchange_rate: parseFloat(bokRate) || null,
      lc_payment_total_krw: parseFloat(lcPayment) || null,
      fx_burden_a1_pct: fxBurdenA1Pct,
      rounding_policy: roundingPolicy,
      system_amount_krw: systemAmount,
      confirmed_amount_krw: parseFloat(confirmedAmount) || systemAmount,
      is_locked: lock,
    }

    let sid = settlementId
    if (sid) {
      await supabase.from('closing_settlements').update(upsertData).eq('id', sid)
    } else {
      const { data } = await supabase.from('closing_settlements').insert(upsertData).select('id').single()
      sid = data?.id ?? null
      setSettlementId(sid)
    }

    if (sid) {
      await supabase.from('lc_fee_items').delete().eq('closing_settlement_id', sid)
      await supabase.from('lc_fee_items').insert(
        lcFeeRows.map((r, i) => ({
          closing_settlement_id: sid!,
          item_name: r.item_name,
          amount_krw: parseFloat(r.amount_krw) || 0,
          sort_order: i,
        }))
      )

      await supabase.from('closing_cost_items').delete().eq('closing_settlement_id', sid)
      await supabase.from('closing_cost_items').insert(
        closingCostRows.map((r, i) => ({
          closing_settlement_id: sid!,
          item_name: r.item_name,
          amount_krw: parseFloat(r.amount_krw) || 0,
          includes_vat: r.includes_vat,
          sort_order: i,
        }))
      )
    }

    setSaving(false)
    if (lock) {
      setIsLocked(true)
      router.push(`/transactions/${id}`)
    }
  }

  if (!transaction) return <p className="p-6 text-muted-foreground">로딩 중...</p>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">클로징정산</h2>
        {isLocked && <Badge variant="outline">🔒 확정</Badge>}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">클로징 기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>클로징일</Label>
            <Input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} disabled={isLocked} />
          </div>
          <div className="space-y-1">
            <Label>한국은행 고시 환율 (원/$)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.0001"
                value={bokRate}
                onChange={(e) => setBokRate(e.target.value)}
                disabled={isLocked}
                className="font-mono"
              />
              {!isLocked && (
                <Button size="sm" variant="outline" onClick={fetchBokRate} disabled={bokLoading || !closingDate}>
                  {bokLoading ? '조회중' : '자동조회'}
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label>LC 결제비용 (원)</Label>
            <Input
              type="number"
              value={lcPayment}
              onChange={(e) => setLcPayment(e.target.value)}
              disabled={isLocked}
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {calc && (
        <Card>
          <CardHeader><CardTitle className="text-base">환차손익</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <CalcRow label={`원금×통관환율 (${Number(transaction.customs_exchange_rate).toLocaleString('ko-KR')}원/$)`} value={formatKrw(calc.importAmountKrw)} />
            <CalcRow label="LC 결제비용" value={formatKrw(parseFloat(lcPayment) || 0)} />
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>환차손익</span>
              <span className={`font-mono ${calc.fxGainLossKrw >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {calc.fxGainLossKrw >= 0 ? '+' : ''}{formatKrw(calc.fxGainLossKrw)}
                <span className="text-xs ml-1">{calc.fxGainLossKrw >= 0 ? '(환차익)' : '(환차손)'}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">LC 수수료</CardTitle>
          {!isLocked && (
            <Button size="sm" variant="outline" onClick={() => setLcFeeRows((p) => [...p, { item_name: '', amount_krw: '0' }])}>
              <Plus className="h-4 w-4 mr-1" />항목 추가
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {lcFeeRows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                className="flex-1 text-sm"
                value={row.item_name}
                onChange={(e) => setLcFeeRows((p) => p.map((r, j) => j === i ? { ...r, item_name: e.target.value } : r))}
                disabled={isLocked}
              />
              <Input
                className="w-36 font-mono text-sm"
                type="number"
                value={row.amount_krw}
                onChange={(e) => setLcFeeRows((p) => p.map((r, j) => j === i ? { ...r, amount_krw: e.target.value } : r))}
                disabled={isLocked}
              />
              {!isLocked && i >= 6 && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLcFeeRows((p) => p.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          {calc && (
            <div className="flex justify-between pt-2 text-sm font-semibold">
              <span>LC 수수료 합계</span>
              <span className="font-mono">{formatKrw(calc.lcFeeTotalKrw)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">환차손익 분담 비율</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>에이원 {fxBurdenA1Pct}%</span>
            <span>토에이 {100 - fxBurdenA1Pct}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={fxBurdenA1Pct}
            onChange={(e) => setFxBurdenA1Pct(parseInt(e.target.value))}
            disabled={isLocked}
            className="w-full"
          />
          {calc && (
            <div className="space-y-1 text-sm">
              <CalcRow label="추가비용 합계" value={`${calc.additionalCostKrw >= 0 ? '+' : ''}${formatKrw(calc.additionalCostKrw)}`} />
              <CalcRow label="에이원 부담분" value={`${calc.a1BurdenKrw >= 0 ? '+' : ''}${formatKrw(calc.a1BurdenKrw)}`} />
              <CalcRow label="에이원 부담분 + VAT" value={`${calc.a1BurdenWithVatKrw >= 0 ? '+' : ''}${formatKrw(calc.a1BurdenWithVatKrw)}`} bold />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">클로징 추가비용 (A+B+C)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {closingCostRows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-sm w-6 text-muted-foreground">{String.fromCharCode(65 + i)})</span>
              <Input
                className="flex-1 text-sm"
                value={row.item_name}
                onChange={(e) => setClosingCostRows((p) => p.map((r, j) => j === i ? { ...r, item_name: e.target.value } : r))}
                disabled={isLocked}
              />
              <Input
                className="w-36 font-mono text-sm"
                type="number"
                value={row.amount_krw}
                onChange={(e) => setClosingCostRows((p) => p.map((r, j) => j === i ? { ...r, amount_krw: e.target.value } : r))}
                disabled={isLocked}
              />
              <label className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <input
                  type="checkbox"
                  checked={row.includes_vat}
                  onChange={(e) => setClosingCostRows((p) => p.map((r, j) => j === i ? { ...r, includes_vat: e.target.checked } : r))}
                  disabled={isLocked}
                />
                VAT포함
              </label>
            </div>
          ))}
          {calc && (
            <div className="flex justify-between pt-2 text-sm font-semibold">
              <span>소계</span>
              <span className="font-mono">{formatKrw(calc.closingCostsTotalKrw)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">최종 정산액</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <Label>절사 정책</Label>
              <Select value={roundingPolicy} onValueChange={(v) => setRoundingPolicy(v as RoundingPolicy)} disabled={isLocked}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="floor_100">100원 단위</SelectItem>
                  <SelectItem value="floor_10">10원 단위</SelectItem>
                  <SelectItem value="none">절사 없음</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {calc && (
              <div className="space-y-1">
                <Label>시스템 계산값</Label>
                <p className={`text-xl font-mono font-bold ${calc.roundedFinalKrw >= 0 ? '' : 'text-red-600'}`}>
                  {calc.roundedFinalKrw >= 0 ? '' : ''}{formatKrw(calc.roundedFinalKrw)}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label>확정 금액 (원) — 음수: 토에이→에이원 환급</Label>
            <Input
              type="number"
              value={confirmedAmount}
              onChange={(e) => setConfirmedAmount(e.target.value)}
              disabled={isLocked}
              className="font-mono text-lg max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

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

function CalcRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}
