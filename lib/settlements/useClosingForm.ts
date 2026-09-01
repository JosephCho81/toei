'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RoundingPolicy, VatMode } from '@/lib/calculations/closing'
import { loadClosingForm, type ClosingCostRow, type ClosingFormData } from './closingLoad'
import { DEFAULT_LC_FEE_ROWS, type FeeRow } from '@/components/settlements/lcFeeDefaults'

const DEFAULT_COST_ROWS: ClosingCostRow[] = [
  { item_name: '통관보수료', amount_krw: '0', includes_vat: false },
  { item_name: '검역수수료', amount_krw: '0', includes_vat: false },
  { item_name: '운송추가운임', amount_krw: '0', includes_vat: true },
]

/**
 * 클로징정산 화면의 입력 상태.
 * 저장된 정산이 있으면 그 값으로, 없으면 기본값으로 시작한다 —
 * 확정된 과거 정산은 저장된 절사·부가세 방식을 그대로 유지해야 금액이 흔들리지 않는다.
 */
export function useClosingForm(transactionId: string) {
  const [supabase] = useState(createClient)
  const [loaded, setLoaded] = useState<ClosingFormData | null>(null)
  const [settlementId, setSettlementId] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  const [closingDate, setClosingDate] = useState('')
  const [bokRate, setBokRate] = useState('')
  // LC 결제비용은 달러가 입력 기준. 원화는 클로징환율로 환산해 저장한다.
  const [lcPaymentUsd, setLcPaymentUsd] = useState('')
  // 달러 없이 원화만 저장된 과거 정산은 저장값을 그대로 계산 기준으로 쓴다(환산 오차 방지).
  const [legacyLcPaymentKrw, setLegacyLcPaymentKrw] = useState<number | null>(null)
  // 결제액 일부를 다른 환율로 선지급한 건(1차 7,040$ 사례). 비어 있으면 총액을 클로징환율로 환산한다.
  const [advanceUsd, setAdvanceUsd] = useState('')
  const [advanceRate, setAdvanceRate] = useState('')
  // 초기엔 각 사 50% 였으나 이후 한국에이원 전액 부담으로 바뀌었다 (담당자 확인)
  const [fxBurdenA1Pct, setFxBurdenA1Pct] = useState(100)
  const [roundingPolicy, setRoundingPolicy] = useState<RoundingPolicy>('floor_100')
  // 확정된 과거 정산은 저장된 방식대로 계속 보여준다
  const [vatMode, setVatMode] = useState<VatMode>('exclusive')

  const [lcFeeRows, setLcFeeRows] = useState<FeeRow[]>(DEFAULT_LC_FEE_ROWS)
  const [closingCostRows, setClosingCostRows] = useState<ClosingCostRow[]>(DEFAULT_COST_ROWS)
  // null이면 시스템 계산값을 따라간다. 담당자가 직접 입력했거나 DB에 확정금액이 있을 때만 문자열.
  const [confirmedOverride, setConfirmedOverride] = useState<string | null>(null)
  const [notes, setNotes] = useState<string | null>(null)

  useEffect(() => {
    loadClosingForm(supabase, transactionId).then((data) => {
      setLoaded(data)
      const c = data.closing
      if (!c) return
      setSettlementId(c.id)
      setIsLocked(c.isLocked)
      setClosingDate(c.closingDate)
      setBokRate(c.bokRate)
      setLcPaymentUsd(c.lcPaymentUsd)
      setLegacyLcPaymentKrw(c.legacyLcPaymentKrw)
      setAdvanceUsd(c.advanceUsd)
      setAdvanceRate(c.advanceRate)
      setFxBurdenA1Pct(c.fxBurdenA1Pct)
      setRoundingPolicy(c.roundingPolicy as RoundingPolicy)
      setVatMode(c.vatMode)
      setConfirmedOverride(c.confirmedAmountKrw != null ? String(c.confirmedAmountKrw) : null)
      setNotes(c.notes)
      if (c.feeRows) setLcFeeRows(c.feeRows)
      if (c.costRows) setClosingCostRows(c.costRows)
    })
  }, [supabase, transactionId])

  const num = (v: string) => (v === '' ? null : (parseFloat(v) || 0))

  return {
    supabase, loaded, settlementId, setSettlementId, isLocked, setIsLocked,
    closingDate, setClosingDate, bokRate, setBokRate,
    lcPaymentUsd, setLcPaymentUsd, legacyLcPaymentKrw, setLegacyLcPaymentKrw,
    advanceUsd, setAdvanceUsd, advanceRate, setAdvanceRate,
    fxBurdenA1Pct, setFxBurdenA1Pct, roundingPolicy, setRoundingPolicy, vatMode,
    lcFeeRows, setLcFeeRows, closingCostRows, setClosingCostRows,
    confirmedOverride, setConfirmedOverride, notes, setNotes,
    bokRateNum: parseFloat(bokRate) || 0,
    lcPaymentUsdNum: num(lcPaymentUsd),
    advanceUsdNum: num(advanceUsd),
    advanceRateNum: num(advanceRate),
  }
}
