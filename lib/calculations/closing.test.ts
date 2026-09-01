// 실행: node --test lib/calculations/closing.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateClosing } from './closing.ts'
import { applyRounding } from './interim.ts'

// ── 클로징 정산 ────────────────────────────────────────────

// 20차 실데이터. 수입원금 45,645,514 / LC결제 44,842,426 → 환차익 803,088
// LC수수료 1,299,609 → 추가비용 496,521
const R20 = {
  importAmountUsd: 33462,
  customsExchangeRate: 1364.1,
  lcPaymentTotalKrw: 44842426,
  lcFeeItems: [{ amountKrw: 1299609 }],
  closingCostItems: [] as { amountKrw: number }[],
  interimConfirmedKrw: 0,
}

test('구방식(inclusive) 50% 분담 — 저장된 20차 확정금액을 재현한다', () => {
  const c = calculateClosing({
    ...R20, fxBurdenA1Pct: 50, roundingPolicy: 'none', vatMode: 'inclusive',
  })
  assert.equal(c.fxGainLossKrw, 803088)
  assert.equal(c.additionalCostKrw, 496521)
  assert.equal(c.a1BurdenKrw, 248261)
  assert.equal(c.roundedFinalKrw, 273087)   // DB 저장된 확정금액과 정확히 일치
  assert.equal(c.vatKrw, 0)                 // 구방식은 부가세를 분리하지 않는다
})

test('신방식(exclusive) 에이원 전액 부담 — 공급가 + 부가세 = 합계', () => {
  const c = calculateClosing({
    ...R20, fxBurdenA1Pct: 100, roundingPolicy: 'floor_100', vatMode: 'exclusive',
  })
  assert.equal(c.a1BurdenKrw, 496521)
  assert.equal(c.supplyAmountKrw, 496500)   // 100원 절사
  assert.equal(c.vatKrw, 49650)
  assert.equal(c.roundedFinalKrw, 546150)
  assert.equal(c.supplyAmountKrw + c.vatKrw, c.roundedFinalKrw)
})

test('신방식은 클로징 추가비용(A+B+C)도 공급가에 넣어 10% 를 건다', () => {
  const c = calculateClosing({
    ...R20,
    closingCostItems: [{ amountKrw: 182600 }, { amountKrw: 40800 }],
    fxBurdenA1Pct: 100, roundingPolicy: 'none', vatMode: 'exclusive',
  })
  assert.equal(c.closingCostsTotalKrw, 223400)
  assert.equal(c.supplyAmountKrw, 496521 + 223400)
  assert.equal(c.vatKrw, Math.round((496521 + 223400) * 0.1))
  assert.equal(c.supplyAmountKrw + c.vatKrw, c.roundedFinalKrw)
})

test('기타 미정산 비용(A+B+C)에도 부담비율을 곱한다 — 신방식', () => {
  const c = calculateClosing({
    ...R20,
    closingCostItems: [{ amountKrw: 182600 }, { amountKrw: 40800 }],
    fxBurdenA1Pct: 50, roundingPolicy: 'none', vatMode: 'exclusive',
  })
  assert.equal(c.closingCostsTotalKrw, 223400)   // 원금은 그대로 표시한다
  assert.equal(c.a1ClosingCostsKrw, 111700)      // 부담분만 공급가에 들어간다
  assert.equal(c.supplyAmountKrw, 248261 + 111700)
  assert.equal(c.supplyAmountKrw + c.vatKrw, c.roundedFinalKrw)
})

test('기타 미정산 비용(A+B+C)에도 부담비율을 곱한다 — 구방식', () => {
  const c = calculateClosing({
    ...R20,
    closingCostItems: [{ amountKrw: 44000 }],
    fxBurdenA1Pct: 50, roundingPolicy: 'none', vatMode: 'inclusive',
  })
  assert.equal(c.a1ClosingCostsKrw, 22000)
  assert.equal(c.roundedFinalKrw, 273087 + 22000)  // 부담비율 밖 전액(44,000)이 아니다
})

test('부담비율 100%면 기타 미정산 비용이 원금 그대로 들어간다', () => {
  const c = calculateClosing({
    ...R20,
    closingCostItems: [{ amountKrw: 223400 }],
    fxBurdenA1Pct: 100, roundingPolicy: 'none', vatMode: 'exclusive',
  })
  assert.equal(c.a1ClosingCostsKrw, c.closingCostsTotalKrw)
})

test('환차손이면 부담이 늘고 환차익이면 준다', () => {
  const loss = calculateClosing({
    ...R20, lcPaymentTotalKrw: 46_000_000, fxBurdenA1Pct: 100,
    roundingPolicy: 'none', vatMode: 'exclusive',
  })
  assert.ok(loss.fxGainLossKrw < 0)
  assert.equal(loss.additionalCostKrw, 1299609 - loss.fxGainLossKrw)
  assert.ok(loss.additionalCostKrw > 1299609)
})

test('환급 방향(음수) 정산도 공급가+부가세가 맞는다', () => {
  const c = calculateClosing({
    ...R20, lcFeeItems: [{ amountKrw: 100000 }], fxBurdenA1Pct: 100,
    roundingPolicy: 'floor_100', vatMode: 'exclusive',
  })
  assert.ok(c.supplyAmountKrw < 0)
  assert.equal(c.supplyAmountKrw + c.vatKrw, c.roundedFinalKrw)
})

test('절사는 0 방향 버림 — 음수 환급액이 커지면 안 된다', () => {
  assert.equal(applyRounding(-1330450, 'floor_100'), -1330400)
  assert.equal(applyRounding(-1330450, 'floor_10'), -1330450)
  assert.equal(applyRounding(1330450, 'floor_100'), 1330400)
})

test('중간정산 확정금액과 합쳐 최종 합계를 낸다', () => {
  const c = calculateClosing({
    ...R20, interimConfirmedKrw: 55313164, fxBurdenA1Pct: 100,
    roundingPolicy: 'floor_100', vatMode: 'exclusive',
  })
  assert.equal(c.grandTotalKrw, 55313164 + c.roundedFinalKrw)
})
