'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calculateInterim, computeVat, applyRounding, type RoundingPolicy, type CostItem } from '@/lib/calculations/interim'
import { formatKrw } from '@/lib/utils/format'
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

interface CostRow {
  id?: string
  item_name: string
  amount_krw: string
  is_vat_taxable: boolean
  vat_amount_krw: string
}

export default function InterimSettlementPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [transaction, setTransaction] = useState<{
    import_amount_usd: number | null
    customs_exchange_rate: number | null
  } | null>(null)
  const [settlementId, setSettlementId] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [customsRate, setCustomsRate] = useState('')
  const [roundingPolicy, setRoundingPolicy] = useState<RoundingPolicy>('floor_100')
  const [costRows, setCostRows] = useState<CostRow[]>([
    { item_name: '운송비', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' },
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
      if (t?.customs_exchange_rate) setCustomsRate(String(t.customs_exchange_rate))

      const { data: interim } = await supabase
        .from('interim_settlements')
        .select('*')
        .eq('transaction_id', id)
        .single()

      if (interim) {
        setSettlementId(interim.id)
        setIsLocked(interim.is_locked)
        setCustomsRate(String(interim.customs_exchange_rate))
        setRoundingPolicy(interim.rounding_policy as RoundingPolicy)
        setConfirmedAmount(String(interim.confirmed_amount_krw ?? ''))

        const { data: items } = await supabase
          .from('interim_cost_items')
          .select('*')
          .eq('interim_settlement_id', interim.id)
          .order('sort_order')
        if (items?.length) {
          setCostRows(items.map((item) => ({
            id: item.id,
            item_name: item.item_name,
            amount_krw: String(item.amount_krw),
            is_vat_taxable: item.is_vat_taxable,
            vat_amount_krw: String(item.vat_amount_krw),
          })))
        }
      }
    }
    load()
  }, [id])

  const parsedItems: CostItem[] = costRows.map((r) => ({
    amountKrw: parseFloat(r.amount_krw) || 0,
    isVatTaxable: r.is_vat_taxable,
    vatAmountKrw: r.is_vat_taxable
      ? computeVat(parseFloat(r.amount_krw) || 0)
      : (parseFloat(r.vat_amount_krw) || 0),
  }))

  const calc = transaction?.import_amount_usd && customsRate
    ? calculateInterim({
        importAmountUsd: Number(transaction.import_amount_usd),
        customsExchangeRate: parseFloat(customsRate),
        costItems: parsedItems,
        roundingPolicy,
        vatIncludedInTotal: true,
      })
    : null

  const systemAmount = calc?.roundedTotalKrw ?? 0

  useEffect(() => {
    if (systemAmount > 0 && !confirmedAmount) {
      setConfirmedAmount(String(systemAmount))
    }
  }, [systemAmount])

  function addRow() {
    setCostRows((prev) => [...prev, { item_name: '', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0' }])
  }

  function updateRow(index: number, field: keyof CostRow, value: string | boolean) {
    setCostRows((prev) => prev.map((r, i) => {
      if (i !== index) return r
      const updated = { ...r, [field]: value }
      if (field === 'amount_krw' && updated.is_vat_taxable) {
        updated.vat_amount_krw = String(computeVat(parseFloat(String(value)) || 0))
      }
      if (field === 'is_vat_taxable') {
        updated.vat_amount_krw = value
          ? String(computeVat(parseFloat(r.amount_krw) || 0))
          : '0'
      }
      return updated
    }))
  }

  function removeRow(index: number) {
    setCostRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave(lock = false) {
    setSaving(true)
    const upsertData = {
      transaction_id: id,
      customs_exchange_rate: parseFloat(customsRate),
      rounding_policy: roundingPolicy,
      system_amount_krw: systemAmount,
      confirmed_amount_krw: parseFloat(confirmedAmount) || systemAmount,
      is_locked: lock,
    }

    let sid = settlementId
    if (sid) {
      await supabase.from('interim_settlements').update(upsertData).eq('id', sid)
    } else {
      const { data } = await supabase.from('interim_settlements').insert(upsertData).select('id').single()
      sid = data?.id ?? null
      setSettlementId(sid)
    }

    if (sid) {
      await supabase.from('interim_cost_items').delete().eq('interim_settlement_id', sid)
      await supabase.from('interim_cost_items').insert(
        costRows.map((r, i) => ({
          interim_settlement_id: sid!,
          item_name: r.item_name,
          amount_krw: parseFloat(r.amount_krw) || 0,
          is_vat_taxable: r.is_vat_taxable,
          vat_amount_krw: parseFloat(r.vat_amount_krw) || 0,
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
        <h2 className="text-2xl font-bold">중간정산</h2>
        {isLocked && <Badge variant="outline">🔒 확정</Badge>}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="space-y-1">
              <Label>수입금액 (USD)</Label>
              <Input
                value={transaction.import_amount_usd ? String(transaction.import_amount_usd) : '-'}
                readOnly className="bg-muted font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label>통관환율 (원/$)</Label>
              <Input
                type="number"
                step="0.0001"
                value={customsRate}
                onChange={(e) => setCustomsRate(e.target.value)}
                disabled={isLocked}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label>원화 환산</Label>
              <Input
                value={calc ? formatKrw(calc.importAmountKrw) : '-'}
                readOnly className="bg-muted font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">비용 항목</CardTitle>
          {!isLocked && (
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" />항목 추가
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
              <span className="col-span-4">항목명</span>
              <span className="col-span-3">금액(원)</span>
              <span className="col-span-2 text-center">부가세</span>
              <span className="col-span-2">부가세(원)</span>
              <span className="col-span-1"></span>
            </div>
            {costRows.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-4 text-sm"
                  value={row.item_name}
                  onChange={(e) => updateRow(i, 'item_name', e.target.value)}
                  disabled={isLocked}
                  placeholder="항목명"
                />
                <Input
                  className="col-span-3 text-sm font-mono"
                  type="number"
                  value={row.amount_krw}
                  onChange={(e) => updateRow(i, 'amount_krw', e.target.value)}
                  disabled={isLocked}
                />
                <div className="col-span-2 flex justify-center">
                  <input
                    type="checkbox"
                    checked={row.is_vat_taxable}
                    onChange={(e) => updateRow(i, 'is_vat_taxable', e.target.checked)}
                    disabled={isLocked}
                    className="h-4 w-4"
                  />
                </div>
                <Input
                  className="col-span-2 text-sm font-mono"
                  type="number"
                  value={row.is_vat_taxable
                    ? computeVat(parseFloat(row.amount_krw) || 0)
                    : (parseFloat(row.vat_amount_krw) || 0)}
                  readOnly={row.is_vat_taxable}
                  onChange={(e) => updateRow(i, 'vat_amount_krw', e.target.value)}
                  disabled={isLocked}
                />
                {!isLocked && (
                  <Button
                    variant="ghost" size="icon" className="col-span-1 h-8 w-8"
                    onClick={() => removeRow(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">계산 결과</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {calc && (
            <div className="space-y-1 text-sm">
              <CalcRow label="수입금액 (원화)" value={formatKrw(calc.importAmountKrw)} />
              <CalcRow label="총 비용 (부가세 제외)" value={formatKrw(calc.totalCostKrw)} />
              <CalcRow label="부가세 합계" value={formatKrw(calc.vatAmountKrw)} />
              <Separator />
              <CalcRow label="합계 (부가세 포함)" value={formatKrw(calc.totalWithVatKrw)} bold />
            </div>
          )}

          <div className="flex items-center gap-4 mt-4">
            <div className="space-y-1">
              <Label className="text-sm">절사 정책</Label>
              <Select value={roundingPolicy} onValueChange={(v) => setRoundingPolicy(v as RoundingPolicy)} disabled={isLocked}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="floor_100">100원 단위</SelectItem>
                  <SelectItem value="floor_10">10원 단위</SelectItem>
                  <SelectItem value="none">절사 없음</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {calc && (
              <div className="space-y-1">
                <Label className="text-sm">시스템 계산값</Label>
                <p className="text-lg font-mono font-bold">{formatKrw(systemAmount)}</p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>확정 금액 (원)</Label>
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
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            저장
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            확정 및 잠금
          </Button>
          <Button variant="ghost" onClick={() => router.push(`/transactions/${id}`)}>
            취소
          </Button>
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
