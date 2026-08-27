// 실행: node --test lib/calculations/unitCost.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  allocateByWeight, allocateRoundCost, buildRoundUnitCost, productName, subtotalUsd,
  type UnitCostItemInput,
} from './unitCost.ts'

function item(over: Partial<UnitCostItemInput>): UnitCostItemInput {
  return {
    spec: 'GLOVETREE BLACK', glove_type: '니트릴', color: 'BLACK', size: 'M',
    unit: 'Ct', unit_price_usd: 20, quantity: 100, sort_order: 0, ...over,
  }
}

test('배부액 합계는 총액과 1원까지 일치한다', () => {
  // 3으로 나눠떨어지지 않는 총액 — 단순 반올림이면 1원이 어긋난다
  const alloc = allocateByWeight(100_000_001, [1, 1, 1])
  assert.equal(alloc.reduce((s, v) => s + v, 0), 100_000_001)
  assert.deepEqual(alloc, [33_333_334, 33_333_334, 33_333_333])
})

test('가중치 비율대로 배부된다', () => {
  assert.deepEqual(allocateByWeight(1000, [3, 1]), [750, 250])
})

test('가중치 합이 0이면 전부 0', () => {
  assert.deepEqual(allocateByWeight(1000, [0, 0]), [0, 0])
  assert.deepEqual(allocateByWeight(1000, []), [])
})

test('음수 총액(환급)도 합계가 일치한다', () => {
  const alloc = allocateByWeight(-1_000_001, [1, 1, 1])
  assert.equal(alloc.reduce((s, v) => s + v, 0), -1_000_001)
})

test('음수·NaN 가중치는 0으로 취급', () => {
  assert.deepEqual(allocateByWeight(1000, [-5, 5]), [0, 1000])
  assert.deepEqual(allocateByWeight(1000, [NaN, 5]), [0, 1000])
})

test('소계는 1/10000 USD 정수 연산 — 부동소수 오차 없음', () => {
  assert.equal(subtotalUsd(item({ unit_price_usd: 0.1, quantity: 3 })), 0.3)
  assert.equal(subtotalUsd(item({ unit_price_usd: '22.95', quantity: '3760' })), 86292)
  assert.equal(subtotalUsd(item({ unit_price_usd: null, quantity: 100 })), 0)
})

test('금액 기준 배부: 단가가 다르면 비싼 품목이 더 많이 부담', () => {
  const { rows, effectiveBasis } = allocateRoundCost(
    [item({ unit_price_usd: 30, quantity: 100 }), item({ unit_price_usd: 10, quantity: 100 })],
    4_000_000, 'amount',
  )
  assert.equal(effectiveBasis, 'amount')
  assert.deepEqual(rows.map((r) => r.allocatedKrw), [3_000_000, 1_000_000])
  assert.deepEqual(rows.map((r) => r.unitCostKrw), [30_000, 10_000])
})

test('수량 기준 배부: 단가와 무관하게 수량 비율', () => {
  const { rows } = allocateRoundCost(
    [item({ unit_price_usd: 30, quantity: 100 }), item({ unit_price_usd: 10, quantity: 300 })],
    4_000_000, 'quantity',
  )
  assert.deepEqual(rows.map((r) => r.allocatedKrw), [1_000_000, 3_000_000])
})

test('단가가 전부 비어 있으면 금액 기준을 수량 기준으로 대체', () => {
  const { rows, effectiveBasis } = allocateRoundCost(
    [item({ unit_price_usd: null, quantity: 100 }), item({ unit_price_usd: null, quantity: 300 })],
    4_000_000, 'amount',
  )
  assert.equal(effectiveBasis, 'quantity')
  assert.deepEqual(rows.map((r) => r.allocatedKrw), [1_000_000, 3_000_000])
})

test('수량 0인 품목은 단위원가 null (0으로 나누지 않는다)', () => {
  const { rows } = allocateRoundCost([item({ quantity: 0 })], 1_000_000, 'amount')
  assert.equal(rows[0].quantity, 0)
  assert.equal(rows[0].unitCostKrw, null)
})

test('클로징이 없으면 중간정산만으로 잠정 집계', () => {
  const r = buildRoundUnitCost({
    transactionId: 't1', roundNo: 38, roundLabel: '26년 38차', manufacturer: '토에이',
    lcOpenDate: null, customsDate: null,
    interimKrw: 137_363_809, closingKrw: null,
    items: [item({ quantity: 1000 }), item({ quantity: 1000, size: 'L' })],
  }, 'amount')
  assert.equal(r.costBasis, 'interim_only')
  assert.equal(r.totalKrw, 137_363_809)
  assert.equal(r.items.reduce((s, i) => s + i.allocatedKrw, 0), 137_363_809)
})

test('클로징이 음수(환급)여도 총액은 중간+클로징', () => {
  const r = buildRoundUnitCost({
    transactionId: 't2', roundNo: 24, roundLabel: '24년 24차', manufacturer: '토에이',
    lcOpenDate: null, customsDate: null,
    interimKrw: 141_452_125, closingKrw: -912_379,
    items: [item({ quantity: 3260, unit_price_usd: 21 })],
  }, 'amount')
  assert.equal(r.costBasis, 'final')
  assert.equal(r.totalKrw, 140_539_746)
  assert.equal(r.averageUnitCostKrw, Math.round(140_539_746 / 3260))
})

test('정산이 전혀 없으면 총액 0 · 상태 none', () => {
  const r = buildRoundUnitCost({
    transactionId: 't3', roundNo: 25, roundLabel: '26년 25차', manufacturer: '토에이',
    lcOpenDate: null, customsDate: null,
    interimKrw: null, closingKrw: null,
    items: [item({})],
  }, 'amount')
  assert.equal(r.costBasis, 'none')
  assert.equal(r.totalKrw, 0)
  assert.equal(r.items[0].allocatedKrw, 0)
})

test('품목은 sort_order 순서로 정렬된다', () => {
  const r = buildRoundUnitCost({
    transactionId: 't4', roundNo: 30, roundLabel: '26년 30차', manufacturer: '토에이',
    lcOpenDate: null, customsDate: null, interimKrw: 300, closingKrw: 0,
    items: [item({ size: 'L', sort_order: 2 }), item({ size: 'S', sort_order: 0 }), item({ size: 'M', sort_order: 1 })],
  }, 'amount')
  assert.deepEqual(r.items.map((i) => i.size), ['S', 'M', 'L'])
})

test('제품명은 사양(색상) 조합', () => {
  assert.equal(productName(item({})), 'GLOVETREE BLACK (BLACK)')
  assert.equal(productName(item({ color: null })), 'GLOVETREE BLACK')
  assert.equal(productName(item({ spec: null, color: null })), '(미입력)')
})
