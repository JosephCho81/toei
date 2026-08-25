// 실행: node --test lib/calculations/amountCheckSummary.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeAmountChecks } from './amountCheckSummary.ts'

const items = [{ unit_price_usd: 10, quantity: 100 }] // $1,000.00

test('금액이 일치하고 메모도 없으면 표시하지 않는다', () => {
  const s = summarizeAmountChecks(items, [{ label: '토에이', amount_usd: 1000, note: null }])
  assert.equal(s.level, 'none')
  assert.equal(s.entries.length, 0)
})

test('금액이 일치해도 사유 메모가 있으면 표시한다', () => {
  const s = summarizeAmountChecks(items, [{ label: '토에이', amount_usd: 1000, note: '수량 재확인함' }])
  assert.equal(s.level, 'note')
  assert.equal(s.entries.length, 1)
})

test('1 USD 이상 차액은 mismatch', () => {
  const s = summarizeAmountChecks(items, [{ label: '토에이', amount_usd: 1200, note: null }])
  assert.equal(s.level, 'mismatch')
  assert.equal(s.entries[0].diff.diffUsd, 200)
})

test('1 USD 미만 차액은 minor', () => {
  const s = summarizeAmountChecks(items, [{ label: '토에이', amount_usd: 1000.5, note: null }])
  assert.equal(s.level, 'minor')
})

test('금액 미입력 + 메모 없음은 표시하지 않는다', () => {
  const s = summarizeAmountChecks(items, [{ label: '토에이', amount_usd: null, note: null }])
  assert.equal(s.level, 'none')
})

test('여러 건이면 가장 심각한 단계를 쓴다', () => {
  const s = summarizeAmountChecks(items, [
    { label: 'A', amount_usd: 1000, note: '확인' },
    { label: 'B', amount_usd: 1500, note: null },
  ])
  assert.equal(s.level, 'mismatch')
  assert.equal(s.entries.length, 2)
})
