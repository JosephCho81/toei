// 실행: node --test lib/calculations/interim.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateInterim, applyRounding, computeVat, type CostItem } from './interim.ts'

// 17차 실데이터: $에 마진 5%, 통관환율 적용한 수입원가 81,377,727
//   해상운임 2,108,685 / 통관비 8,721,480 (그중 수입부가세 7,822,780)
const R17 = {
  importAmountUsd: 59904,
  customsExchangeRate: 1293.78,
  marginRatePct: 5,
  costItems: [
    { amountKrw: 2108685 },
    { amountKrw: 898700 },
    { amountKrw: 7822780, isImportVat: true },
  ] as CostItem[],
}

test('exclusive: 수입부가세를 뺀 공급가에 10% 를 더해 합계를 만든다', () => {
  const c = calculateInterim({ ...R17, roundingPolicy: 'floor_100', vatMode: 'exclusive' })
  assert.equal(c.importVatKrw, 7822780)
  assert.equal(c.supplyAmountKrw, 84385100)
  assert.equal(c.vatKrw, 8438510)
  assert.equal(c.confirmedKrw, 92823610)
  // 세금계산서 정합: 합계는 언제나 공급가 + 부가세
  assert.equal(c.supplyAmountKrw + c.vatKrw, c.confirmedKrw)
})

test('inclusive: 구방식은 수입부가세를 그대로 합산하고 부가세를 분리하지 않는다', () => {
  const c = calculateInterim({ ...R17, roundingPolicy: 'none', vatMode: 'inclusive' })
  assert.equal(c.vatKrw, 0)
  assert.equal(c.confirmedKrw, c.importAmountKrw + c.totalCostKrw)
  assert.equal(c.confirmedKrw, 92207892)
})

test('vatMode 를 안 주면 신방식이 기본', () => {
  const a = calculateInterim({ ...R17, roundingPolicy: 'floor_100' })
  const b = calculateInterim({ ...R17, roundingPolicy: 'floor_100', vatMode: 'exclusive' })
  assert.deepEqual(a, b)
})

test('절사는 공급가에 걸린다 — 합계가 아니라', () => {
  const items: CostItem[] = [{ amountKrw: 199 }]
  const c = calculateInterim({
    importAmountUsd: 100, customsExchangeRate: 1000, costItems: items,
    roundingPolicy: 'floor_100', vatMode: 'exclusive',
  })
  assert.equal(c.supplyAmountKrw, 100100)   // 100,199 → 100원 절사
  assert.equal(c.vatKrw, 10010)
  assert.equal(c.confirmedKrw, 110110)
})

test('수입부가세 플래그가 없으면 아무것도 빼지 않는다', () => {
  const c = calculateInterim({
    importAmountUsd: 100, customsExchangeRate: 1000,
    costItems: [{ amountKrw: 5000 }], roundingPolicy: 'none', vatMode: 'exclusive',
  })
  assert.equal(c.importVatKrw, 0)
  assert.equal(c.supplyAmountKrw, 105000)
})

test('수입부가세가 여러 줄이어도 모두 제외한다 (37차처럼 LC 2건)', () => {
  const c = calculateInterim({
    importAmountUsd: 100, customsExchangeRate: 1000,
    costItems: [
      { amountKrw: 12990840, isImportVat: true },
      { amountKrw: 5049580, isImportVat: true },
      { amountKrw: 271000 },
    ],
    roundingPolicy: 'none', vatMode: 'exclusive',
  })
  assert.equal(c.importVatKrw, 18040420)
  assert.equal(c.supplyAmountKrw, 100000 + 271000)
})

test('절사 정책', () => {
  assert.equal(applyRounding(92823619, 'floor_100'), 92823600)
  assert.equal(applyRounding(92823619, 'floor_10'), 92823610)
  assert.equal(applyRounding(92823619.6, 'none'), 92823620)
})

test('부가세는 반올림 정수', () => {
  assert.equal(computeVat(84385105), 8438511)   // .5 올림
  assert.equal(computeVat(0), 0)
})
