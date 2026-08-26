// 실행: node --test lib/calculations/closing.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { feeExchangeRate, feeRateMissing, type LcFeeRateInput } from './closing.ts'
import { usdToKrw } from './helpers.ts'

const usd = (over: Partial<LcFeeRateInput> = {}): LcFeeRateInput => ({
  currency: 'USD', use_custom_rate: false, exchange_rate: '', ...over,
})

test('별도 환율을 끄면 클로징환율을 쓴다', () => {
  assert.equal(feeExchangeRate(usd(), 1375.9), 1375.9)
  assert.equal(feeExchangeRate(usd({ exchange_rate: '1450' }), 1375.9), 1375.9)
})

test('별도 환율을 켜면 입력한 환율이 클로징환율을 덮어쓴다', () => {
  const row = usd({ use_custom_rate: true, exchange_rate: '1452.30' })
  assert.equal(feeExchangeRate(row, 1375.9), 1452.3)
  // 이자 $1,234.56 를 은행 매도환율로 환산
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
