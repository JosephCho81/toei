import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 지체상금 한 건 등록·삭제.
 *
 * 산식이 없다 — 담당자가 적은 금액이 곧 청구액이다(037 참고).
 * 그래서 검증은 화면이 아니라 여기서 결정적으로 한다:
 * 금액·차수·사유가 없으면 저장하지 않는다. 0원은 행이 없는 것과 같아 거부한다.
 */

class InputError extends Error {}

function parse(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>

  const transactionId = String(b.transactionId ?? '').trim()
  if (!transactionId) throw new InputError('차수를 골라 주세요')

  const incurredOn = String(b.incurredOn ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(incurredOn)) throw new InputError('발생일을 YYYY-MM-DD 로 넣어 주세요')

  const reason = String(b.reason ?? '').trim()
  if (!reason) throw new InputError('사유를 적어 주세요 — 산식이 없는 동안 이것이 유일한 근거입니다')

  // 쉼표를 걷어낸다. 화면이 「5,666,612」로 보여주므로 그대로 오는 일이 잦다.
  const raw = String(b.amountKrw ?? '').replace(/,/g, '').trim()
  const amountKrw = Number(raw)
  if (!raw || !Number.isFinite(amountKrw)) throw new InputError('금액을 숫자로 넣어 주세요')
  if (!Number.isInteger(amountKrw)) throw new InputError('금액은 원 단위 정수여야 합니다')
  if (amountKrw === 0) throw new InputError('0원은 넣을 수 없습니다')

  const dueRaw = String(b.dueDate ?? '').trim()
  if (dueRaw && !/^\d{4}-\d{2}-\d{2}$/.test(dueRaw)) throw new InputError('기일을 YYYY-MM-DD 로 넣어 주세요')

  const note = String(b.note ?? '').trim()

  return {
    transaction_id: transactionId,
    incurred_on: incurredOn,
    reason,
    amount_krw: amountKrw,
    due_date: dueRaw || null,
    note: note || null,
  }
}

export async function POST(req: NextRequest) {
  let row
  try {
    row = parse(await req.json())
  } catch (e) {
    if (e instanceof InputError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: '요청을 읽을 수 없습니다' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('settlement_penalties')
    .insert(row)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data?.id })
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: '삭제할 항목을 찾을 수 없습니다' }, { status: 400 })

  const supabase = await createClient()

  // 지급이 배분된 차수의 지체상금을 지우면 원장에 근거 없는 배분이 남는다.
  // 막지 않고 알린다 — 만들 수 있으면 지울 수도 있어야 한다.
  const { error } = await supabase.from('settlement_penalties').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
