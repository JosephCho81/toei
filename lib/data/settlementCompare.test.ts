import test from 'node:test'
import assert from 'node:assert/strict'
import { settledTotals, type CompareRow } from './settlementCompare.ts'
import { SETTLED_THROUGH_ROUND } from './payments.ts'

function row(p: Partial<CompareRow>): CompareRow {
  return {
    transactionId: String(p.roundNo), roundNo: null, roundLabel: '', orderNo: null, importAmountUsd: null,
    kind: 'interim', invoicedKrw: null, confirmedKrw: null, calcKrw: null, billVsCalcKrw: null,
    confirmVsCalcKrw: null, calcVsPaidKrw: null, paidKrw: 0, installments: [], balanceKrw: null,
    dueDate: '2025-01-10', dueYear: 2025, lastPaidAt: null, mergedWithRounds: [], legacyVatMode: false,
    note: null, noteTarget: null, calcNote: null, calcNoteTarget: null, invoicedTarget: null,
    ...p,
  }
}

/**
 * 담당자 2026-10-01: 차이 셋은 35차까지만 합친다. 36차부터는 담당자가 맞춰 가는 중이라
 * 섞으면 지난 구간의 차이가 진행 중인 금액에 묻힌다.
 */
test('settledTotals 는 35차까지만 더하고 36차 이후·차수 없는 행은 뺀다', () => {
  const rows = [
    row({ roundNo: SETTLED_THROUGH_ROUND, invoicedKrw: 1000, calcKrw: 1200, billVsCalcKrw: -200,
      paidKrw: 900, balanceKrw: 100, calcVsPaidKrw: 300 }),
    row({ roundNo: 1, invoicedKrw: 500, calcKrw: 500, billVsCalcKrw: 0,
      paidKrw: 600, balanceKrw: -100, calcVsPaidKrw: -100 }),
    row({ roundNo: SETTLED_THROUGH_ROUND + 1, invoicedKrw: 9999, calcKrw: 1, billVsCalcKrw: 9998,
      paidKrw: 0, balanceKrw: 9999, calcVsPaidKrw: 1 }),
    row({ roundNo: null, invoicedKrw: 7777, balanceKrw: 7777 }),
  ]
  const t = settledTotals(rows, '2026-10-01')
  assert.equal(t.rowCount, 2)
  assert.equal(t.billedCount, 2)
  assert.equal(t.billVsCalcKrw, -200)
  assert.equal(t.balanceKrw, 0)
  assert.equal(t.calcVsPaidKrw, 200)
})

test('구방식(inclusive) 차수는 청구−지급에만 들어가고 계산 비교 둘에서는 빠진다', () => {
  const rows = [
    row({ roundNo: 2, legacyVatMode: true, invoicedKrw: 1000, calcKrw: 700, billVsCalcKrw: 300,
      paidKrw: 400, balanceKrw: 600, calcVsPaidKrw: 300 }),
  ]
  const t = settledTotals(rows, '2026-10-01')
  assert.equal(t.balanceKrw, 600)
  assert.equal(t.billVsCalcKrw, 0)
  assert.equal(t.calcVsPaidKrw, 0)
  assert.equal(t.excludedCount, 1)
})
