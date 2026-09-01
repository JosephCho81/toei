import type { SupabaseClient } from '@supabase/supabase-js'
import { advanceExceedsTotal, advanceRateMissing, feeRateMissing, type LcPaymentInput } from '@/lib/calculations/closing'
import type { FeeRow } from '@/components/settlements/lcFeeDefaults'
import type { ClosingCostRow } from './closingLoad'

/**
 * 저장 전 검증. 값이 0원으로 굳어 정산금액이 통째로 틀어지는 입력을 막는다.
 * 통과하면 null, 막을 이유가 있으면 사용자에게 보여줄 메시지를 돌려준다.
 */
export function validateClosingInput(input: {
  lcPayment: LcPaymentInput
  bokRate: number
  legacyLcPaymentKrw: number | null
  feeRows: FeeRow[]
}): string | null {
  const { lcPayment, bokRate, legacyLcPaymentKrw, feeRows } = input
  const needsRate = lcPayment.totalUsd != null
    || feeRows.some((r) => r.currency === 'USD' && parseFloat(r.amount_usd) && !r.use_custom_rate)
  if (needsRate && bokRate <= 0 && legacyLcPaymentKrw == null) {
    return '달러 금액을 원화로 환산하려면 한국은행 고시 환율을 먼저 입력하세요.'
  }
  const missingRateRow = feeRows.find(feeRateMissing)
  if (missingRateRow) {
    return `'${missingRateRow.item_name || 'LC 수수료'}' 항목에 별도 환율을 입력하세요.`
  }
  if (advanceRateMissing(lcPayment)) return '선지급금에 적용할 환율을 입력하세요.'
  if (advanceExceedsTotal(lcPayment)) return '선지급금이 LC 결제비용 총액보다 클 수 없습니다.'
  return null
}

export interface ClosingSavePayload {
  transaction_id: string
  closing_date: string
  bok_exchange_rate: number | null
  lc_payment_total_usd: number | null
  lc_payment_total_krw: number | null
  advance_payment_usd: number | null
  advance_exchange_rate: number | null
  fx_burden_a1_pct: number
  rounding_policy: string
  vat_mode: string
  supply_amount_krw: number | null
  vat_amount_krw: number | null
  confirmed_amount_krw: number
  is_locked: boolean
}

/** 정산 본문 + LC수수료·기타비용 항목을 저장하고 정산 id 를 돌려준다. */
export async function saveClosingSettlement(
  supabase: SupabaseClient,
  args: {
    settlementId: string | null
    payload: ClosingSavePayload
    feeRows: FeeRow[]
    feeAmountKrw: (row: FeeRow) => number
    costRows: ClosingCostRow[]
  },
): Promise<string> {
  let sid = args.settlementId
  if (sid) {
    const { error } = await supabase.from('closing_settlements').update(args.payload).eq('id', sid)
    if (error) throw error
  } else {
    const { data, error } = await supabase
      .from('closing_settlements').insert(args.payload).select('id').single()
    if (error) throw error
    sid = data?.id ?? null
  }
  if (!sid) throw new Error('클로징정산 ID를 확인할 수 없습니다.')

  const { error: itemsError } = await supabase.rpc('save_closing_items', {
    p_closing_settlement_id: sid,
    p_lc_fees: args.feeRows.map((r, i) => ({
      item_name: r.item_name,
      amount_krw: args.feeAmountKrw(r),
      currency: r.currency,
      amount_usd: r.currency === 'USD' ? (parseFloat(r.amount_usd) || 0) : null,
      exchange_rate: r.currency === 'USD' && r.use_custom_rate ? (parseFloat(r.exchange_rate) || null) : null,
      sort_order: i,
    })),
    p_costs: args.costRows.map((r, i) => ({
      item_name: r.item_name,
      amount_krw: parseFloat(r.amount_krw) || 0,
      includes_vat: r.includes_vat,
      sort_order: i,
    })),
  })
  if (itemsError) throw itemsError
  return sid
}
