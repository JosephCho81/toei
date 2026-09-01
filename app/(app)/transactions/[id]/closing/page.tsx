'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { calculateClosing, calcLcPaymentKrw, feeExchangeRate } from '@/lib/calculations/closing'
import { usdToKrw } from '@/lib/calculations/helpers'
import { useClosingForm } from '@/lib/settlements/useClosingForm'
import { saveClosingSettlement, validateClosingInput } from '@/lib/settlements/closingSave'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MemoField } from '@/components/ui/MemoField'
import { ClosingFxCard } from '@/components/settlements/ClosingFxCard'
import { ClosingLcFeeCard } from '@/components/settlements/ClosingLcFeeCard'
import { ClosingCostCard } from '@/components/settlements/ClosingCostCard'
import { ClosingSummaryCard } from '@/components/settlements/ClosingSummaryCard'
import { ClosingBasicInfoCard } from '@/components/settlements/ClosingBasicInfoCard'
import {
  InterimSummaryCard, CustomsDetailCard, ForwardingDetailCard,
} from '@/components/settlements/ClosingDetailCards'
import { UnlockButton } from '@/components/settlements/UnlockButton'
import { DeleteSettlementButton } from '@/components/settlements/DeleteSettlementButton'
import type { FeeRow } from '@/components/settlements/lcFeeDefaults'

