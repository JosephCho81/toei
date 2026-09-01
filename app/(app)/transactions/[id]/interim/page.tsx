'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { loadInterimForm, saveInterimSettlement, type InterimTx } from '@/lib/settlements/interimIo'
import { calculateInterim, computeVat, type RoundingPolicy, type CostItem, type VatMode } from '@/lib/calculations/interim'
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
  const [supabase] = useState(createClient)

  const [tx, setTx] = useState<InterimTx | null>(null)
  const [sid, setSid] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [customsRate, setCustomsRate] = useState('')
  const [roundingPolicy, setRoundingPolicy] = useState<RoundingPolicy>('floor_100')
  // 확정된 과거 정산은 저장된 방식대로 계속 보여준다 (로직 변경으로 금액이 조용히 바뀌면 안 된다)
  const [vatMode, setVatMode] = useState<VatMode>('exclusive')
  const [shippingRows, setShippingRows] = useState<CostRow[]>(DEFAULT_SHIPPING)
  const [customsRows, setCustomsRows] = useState<CostRow[]>(DEFAULT_CUSTOMS)
  const [prefilled, setPrefilled] = useState(false)
  // null이면 시스템 계산값을 그대로 따라간다. 확정 대상은 공급가다.
  const [supplyOverride, setSupplyOverride] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState<string | null>(null)

  useEffect(() => {
    loadInterimForm(supabase, id).then((d) => {
      setTx(d.tx)
      setSid(d.settlementId)
      setIsLocked(d.isLocked)
      setCustomsRate(d.customsRate)
      setRoundingPolicy(d.roundingPolicy as RoundingPolicy)
      setVatMode(d.vatMode)
      setSupplyOverride(d.storedSupply)
      setNotes(d.notes)
      setPrefilled(d.prefilled)
      if (d.shippingRows) setShippingRows(d.shippingRows)
      if (d.customsRows) setCustomsRows(d.customsRows)
    })
  }, [supabase, id])

  const costItems: CostItem[] = [...shippingRows, ...customsRows].map((r) => ({
    amountKrw: parseFloat(r.amount_krw) || 0,
    isImportVat: r.is_import_vat,
    isVatTaxable: r.is_vat_taxable,
    vatAmountKrw: parseFloat(r.vat_amount_krw) || 0,
  }))

  const calc = tx?.import_amount_usd && customsRate
    ? calculateInterim({
        importAmountUsd: Number(tx.import_amount_usd),
        customsExchangeRate: parseFloat(customsRate),
        marginRatePct: tx.margin_rate_pct ?? 0,
        costItems, roundingPolicy, vatMode,
      })
    : null
  const systemSupply = calc?.supplyAmountKrw ?? 0
  const supply = supplyOverride ?? (systemSupply > 0 ? String(systemSupply) : '')
  const supplyNum = parseFloat(supply) || systemSupply
  const confirmedVat = vatMode === 'exclusive' ? computeVat(supplyNum) : 0
  const confirmedTotal = supplyNum + confirmedVat

  async function handleSave(lock = false) {
    setSaving(true)
    try {
      const newId = await saveInterimSettlement(supabase, {
        settlementId: sid,
        payload: {
          transaction_id: id,
          customs_exchange_rate: parseFloat(customsRate),
          rounding_policy: roundingPolicy,
          vat_mode: vatMode,
          supply_amount_krw: vatMode === 'exclusive' ? supplyNum : null,
          vat_amount_krw: vatMode === 'exclusive' ? confirmedVat : null,
          confirmed_amount_krw: confirmedTotal,
          is_locked: lock,
        },
        shippingRows,
        customsRows,
      })
      setSid(newId)
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
      <ShippingCostItems rows={shippingRows} onChange={setShippingRows} isLocked={isLocked} vatMode={vatMode}
        hint={prefilled ? '포워딩 견적 실청구액에서 자동 입력됐습니다. 수정 가능합니다.' : undefined} />
      <CustomsCostItems rows={customsRows} onChange={setCustomsRows} isLocked={isLocked} vatMode={vatMode} />
      <InterimResultsCard
        calc={calc} systemSupply={systemSupply} roundingPolicy={roundingPolicy}
        onRoundingChange={setRoundingPolicy} supplyAmount={supply}
        onSupplyChange={setSupplyOverride} isLocked={isLocked}
        confirmedVat={confirmedVat} confirmedTotal={confirmedTotal}
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
