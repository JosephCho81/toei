// 실행: node --test lib/utils/number.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseIntegerStrict, parseKrwAmount, parseDecimal } from './number.ts'

test('수량은 정수만 통과', () => {
  assert.equal(parseIntegerStrict('120'), 120)
  assert.equal(parseIntegerStrict('0'), 0)
  assert.equal(parseIntegerStrict('12.7'), null)
  assert.equal(parseIntegerStrict('-5'), null)
  assert.equal(parseIntegerStrict('1e5'), null)
  assert.equal(parseIntegerStrict(''), null)
  assert.equal(parseIntegerStrict('열두개'), null)
})

test('원화 금액은 반올림 정수', () => {
  assert.equal(parseKrwAmount('1234.6'), 1235)
  assert.equal(parseKrwAmount('1234.4'), 1234)
  assert.equal(parseKrwAmount('-1234.5'), -1234)
  assert.equal(parseKrwAmount(''), 0)
})

test('소수 금액', () => {
  assert.equal(parseDecimal('12.34'), 12.34)
  assert.equal(parseDecimal(''), null)
  assert.equal(parseDecimal('abc'), null)
})
