// 실행: node --test lib/calculations/closing.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateClosing, feeExchangeRate, feeRateMissing, type LcFeeRateInput,
  calcLcPaymentKrw, hasAdvancePayment, advanceRateMissing, advanceExceedsTotal,
  type LcPaymentInput,
} from './closing.ts'
import { applyRounding } from './interim.ts'
import { usdToKrw } from './helpers.ts'

const usd = (over: Partial<LcFeeRateInput> = {}): LcFeeRateInput => ({
  currency: 'USD', use_custom_rate: false, exchange_rate: '', ...over,
})

// ── LC 수수료 별도 환율 ────────────────────────────────────

test('별도 환율을 끄면 클로징환율을 쓴다', () => {
  assert.equal(feeExchangeRate(usd(), 1375.9), 1375.9)
  assert.equal(feeExchangeRate(usd({ exchange_rate: '1450' }), 1375.9), 1375.9)
})

test('별도 환율을 켜면 입력한 환율이 클로징환율을 덮어쓴다', () => {
  const row = usd({ use_custom_rate: true, exchange_rate: '1452.30' })
  assert.equal(feeExchangeRate(row, 1375.9), 1452.3)
  assert.equal(usdToKrw(1234.56, feeExchangeRate(row, 1375.9)), Math.round(1234.56 * 1452.3))
})

test('별도 환율이 비었거나 0 이하면 0 — 클로징환율로 조용히 대체하지 않는다', () => {
  for (const v of ['', '0', '-1400', 'abc']) {
    assert.equal(feeExchangeRate(usd({ use_custom_rate: true, exchange_rate: v }), 1375.9), 0)
  }
})

test('별도 환율을 켜고 비워두면 저장을 막는다', () => {
  assert.equal(feeRateMissing(usd({ use_custom_rate: true, exchange_rate: '' })), true)
  assert.equal(feeRateMissing(usd({ use_custom_rate: true, exchange_rate: '0' })), true)
  assert.equal(feeRateMissing(usd({ use_custom_rate: true, exchange_rate: '1452.3' })), false)
  assert.equal(feeRateMissing(usd()), false)
})

test('원화 항목은 별도 환율과 무관하다', () => {
  const krw: LcFeeRateInput = { currency: 'KRW', use_custom_rate: true, exchange_rate: '' }
  assert.equal(feeRateMissing(krw), false)
})

// ── 클로징 정산 ────────────────────────────────────────────

// 20차 실데이터. 수입원금 45,645,514 / LC결제 44,842,426 → 환차익 803,088
// LC수수료 1,299,609 → 추가비용 496,521
const R20 = {
  importAmountUsd: 33462,
  customsExchangeRate: 1364.1,
  lcPaymentTotalKrw: 44842426,
  lcFeeItems: [{ amountKrw: 1299609 }],
  closingCostItems: [] as { amountKrw: number; includesVat: boolean }[],
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
    closingCostItems: [{ amountKrw: 182600, includesVat: false }, { amountKrw: 40800, includesVat: true }],
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
    closingCostItems: [{ amountKrw: 182600, includesVat: false }, { amountKrw: 40800, includesVat: true }],
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
    closingCostItems: [{ amountKrw: 44000, includesVat: false }],
    fxBurdenA1Pct: 50, roundingPolicy: 'none', vatMode: 'inclusive',
  })
  assert.equal(c.a1ClosingCostsKrw, 22000)
  assert.equal(c.roundedFinalKrw, 273087 + 22000)  // 부담비율 밖 전액(44,000)이 아니다
})

test('부담비율 100%면 기타 미정산 비용이 원금 그대로 들어간다', () => {
  const c = calculateClosing({
    ...R20,
    closingCostItems: [{ amountKrw: 223400, includesVat: false }],
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

// ── LC 결제비용 선지급금 별도 환율 ─────────────────────────

const pay = (over: Partial<LcPaymentInput> = {}): LcPaymentInput => ({
  totalUsd: 60800, advanceUsd: null, advanceRate: null, ...over,
})

test('선지급금이 없으면 총액을 클로징환율로 환산한다', () => {
  assert.equal(calcLcPaymentKrw(pay(), 1202.4), Math.round(60800 * 1202.4))
  assert.equal(hasAdvancePayment(pay()), false)
  assert.equal(hasAdvancePayment(pay({ advanceUsd: 0 })), false)
})

test('1차 실데이터 — 선지급금 7,040$ 를 별도 환율로 환산하면 저장된 결제비용과 일치한다', () => {
  // DB lc_payment_total_krw = 72,782,080
  const krw = calcLcPaymentKrw(pay({ advanceUsd: 7040, advanceRate: 1156.4 }), 1202.4)
  assert.equal(krw, 72782080)
  // 단일 환율로는 이 값이 나오지 않는다
  assert.notEqual(calcLcPaymentKrw(pay(), 1202.4), 72782080)
})

test('구간별로 반올림해 더한다 — 합계를 한 번에 환산하지 않는다', () => {
  const p = pay({ totalUsd: 1000.005, advanceUsd: 500.005, advanceRate: 1000.5 })
  assert.equal(calcLcPaymentKrw(p, 1200.5), Math.round(500.005 * 1000.5) + Math.round(500 * 1200.5))
})

test('선지급금을 넣고 환율을 비우면 저장을 막는다', () => {
  for (const r of [null, 0, -1400, NaN]) {
    assert.equal(advanceRateMissing(pay({ advanceUsd: 7040, advanceRate: r })), true)
  }
  assert.equal(advanceRateMissing(pay({ advanceUsd: 7040, advanceRate: 1156.4 })), false)
  assert.equal(advanceRateMissing(pay()), false)   // 선지급금이 없으면 환율도 필요 없다
})

test('선지급금이 총액을 넘으면 막는다 — 잔액이 음수가 되면 결제비용이 뒤집힌다', () => {
  assert.equal(advanceExceedsTotal(pay({ advanceUsd: 70000, advanceRate: 1156.4 })), true)
  assert.equal(advanceExceedsTotal(pay({ advanceUsd: 60800, advanceRate: 1156.4 })), false)
  assert.equal(advanceExceedsTotal(pay({ totalUsd: null, advanceUsd: 100, advanceRate: 1156.4 })), true)
})

test('선지급금이 총액과 같으면 전액을 선지급 환율로 환산한다', () => {
  assert.equal(calcLcPaymentKrw(pay({ advanceUsd: 60800, advanceRate: 1156.4 }), 1202.4),
               Math.round(60800 * 1156.4))
})
