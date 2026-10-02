import test from 'node:test'
import assert from 'node:assert/strict'
import { noteStamp } from './noteMeta.ts'

test('계정과 한국 날짜를 짧게 보인다', () => {
  const meta = { notes: { by: 'toei_user', at: '2026-10-02T03:00:00+00:00' } }
  assert.equal(noteStamp(meta, 'notes', '2026-10-02'), '토에이 · 10-02')
})

test('한국 시간으로 날짜를 넘긴다 — UTC 15시는 한국 다음 날 0시', () => {
  const meta = { notes: { by: 'a1_admin', at: '2026-10-01T15:30:00Z' } }
  assert.equal(noteStamp(meta, 'notes', '2026-10-02'), '에이원 · 10-02')
})

test('올해가 아니면 연도를 붙인다', () => {
  const meta = { note: { by: 'a1_user', at: '2025-12-30T01:00:00Z' } }
  assert.equal(noteStamp(meta, 'note', '2026-10-02'), '에이원 · 25-12-30')
})

test('기록이 없거나 계정을 모르면 지어내지 않는다', () => {
  assert.equal(noteStamp({}, 'notes', '2026-10-02'), null)
  assert.equal(noteStamp(null, 'notes', '2026-10-02'), null)
  assert.equal(noteStamp({ notes: { by: null, at: '2026-10-02T01:00:00Z' } }, 'notes', '2026-10-02'), '10-02')
})
