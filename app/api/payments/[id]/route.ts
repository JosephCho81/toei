import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseDate, parseAmount, parseMemo, parseUuid, InputError } from '@/lib/payments/input'

/**
 * 회차 한 건 수정 / 삭제.
 *
 * 지급 현황 화면에서는 배분이 하나뿐인 이체만 고칠 수 있다.
 * 여러 차수에 걸친 이체는 금액을 바꾸면 배분을 다시 나눠야 하므로
 * 통장 원장 화면으로 보낸다 — 여기서 임의로 비율을 정하면 안 된다.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params

  let id: string, paidAt: string, amountKrw: number, bankMemo: string | null
  try {
    id = parseUuid(rawId, '지급 ID')
    const b = (await req.json()) as Record<string, unknown>
    paidAt = parseDate(b.paidAt, '지급일')
    amountKrw = parseAmount(b.amountKrw)
    bankMemo = parseMemo(b.bankMemo)
  } catch (e) {
    if (e instanceof InputError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: '요청을 읽을 수 없습니다' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: current } = await supabase
    .from('settlement_payments').select('amount_krw').eq('id', id).maybeSingle()
  if (!current) return NextResponse.json({ error: '없는 지급 기록입니다' }, { status: 404 })

  const { data: allocs, error: readErr } = await supabase
    .from('payment_allocations')
    .select('id')
    .eq('payment_id', id)

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  if (allocs && allocs.length > 1) {
    return NextResponse.json(
      { error: '여러 차수에 배분된 이체입니다. 통장 원장에서 수정하세요' },
      { status: 409 },
    )
  }

  const updatePayment = () => supabase.from('settlement_payments')
    .update({ paid_at: paidAt, amount_krw: amountKrw, bank_memo: bankMemo }).eq('id', id)
  const alloc = allocs?.[0]
  const updateAlloc = alloc
    ? () => supabase.from('payment_allocations')
        .update({ amount_krw: amountKrw, confirmed: true }).eq('id', alloc.id)
    : null

  // 두 행은 각각 커밋되므로 순서가 중요하다. 금액을 키울 때 배분을 먼저 올리면
  // 「배분 합계 > 이체 금액」에 걸리고, 줄일 때 이체를 먼저 내리면 그 반대에 걸린다.
  const growing = amountKrw > Number(current.amount_krw)
  const steps = growing ? [updatePayment, updateAlloc] : [updateAlloc, updatePayment]

  for (const step of steps) {
    if (!step) continue
    const { error } = await step()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  let id: string
  try {
    id = parseUuid(rawId, '지급 ID')
  } catch (e) {
    if (e instanceof InputError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: '요청을 읽을 수 없습니다' }, { status: 400 })
  }

  const supabase = await createClient()
  // payment_allocations 는 ON DELETE CASCADE 로 함께 지워진다.
  const { error } = await supabase.from('settlement_payments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
