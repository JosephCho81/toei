import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 화면의 행 목록을 자식 테이블에 반영한다.
 *
 * id 가 있는 행은 update, 없는 행은 insert, 화면에서 사라진 행은 delete.
 * **행을 지웠다 다시 넣지 않는 것이 핵심** — id 가 바뀌면 감사 로그의 이력이 끊기고
 * 그 행을 참조하던 데이터도 함께 끊긴다.
 *
 * `parentColumn`/`parentId` 를 주면 그 부모에 속한 행만 대상으로 삼고 insert 시 자동으로 채운다.
 * 생략하면 테이블 전체가 대상이다(마스터 테이블).
 *
 * 실패한 문장의 메시지를 모아 돌려준다. 비어 있으면 전부 성공.
 */
export async function syncRows<T extends { id?: string }>(
  supabase: SupabaseClient,
  opts: {
    table: string
    parentColumn?: string
    parentId?: string
    rows: T[]
    toPayload: (row: T, index: number) => Record<string, unknown>
  },
): Promise<string[]> {
  const { table, parentColumn, parentId, rows, toPayload } = opts
  const errors: string[] = []
  const check = (err: { message: string } | null) => { if (err) errors.push(err.message) }

  const keptIds = new Set(rows.filter((r) => r.id).map((r) => r.id!))
  const query = supabase.from(table).select('id')
  const { data: dbRows } = parentColumn ? await query.eq(parentColumn, parentId) : await query
  const toDelete = (dbRows ?? []).map((r) => r.id).filter((id: string) => !keptIds.has(id))
  if (toDelete.length) {
    check((await supabase.from(table).delete().in('id', toDelete)).error)
  }

  const toInsert: Record<string, unknown>[] = []
  for (const [i, row] of rows.entries()) {
    const payload = toPayload(row, i)
    if (row.id) {
      check((await supabase.from(table).update(payload).eq('id', row.id)).error)
    } else {
      toInsert.push(parentColumn ? { ...payload, [parentColumn]: parentId } : payload)
    }
  }
  if (toInsert.length) {
    check((await supabase.from(table).insert(toInsert)).error)
  }

  return errors
}
