import test from 'node:test'
import assert from 'node:assert/strict'
import { bucketOf, calcPaidPhase, isCalcPaidShown, isPastGrace, SETTLED_THROUGH_ROUND, PAID_TOLERANCE_KRW } from './payments.ts'

/**
 * 남은 금액이 어느 칸에 들어가는가 — 담당자 2026-09-10 규약.
 *
 * 셋을 한 칸에 담고 있던 것이 문제였다: 2022년 2차 1억 3천만원(개인 통장 지급분)과
 * 이번 달 지급이 도는 36차가 같은 「기일 경과」로 묶여 있었다.
 * 칸이 섞이면 대표 첫 화면이 다시 겁만 주는 숫자로 돌아간다.
 */

const TODAY = '2026-09-10'

function b(over: Partial<Parameters<typeof bucketOf>[0]>) {
  return bucketOf({ roundNo: 40, balanceKrw: 10_000_000, basisKrw: 100_000_000, dueDate: '2026-09-06', ...over }, TODAY)
}

test('35차까지는 기일이 아무리 지나도 연체가 아니라 지급금 차이다', () => {
  assert.equal(b({ roundNo: SETTLED_THROUGH_ROUND, dueDate: '2022-06-14' }), 'settled_gap')
  assert.equal(b({ roundNo: 2, dueDate: '2022-06-14' }), 'settled_gap')
  // 기일이 아직 안 왔어도 마찬가지다 — 구간으로 가르지 날짜로 가르지 않는다
  assert.equal(b({ roundNo: 12, dueDate: '2027-01-01' }), 'settled_gap')
})

test('36차부터는 기일이 이번 달이면 지급 중, 달을 넘기면 연체다', () => {
  assert.equal(b({ roundNo: 36, dueDate: '2026-09-06' }), 'in_progress')
  assert.equal(b({ roundNo: 36, dueDate: '2026-09-30' }), 'in_progress')
  assert.equal(b({ roundNo: 36, dueDate: '2026-08-31' }), 'overdue')
})

test('기일이 다음 달 이후면 미도래', () => {
  assert.equal(b({ roundNo: 38, dueDate: '2026-10-18' }), 'not_due')
  assert.equal(b({ roundNo: 44, dueDate: null }), 'not_due')
})

test('절사 오차는 남은 금액으로 세지 않는다', () => {
  assert.equal(b({ roundNo: 31, balanceKrw: PAID_TOLERANCE_KRW - 1 }), 'none')
  assert.equal(b({ roundNo: 36, balanceKrw: 18 }), 'none')
})

test('초과 지급은 구간과 무관하게 따로 센다 — 연체로 묶으면 화면이 반대로 읽힌다', () => {
  assert.equal(b({ roundNo: 2, balanceKrw: -5_000_000, dueDate: '2022-06-14' }), 'overpaid')
  assert.equal(b({ roundNo: 40, balanceKrw: -5_000_000 }), 'overpaid')
})

test('청구액도 계산값도 없으면 셀 근거가 없다', () => {
  assert.equal(b({ basisKrw: null }), 'none')
})

test('36차 실제 값 — 계산값 기준 1,000만원이 이번 달 지급 중으로 잡힌다', () => {
  const basisKrw = 126_431_030
  const paidKrw = 116_431_030
  assert.equal(bucketOf(
    { roundNo: 36, basisKrw, balanceKrw: basisKrw - paidKrw, dueDate: '2026-09-06' },
    TODAY,
  ), 'in_progress')
  assert.equal(basisKrw - paidKrw, 10_000_000)
})

test('절사 폭은 200원 — 108원 차이는 0, 200원부터는 차이다 (담당자 2026-09-22)', () => {
  assert.equal(PAID_TOLERANCE_KRW, 200)
  assert.equal(b({ roundNo: 36, balanceKrw: 108 }), 'none')
  assert.equal(b({ roundNo: 36, balanceKrw: 200 }), 'in_progress')
})

/**
 * 정산비교 「계산-지급 차이」 — 담당자 2026-09-22 요청을 2026-09-22 실제 기일로 못 박는다.
 * 36차 09-06 · 38차 09-15 · 37차 10-16 · 39차 10-18 · 35차 07-28
 */
test('기일 +7일째부터 1주 경과 — 38차(09-15)는 09-22에 빨강', () => {
  assert.equal(isPastGrace('2026-09-15', '2026-09-22'), true)
  assert.equal(isPastGrace('2026-09-16', '2026-09-22'), false)
})

test('계산-지급 차이는 지난달까지 기일인 차수만 숫자를 보인다', () => {
  const T = '2026-09-22'
  assert.equal(isCalcPaidShown('2026-07-28', T), true)
  assert.equal(isCalcPaidShown('2026-08-31', T), true)
  assert.equal(isCalcPaidShown('2026-09-01', T), false)
  assert.equal(isCalcPaidShown('2026-10-16', T), false)
  assert.equal(isCalcPaidShown(null, T), false)
})

test('숨긴 칸의 상태 — 38차 연빨강, 37·39차 연녹색', () => {
  const T = '2026-09-22'
  assert.equal(calcPaidPhase('2026-07-28', T, true), 'shown')
  assert.equal(calcPaidPhase('2026-09-15', T, true), 'late')
  assert.equal(calcPaidPhase('2026-09-06', T, true), 'late')
  // 다 냈으면 기일이 지나도 빨강이 아니다
  assert.equal(calcPaidPhase('2026-09-15', T, false), 'this_month')
  assert.equal(calcPaidPhase('2026-09-20', T, true), 'this_month')
  assert.equal(calcPaidPhase('2026-10-16', T, true), 'upcoming')
  assert.equal(calcPaidPhase('2026-10-18', T, false), 'upcoming')
  assert.equal(calcPaidPhase(null, T, true), 'undated')
})
