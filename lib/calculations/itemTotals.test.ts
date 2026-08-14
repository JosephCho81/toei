// 실행: node --test lib/calculations/itemTotals.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { itemsTotalUsd, itemSubtotalUsd, compareAmount } from './itemTotals.ts'

test('소계는 단가 × 수량', () => {
  assert.equal(itemSubtotalUsd({ unit_price_usd: 12.34, quantity: 100 }), 1234)
  assert.equal(itemSubtotalUsd({ unit_price_usd: '12.34', quantity: '100' }), 1234)
})

test('빈 값·비정상 입력은 0으로 처리', () => {
  assert.equal(itemSubtotalUsd({ unit_price_usd: null, quantity: 100 }), 0)
  assert.equal(itemSubtotalUsd({ unit_price_usd: 12.34, quantity: null }), 0)
  assert.equal(itemSubtotalUsd({ unit_price_usd: '', quantity: '' }), 0)
  assert.equal(itemSubtotalUsd({ unit_price_usd: 'abc', quantity: '10' }), 0)
})

test('합계는 부동소수 오차 없이 누적된다', () => {
  // 0.1 * 3 을 실수로 더하면 0.30000000000000004 가 되는 케이스
  const total = itemsTotalUsd([
    { unit_price_usd: 0.1, quantity: 1 },
    { unit_price_usd: 0.1, quantity: 1 },
    { unit_price_usd: 0.1, quantity: 1 },
  ])
  assert.equal(total, 0.3)
})

test('소수점 4자리 단가도 정확히 합산', () => {
  const total = itemsTotalUsd([
    { unit_price_usd: 1.2345, quantity: 3 },
    { unit_price_usd: 2.7655, quantity: 1 },
  ])
  assert.equal(total, 6.4690)
})

test('입력금액이 없으면 empty', () => {
  assert.equal(compareAmount(1000, null).status, 'empty')
  assert.equal(compareAmount(1000, '').status, 'empty')
  assert.equal(compareAmount(1000, undefined).status, 'empty')
})

test('동일 금액은 match, 미세 오차는 match', () => {
  assert.equal(compareAmount(1000, 1000).status, 'match')
  assert.equal(compareAmount(1000, 1000.001).status, 'match')
})

test('1달러 미만 차이는 minor, 이상은 mismatch', () => {
  assert.equal(compareAmount(1000, 1000.5).status, 'minor')
  assert.equal(compareAmount(1000, 1001).status, 'mismatch')
  assert.equal(compareAmount(1000, 900).status, 'mismatch')
})

test('차액 부호와 비율', () => {
  const over = compareAmount(1000, 1100)
  assert.equal(over.diffUsd, 100)
  assert.equal(over.diffPct, 10)

  const under = compareAmount(1000, 900)
  assert.equal(under.diffUsd, -100)
  assert.equal(under.diffPct, -10)
})

test('품목합계 0이면 비율은 null', () => {
  const r = compareAmount(0, 500)
  assert.equal(r.diffUsd, 500)
  assert.equal(r.diffPct, null)
})

test('실데이터 규모(수만 달러)에서도 오차 없음', () => {
  const total = itemsTotalUsd(
    Array.from({ length: 168 }, () => ({ unit_price_usd: 47.1234, quantity: 10 }))
  )
  assert.equal(total, 79167.312)
  assert.equal(compareAmount(total, 79167.312).status, 'match')
})
