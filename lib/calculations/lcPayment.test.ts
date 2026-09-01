// 실행: node --test lib/calculations/lcPayment.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  feeExchangeRate, feeRateMissing, type LcFeeRateInput,
  calcLcPaymentKrw, hasAdvancePayment, advanceRateMissing, advanceExceedsTotal,
  type LcPaymentInput,
} from './closing.ts'
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
