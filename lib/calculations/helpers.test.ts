// 실행: node --test lib/calculations/helpers.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { usdToKrw, krwToUsd } from './helpers.ts'
import { parseNumberInput, formatNumberForInput } from '../utils/format.ts'

test('달러→원화는 항상 반올림 정수', () => {
  assert.equal(usdToKrw(1000, 1391.5), 1391500)
  assert.equal(usdToKrw(1234.56, 1391.7), Math.round(1234.56 * 1391.7))
  assert.equal(usdToKrw(0.005, 1000), 5)
  assert.equal(Number.isInteger(usdToKrw(1234.567, 1391.7)), true)
})

test('환율이나 금액이 없으면 0', () => {
  assert.equal(usdToKrw(null, 1391.5), 0)
  assert.equal(usdToKrw(1000, null), 0)
  assert.equal(usdToKrw(NaN, 1391.5), 0)
})

test('원화→달러는 소수 2자리, 환율 0이면 null', () => {
  assert.equal(krwToUsd(1391500, 1391.5), 1000)
  assert.equal(krwToUsd(1000, 0), null)
  assert.equal(krwToUsd(null, 1391.5), null)
})

test('입력 파싱: 쉼표 제거, 소수점·부호는 하나만', () => {
  assert.equal(parseNumberInput('1,234,567'), '1234567')
  assert.equal(parseNumberInput('1.2.3'), '1.23')
  assert.equal(parseNumberInput('--12'), '-12')
  assert.equal(parseNumberInput('1-2'), '12')
  assert.equal(parseNumberInput('-1,234.50원'), '-1234.50')
  assert.equal(parseNumberInput(''), '')
})

test('표시 포맷: 천단위 쉼표, 입력 중인 소수점 유지', () => {
  assert.equal(formatNumberForInput('1234567'), '1,234,567')
  assert.equal(formatNumberForInput('1234.'), '1,234.')
  assert.equal(formatNumberForInput('-1234.5'), '-1,234.5')
  assert.equal(formatNumberForInput(''), '')
  assert.equal(formatNumberForInput('-'), '-')
})
