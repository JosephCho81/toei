import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 정산 행 → 항목 → 잠금, 이 순서로 저장한다. 중간·최종정산이 같이 쓴다.
 *
 * 잠금을 행과 함께 먼저 걸면 항목 RPC(`save_interim_cost_items`·`save_closing_items`)가
 * 「확정·잠금된 정산은 수정할 수 없습니다」로 거부한다. 그러면 금액과 잠금만 남고
 * 항목 수정분은 버려진 채 화면에는 오류만 뜬다 — 새로고침하면 저장된 것처럼 보여
 * 항목이 빠진 줄 아무도 모른다(직원 제보 2026-09-18). 잠금은 항목까지 들어간 뒤 마지막에 건다.
 * 중간에 실패하면 잠기지 않은 채 남으므로 다시 저장하면 된다.
 */
export async function saveSettlementInOrder<P extends { is_locked: boolean }>(
  supabase: SupabaseClient,
  args: {
    table: 'interim_settlements' | 'closing_settlements'
    settlementId: string | null
    payload: P
    saveItems: (settlementId: string) => Promise<void>
    missingIdMessage: string
  },
): Promise<string> {
  const { is_locked: lock, ...rest } = args.payload
  const fields: Record<string, unknown> = rest
  let sid = args.settlementId
  if (sid) {
    const { error } = await supabase.from(args.table).update(fields).eq('id', sid)
    if (error) throw toError(error)
  } else {
    const { data, error } = await supabase
      .from(args.table).insert({ ...fields, is_locked: false }).select('id').single()
    if (error) throw toError(error)
    sid = (data as { id: string } | null)?.id ?? null
  }
  if (!sid) throw new Error(args.missingIdMessage)

  await args.saveItems(sid)

  if (lock) {
    const { error } = await supabase.from(args.table).update({ is_locked: true }).eq('id', sid)
    if (error) throw toError(error)
  }
  return sid
}

/**
 * Supabase 오류는 Error 가 아니라 `{ message, code, … }` 객체다. 그대로 던지면 화면이
 * `String(e)` 로 「[object Object]」를 띄운다 — 무엇이 실패했는지 알 수 없다.
 */
export function toError(e: unknown): Error {
  if (e instanceof Error) return e
  const m = (e as { message?: unknown } | null)?.message
  return new Error(typeof m === 'string' && m !== '' ? m : String(e))
}
