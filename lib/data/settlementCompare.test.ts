import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregate, applyBundles, roundRange, settledTotals, type CompareRow } from './settlementCompare.ts'
import { SETTLED_THROUGH_ROUND } from './payments.ts'

function row(p: Partial<CompareRow>): CompareRow {
  return {
    transactionId: String(p.roundNo), roundNo: null, roundLabel: '', orderNo: null, importAmountUsd: null,
    kind: 'interim', invoicedKrw: null, confirmedKrw: null, calcKrw: null, billVsCalcKrw: null,
    confirmVsCalcKrw: null, calcVsPaidKrw: null, paidKrw: 0, installments: [], balanceKrw: null,
    dueDate: '2025-01-10', dueYear: 2025, lastPaidAt: null, mergedWithRounds: [], legacyVatMode: false,
    note: null, noteTarget: null, calcNote: null, calcNoteTarget: null, invoicedTarget: null,
    inBundle: null, bundle: null, noteMeta: null,
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

/**
 * 1, 3~8차 최종정산은 계산서 한 장으로 끝나 차수별 지급액이 없다 (직원 2026-10-02).
 * 지급은 묶음에만 붙이고, 청구·계산은 차수 값을 더해 묶음 한 줄에서 비교한다.
 */
function bundleCase(invoiced: (number | null)[]) {
  const rounds = [1, 3, 4]
  const rows = rounds.map((n, i) => row({
    transactionId: `t${n}`, roundNo: n, kind: 'closing', invoicedKrw: invoiced[i], calcKrw: 1000,
    billVsCalcKrw: invoiced[i] == null ? null : invoiced[i]! - 1000,
    balanceKrw: invoiced[i], calcVsPaidKrw: 1000, dueDate: `2023-0${n}-01`,
  }))
  rows.push(row({ transactionId: 't2', roundNo: 2, kind: 'closing', invoicedKrw: 500, calcKrw: 500,
    billVsCalcKrw: 0, balanceKrw: 0, paidKrw: 500, calcVsPaidKrw: 0 }))
  return applyBundles(rows, [{
    bundle_id: 'b1', label: '1, 3~4차 묶음', note: null, note_meta: null, transaction_ids: ['t1', 't3', 't4'],
    paid_krw: 2500,
    installments: [{ payment_id: 'p1', paid_at: '2023-02-23', amount: 2500, direction: 'out', confirmed: true }],
  }])
}

test('묶음 줄이 청구·계산 합과 묶음 지급으로 차이 셋을 낸다', () => {
  const out = bundleCase([1100, 900, 1200])
  const b = out.find((r) => r.bundle != null)!
  assert.equal(b.invoicedKrw, 3200)
  assert.equal(b.calcKrw, 3000)
  assert.equal(b.paidKrw, 2500)
  assert.equal(b.billVsCalcKrw, 200)
  assert.equal(b.balanceKrw, 700)
  assert.equal(b.calcVsPaidKrw, 500)
  assert.equal(b.roundNo, 4)
  assert.equal(b.dueDate, '2023-04-01')
  assert.deepEqual(b.bundle, { rounds: [1, 3, 4], billedCount: 3 })
})

test('묶음에 든 차수는 지급 쪽을 비우고, 합계는 묶음 줄로 한 번만 센다', () => {
  const out = bundleCase([1100, 900, 1200])
  const m = out.find((r) => r.transactionId === 't3')!
  assert.equal(m.inBundle?.id, 'b1')
  assert.equal(m.balanceKrw, null)
  assert.equal(m.calcVsPaidKrw, null)
  assert.equal(m.billVsCalcKrw, -100)
  const t = aggregate(out, '2026-10-02')
  assert.equal(t.rowCount, 2)
  assert.equal(t.invoicedKrw, 3200 + 500)
  assert.equal(t.paidKrw, 2500 + 500)
  assert.equal(t.balanceKrw, 700)
})

test('청구액이 일부만 들어오면 묶음 청구 합을 내지 않는다 — 덜 넣은 만큼이 더 지급으로 둔갑한다', () => {
  const out = bundleCase([1100, null, 1200])
  const b = out.find((r) => r.bundle != null)!
  assert.equal(b.invoicedKrw, null)
  assert.equal(b.balanceKrw, null)
  assert.equal(b.bundle?.billedCount, 2)
  assert.equal(aggregate(out, '2026-10-02').balanceKrw, 0)
})

test('roundRange 는 이어진 차수를 물결로 줄인다', () => {
  assert.equal(roundRange([1, 3, 4, 5, 6, 7, 8]), '1, 3~8')
  assert.equal(roundRange([9]), '9')
  assert.equal(roundRange([1, 2, 5, 7, 8]), '1~2, 5, 7~8')
})