export default function ClosingSettlementPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const f = useClosingForm(id)
  const {
    supabase, loaded, settlementId, isLocked, lcFeeRows, closingCostRows,
    legacyLcPaymentKrw, bokRateNum, lcPaymentUsdNum, advanceUsdNum, advanceRateNum,
    fxBurdenA1Pct, roundingPolicy, vatMode,
  } = f

  const transaction = loaded?.transaction ?? null
  const lcPayment = { totalUsd: lcPaymentUsdNum, advanceUsd: advanceUsdNum, advanceRate: advanceRateNum }
  // 달러를 새로 입력했으면 환산값, 과거 정산이면 저장된 원화를 그대로 쓴다
  const lcPaymentKrw = legacyLcPaymentKrw ?? calcLcPaymentKrw(lcPayment, bokRateNum)

  /** LC 수수료 1행의 원화 금액 (달러 항목은 별도 환율 또는 클로징환율로 반올림 환산) */
  function feeAmountKrw(r: FeeRow): number {
    return r.currency === 'USD'
      ? usdToKrw(parseFloat(r.amount_usd) || 0, feeExchangeRate(r, bokRateNum))
      : (parseFloat(r.amount_krw) || 0)
  }

  const calc = transaction?.import_amount_usd && transaction?.customs_exchange_rate && lcPaymentKrw
    ? calculateClosing({
        lcPaymentTotalKrw: lcPaymentKrw,
        importAmountUsd: Number(transaction.import_amount_usd),
        customsExchangeRate: Number(transaction.customs_exchange_rate),
        lcFeeItems: lcFeeRows.map((r) => ({ amountKrw: feeAmountKrw(r) })),
        fxBurdenA1Pct,
        closingCostItems: closingCostRows.map((r) => ({ amountKrw: parseFloat(r.amount_krw) || 0 })),
        roundingPolicy,
        interimConfirmedKrw: loaded?.interim?.confirmed_amount_krw ?? 0,
        vatMode,
      })
    : null

  const systemAmount = calc?.roundedFinalKrw ?? 0
  const confirmedAmount = f.confirmedOverride ?? (systemAmount !== 0 ? String(systemAmount) : '')

  async function handleSave(lock = false) {
    const problem = validateClosingInput({
      lcPayment, bokRate: bokRateNum, legacyLcPaymentKrw, feeRows: lcFeeRows,
    })
    if (problem) { toast.error(problem); return }

    setSaving(true)
    try {
      const sid = await saveClosingSettlement(supabase, {
        settlementId,
        payload: {
          transaction_id: id,
          closing_date: f.closingDate,
          bok_exchange_rate: bokRateNum || null,
          lc_payment_total_usd: lcPaymentUsdNum,
          lc_payment_total_krw: lcPaymentKrw || null,
          advance_payment_usd: advanceUsdNum,
          advance_exchange_rate: advanceUsdNum ? advanceRateNum : null,
          fx_burden_a1_pct: fxBurdenA1Pct,
          rounding_policy: roundingPolicy,
          vat_mode: vatMode,
          supply_amount_krw: vatMode === 'exclusive' ? (calc?.supplyAmountKrw ?? null) : null,
          vat_amount_krw: vatMode === 'exclusive' ? (calc?.vatKrw ?? null) : null,
          confirmed_amount_krw: parseFloat(confirmedAmount) || systemAmount,
          is_locked: lock,
        },
        feeRows: lcFeeRows,
        feeAmountKrw,
        costRows: closingCostRows,
      })
      f.setSettlementId(sid)
      toast.success(lock ? '확정 및 잠금 완료' : '저장 완료')
      if (lock) { f.setIsLocked(true); router.push(`/transactions/${id}`) }
    } catch (e) {
      toast.error(`저장 실패: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  if (!loaded || !transaction) return <p className="p-6 text-muted-foreground">로딩 중...</p>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">클로징정산</h2>
        <div className="flex items-center gap-2">
          {isLocked && <Badge variant="outline">🔒 확정</Badge>}
          {isLocked && settlementId && (
            <UnlockButton
              table="closing_settlements" settlementId={settlementId}
              onUnlocked={() => f.setIsLocked(false)}
            />
          )}
          {settlementId && (
            <DeleteSettlementButton
              table="closing_settlements" settlementId={settlementId} isLocked={isLocked}
              onDeleted={() => router.push(`/transactions/${id}`)}
            />
          )}
        </div>
      </div>

      <InterimSummaryCard interim={loaded.interim} />

      <ClosingBasicInfoCard
        closingDate={f.closingDate} onClosingDateChange={f.setClosingDate}
        bokRate={f.bokRate} onBokRateChange={f.setBokRate}
        lcPaymentUsd={f.lcPaymentUsd}
        onLcPaymentUsdChange={(v) => { f.setLcPaymentUsd(v); f.setLegacyLcPaymentKrw(null) }}
        advanceUsd={f.advanceUsd} onAdvanceUsdChange={f.setAdvanceUsd}
        advanceRate={f.advanceRate} onAdvanceRateChange={f.setAdvanceRate}
        lcPayment={lcPayment} lcPaymentKrw={lcPaymentKrw} bokRateNum={bokRateNum}
        legacyLcPaymentKrw={legacyLcPaymentKrw}
        lcNo={transaction.lc_no} containerLcNumbers={loaded.containerLcNumbers}
        isLocked={isLocked}
      />

      <ClosingFxCard
        calc={calc}
        customsExchangeRate={Number(transaction.customs_exchange_rate)}
        lcPaymentKrw={lcPaymentKrw}
        lcPaymentUsd={legacyLcPaymentKrw != null ? null : lcPaymentUsdNum}
        bokRate={bokRateNum}
        advanceUsd={legacyLcPaymentKrw != null ? null : advanceUsdNum}
        advanceRate={advanceRateNum}
      />

      <ClosingLcFeeCard
        lcFeeRows={lcFeeRows} onLcFeeChange={f.setLcFeeRows} isLocked={isLocked} calc={calc}
        fxBurdenA1Pct={fxBurdenA1Pct} onFxBurdenChange={f.setFxBurdenA1Pct} bokRate={bokRateNum}
      />

      <ClosingCostCard
        closingCostRows={closingCostRows} onCostChange={f.setClosingCostRows}
        isLocked={isLocked} calc={calc}
      />

      <ClosingSummaryCard
        calc={calc} roundingPolicy={roundingPolicy} onRoundingChange={f.setRoundingPolicy}
        confirmedAmount={confirmedAmount} onConfirmedChange={f.setConfirmedOverride}
        isLocked={isLocked} interimIsLocked={loaded.interim?.is_locked ?? false}
      />

      <CustomsDetailCard items={loaded.customsDetailItems} />
      <ForwardingDetailCard rows={loaded.forwardingQuotes} />

      {settlementId && (
        <Card>
          <CardHeader><CardTitle className="text-base">메모</CardTitle></CardHeader>
          <CardContent>
            <MemoField
              notes={f.notes}
              disabled={isLocked}
              onSave={async (newNotes) => {
                const { error } = await supabase
                  .from('closing_settlements').update({ notes: newNotes }).eq('id', settlementId)
                if (error) throw error
                f.setNotes(newNotes)
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
