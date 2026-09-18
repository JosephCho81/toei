import test from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import { saveSettlementInOrder, toError } from './saveInOrder.ts'

/**
 * DB 의 항목 RPC 처럼 잠긴 행이면 항목 저장을 거부하는 가짜 클라이언트.
 * 호출 순서를 `log` 에 남긴다.
 */
function fakeDb(initial: { id: string; is_locked: boolean } | null) {
  const log: string[] = []
  let row = initial ? { ...initial } : null
  const client = {
    from: () => ({
      update: (fields: Record<string, unknown>) => ({
        eq: async () => {
          log.push(`update ${JSON.stringify(fields)}`)
          row = { ...row!, ...fields } as typeof row
          return { error: null }
        },
      }),
      insert: (fields: Record<string, unknown>) => ({
        select: () => ({
          single: async () => {
            log.push(`insert ${JSON.stringify(fields)}`)
            row = { id: 'new-id', is_locked: Boolean(fields.is_locked) }
            return { data: { id: 'new-id' }, error: null }
          },
        }),
      }),
    }),
  } as unknown as SupabaseClient
  const saveItems = async () => {
    log.push('items')
    if (row?.is_locked) {
      throw toError({ code: 'P0001', message: '확정·잠금된 중간정산은 수정할 수 없습니다.' })
    }
  }
  return { client, log, saveItems, row: () => row }
}

const args = (settlementId: string | null, is_locked: boolean) => ({
  table: 'interim_settlements' as const,
  settlementId,
  payload: { confirmed_amount_krw: 1000, is_locked },
  missingIdMessage: 'ID 없음',
})

test('확정 저장 — 항목을 먼저 넣고 잠금은 마지막에 건다 (2026-09-18 직원 제보 회귀)', async () => {
  const db = fakeDb({ id: 's1', is_locked: false })
  const sid = await saveSettlementInOrder(db.client, { ...args('s1', true), saveItems: db.saveItems })
  assert.equal(sid, 's1')
  assert.deepEqual(db.log, [
    'update {"confirmed_amount_krw":1000}',
    'items',
    'update {"is_locked":true}',
  ])
  assert.equal(db.row()?.is_locked, true)
})

test('신규 확정 — 잠기지 않은 채로 넣고 항목 뒤에 잠근다', async () => {
  const db = fakeDb(null)
  const sid = await saveSettlementInOrder(db.client, { ...args(null, true), saveItems: db.saveItems })
  assert.equal(sid, 'new-id')
  assert.deepEqual(db.log, [
    'insert {"confirmed_amount_krw":1000,"is_locked":false}',
    'items',
    'update {"is_locked":true}',
  ])
})

test('일반 저장은 잠금을 건드리지 않는다', async () => {
  const db = fakeDb({ id: 's1', is_locked: false })
  await saveSettlementInOrder(db.client, { ...args('s1', false), saveItems: db.saveItems })
  assert.deepEqual(db.log, ['update {"confirmed_amount_krw":1000}', 'items'])
})

test('항목 저장이 실패하면 잠그지 않는다 — 다시 저장할 수 있어야 한다', async () => {
  const db = fakeDb({ id: 's1', is_locked: false })
  const failing = async () => { throw toError({ message: 'RPC 실패' }) }
  await assert.rejects(
    saveSettlementInOrder(db.client, { ...args('s1', true), saveItems: failing }),
    { message: 'RPC 실패' },
  )
  assert.equal(db.row()?.is_locked, false)
})

test('Supabase 오류 객체를 「[object Object]」가 아닌 메시지로 바꾼다', () => {
  assert.equal(toError({ code: 'P0001', message: '잠긴 정산' }).message, '잠긴 정산')
  const e = new Error('그대로')
  assert.equal(toError(e), e)
})
