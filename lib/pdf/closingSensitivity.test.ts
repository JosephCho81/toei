// 실행: node --test lib/pdf/closingSensitivity.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSensScenarios, type SensInput } from './closingSensitivity.ts'
import { calculateClosing } from '../calculations/closing.ts'

// PDF 의 「환율 민감도」 표는 담당자가 환율 협상 근거로 본다.
// 본 정산과 다른 공식으로 그리면 표 하나 때문에 판단이 어긋난다.

const base = (over: Partial<SensInput> = {}): SensInput => ({
  bokExchangeRate: 1375.9,
  importAmountUsd: 33462,
  customsExchangeRate: 1364.1,
  lcPaymentTotalUsd: 32600,
  lcPaymentTotalKrw: 44_842_426,
  advancePaymentUsd: null,
  advanceExchangeRate: null,
  lcFeeTotalKrw: 1_299_609,
  closingCostsTotalKrw: 0,
  fxBurdenA1Pct: 100,
  roundingPolicy: 'floor_100',
  vatMode: 'exclusive',
  ...over,
})

test('delta 0 은 본 정산과 같은 공식으로 나온다', () => {
  const input = base()
  const actual = buildSensScenarios(input)!.find((s) => s.isActual)!
  const calc = calculateClosing({
    lcPaymentTotalKrw: Math.round(input.lcPaymentTotalUsd! * input.bokExchangeRate),
    importAmountUsd: input.importAmountUsd,
    customsExchangeRate: input.customsExchangeRate,
    lcFeeItems: [{ amountKrw: input.lcFeeTotalKrw }],
    fxBurdenA1Pct: 100,
    closingCostItems: [{ amountKrw: 0 }],
    roundingPolicy: 'floor_100',
    interimConfirmedKrw: 0,
    vatMode: 'exclusive',
  })
  assert.equal(actual.simFinal, calc.roundedFinalKrw)
  assert.equal(actual.simFx, calc.fxGainLossKrw)
})

test('exclusive 는 공급가에 부가세를 붙인 합계다 — 구방식 × 1.1 이 아니다', () => {
  const s = buildSensScenarios(base())!.find((x) => x.isActual)!
  const inclusive = buildSensScenarios(base({ vatMode: 'inclusive' }))!.find((x) => x.isActual)!
  assert.notEqual(s.simFinal, inclusive.simFinal)
})

test('절사 정책이 결과에 반영된다', () => {
  const floored = buildSensScenarios(base())!.find((x) => x.isActual)!
  const none = buildSensScenarios(base({ roundingPolicy: 'none' }))!.find((x) => x.isActual)!
  assert.equal(floored.simFinal % 10, 0)
  assert.notEqual(floored.simFinal, none.simFinal)
})

test('기타 미정산 비용에도 부담비율이 걸린다', () => {
  const full = buildSensScenarios(base({ closingCostsTotalKrw: 223_400 }))!.find((x) => x.isActual)!
  const half = buildSensScenarios(base({ closingCostsTotalKrw: 223_400, fxBurdenA1Pct: 50 }))!
    .find((x) => x.isActual)!
  assert.ok(Math.abs(half.simFinal) < Math.abs(full.simFinal))
})

test('환율이 오르면 LC 결제비용이 늘어 환차익이 줄어든다', () => {
  const rows = buildSensScenarios(base())!
  const up = rows.find((r) => r.delta === 50)!
  const down = rows.find((r) => r.delta === -50)!
  assert.ok(up.simFx < down.simFx)
  assert.equal(up.simRate, base().bokExchangeRate + 50)
})

test('선지급 구간은 자기 환율을 유지한다 — 시뮬레이션 환율에 흔들리지 않는다', () => {
  const rows = buildSensScenarios(base({
    lcPaymentTotalUsd: 60800, advancePaymentUsd: 7040, advanceExchangeRate: 1156.4,
  }))!
  const noAdvance = buildSensScenarios(base({ lcPaymentTotalUsd: 60800 }))!
  // 선지급분이 낮은 고정 환율이므로 결제비용이 작고 → 환차익이 크다
  assert.ok(rows[0].simFx > noAdvance[0].simFx)
})

test('달러 총액이 없으면 저장된 원화를 클로징환율로 역산해 쓴다', () => {
  const rows = buildSensScenarios(base({ lcPaymentTotalUsd: null }))
  assert.ok(rows && rows.length > 0)
})

test('역산할 원화도 0 이면 표를 그리지 않는다', () => {
  assert.equal(buildSensScenarios(base({ lcPaymentTotalUsd: null, lcPaymentTotalKrw: 0 })), null)
})
