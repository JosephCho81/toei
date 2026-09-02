import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addDays, isWeekend, prevBusinessDay,
  computeSettlementSchedule, isScheduleApplicable, scheduleState,
} from './schedule.ts'

test('addDays: 월말·연말·윤년을 넘어간다', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2024-02-28', 1), '2024-02-29') // 윤년
  assert.equal(addDays('2025-02-28', 1), '2025-03-01')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
})

test('isWeekend', () => {
  assert.equal(isWeekend('2026-09-05'), true)  // 토
  assert.equal(isWeekend('2026-09-06'), true)  // 일
  assert.equal(isWeekend('2026-09-04'), false) // 금
  assert.equal(isWeekend('2026-09-07'), false) // 월
})

test('prevBusinessDay: 평일은 그대로', () => {
  assert.equal(prevBusinessDay('2026-09-02'), '2026-09-02')
})

test('prevBusinessDay: 주말이면 직전 금요일로', () => {
  assert.equal(prevBusinessDay('2026-09-05'), '2026-09-04') // 토 → 금
  assert.equal(prevBusinessDay('2026-09-06'), '2026-09-04') // 일 → 금
})

test('prevBusinessDay: 공휴일이면 그 앞 영업일로', () => {
  const holidays = new Set(['2026-01-01'])
  assert.equal(prevBusinessDay('2026-01-01', holidays), '2025-12-31') // 목(신정) → 수
})

test('prevBusinessDay: 연휴+주말이 붙어도 끝까지 당긴다', () => {
  // 2026-09-24(목)~26(토) 추석 연휴 → 27 일요일까지 포함하면 직전 영업일은 9/23(수)
  const holidays = new Set(['2026-09-24', '2026-09-25', '2026-09-26'])
  assert.equal(prevBusinessDay('2026-09-27', holidays), '2026-09-23')
  assert.equal(prevBusinessDay('2026-09-25', holidays), '2026-09-23')
})

test('prevBusinessDay: 공휴일 데이터가 오염돼도 무한루프 대신 예외', () => {
  const holidays = new Set(
    Array.from({ length: 40 }, (_, i) => addDays('2026-06-01', -i))
  )
  assert.throws(() => prevBusinessDay('2026-06-01', holidays), /직전 영업일/)
})

test('isScheduleApplicable: 2025-06-01 이후 개설분만 확정', () => {
  assert.equal(isScheduleApplicable('2025-05-31'), false)
  assert.equal(isScheduleApplicable('2025-06-01'), true)
  assert.equal(isScheduleApplicable('2026-01-10'), true)
  assert.equal(isScheduleApplicable(null), false)
  assert.equal(isScheduleApplicable(undefined), false)
})

test('computeSettlementSchedule: 165일/180일, 총 180일이 유지된다', () => {
  const s = computeSettlementSchedule('2025-06-02')
  assert.equal(s.applicable, true)
  assert.equal(s.interimRaw, '2025-11-14') // +165, 금요일
  assert.equal(s.closingRaw, '2025-11-29') // +180, 토요일
  assert.equal(s.interimDue, '2025-11-14')
  assert.equal(s.closingDue, '2025-11-28') // 토 → 금
})

test('computeSettlementSchedule: 최종정산은 중간정산 보정을 물려받지 않는다', () => {
  // 중간정산 원 계산일이 주말이라 당겨져도, 최종정산은 LC+180 기준 그대로다.
  const s = computeSettlementSchedule('2025-06-07') // +165 = 2025-11-19(수), +180 = 12-04(목)
  assert.equal(s.interimRaw, '2025-11-19')
  assert.equal(s.closingRaw, '2025-12-04')
  // 원 계산일 간격은 항상 15일
  assert.equal(addDays(s.interimRaw!, 15), s.closingRaw)
})

test('computeSettlementSchedule: 공휴일 반영', () => {
  const holidays = new Set(['2026-01-01'])
  const s = computeSettlementSchedule('2025-07-05', holidays) // +180 = 2026-01-01
  assert.equal(s.closingRaw, '2026-01-01')
  assert.equal(s.closingDue, '2025-12-31')
})

test('computeSettlementSchedule: 2025-06 이전 건은 예정일을 내지 않는다', () => {
  const s = computeSettlementSchedule('2025-01-15')
  assert.deepEqual(s, {
    interimRaw: null, interimDue: null,
    closingRaw: null, closingDue: null, applicable: false,
  })
})

test('scheduleState', () => {
  assert.equal(scheduleState('2026-09-10', '2026-09-09', '2026-09-02'), 'done')
  assert.equal(scheduleState('2026-08-20', null, '2026-09-02'), 'overdue')
  assert.equal(scheduleState('2026-09-10', null, '2026-09-02'), 'upcoming')
  assert.equal(scheduleState('2026-11-10', null, '2026-09-02'), 'scheduled')
  assert.equal(scheduleState(null, null, '2026-09-02'), 'unknown')
})
