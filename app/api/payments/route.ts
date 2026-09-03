import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePaymentInput, InputError } from '@/lib/payments/input'

/**
 * 지급 한 건 등록.
 *
 * 지급 현황 화면에서는 배분 1건(해당 차수)만 실어 보내고,
 * 통장 원장 화면에서 묶음 지급을 넣을 때만 여러 건을 싣는다.
 * 배분이 비어 있으면 미배분 상태로 저장된다.
 */
export async function POST(req: NextRequest) {
  let input
  try {
    input = parsePaymentInput(await req.json())
  } catch (e) {
    if (e instanceof InputError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: '요청을 읽을 수 없습니다' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: payment, error: payErr } = await supabase
    .from('settlement_payments')
    .insert({
      paid_at: input.paidAt,
      direction: input.direction,
      amount_krw: input.amountKrw,
      bank_memo: input.bankMemo,
    })
    .select('id')
    .single()

  if (payErr || !payment) {
    return NextResponse.json({ error: payErr?.message ?? '저장하지 못했습니다' }, { status: 500 })
  }

  if (input.allocations.length > 0) {
    const { error: allocErr } = await supabase.from('payment_allocations').insert(
      input.allocations.map((a) => ({
        payment_id: payment.id,
        transaction_id: a.transactionId,
        kind: a.kind,
        amount_krw: a.amountKrw,
        confirmed: true,
      })),
    )
    // 배분이 실패했는데 이체만 남으면 원장에 유령 행이 생긴다. 되돌린다.
    if (allocErr) {
      await supabase.from('settlement_payments').delete().eq('id', payment.id)
      return NextResponse.json({ error: allocErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, id: payment.id })
}
