/**
 * 정산 예정일 계산.
 *
 * 토에이가 180일 유산스 신용장을 개설하고, 한국에이원은 그 일정에 맞춰 정산한다.
 *   중간정산 = LC 개설일 + 165일
 *   최종정산 = LC 개설일 + 180일  (= 중간정산 + 15일)
 * 두 날짜 모두 LC 개설일에서 직접 계산한다. 중간정산이 휴일로 당겨져도
 * 최종정산은 "총 180일"에 고정되어야 하므로 앞 단계의 보정을 물려받지 않는다.
 *
 * 예정일이 주말·공휴일이면 직전 영업일로 당긴다.
 *
 * 이 공식은 2025-06-01 이후 개설분에만 확정 적용된다. 그 이전 건은 원본 엑셀
 * 기준이 아직 미확정이라 예정일을 산출하지 않는다(null).
 */

export const INTERIM_OFFSET_DAYS = 165
export const CLOSING_OFFSET_DAYS = 180

/** 이 날짜(포함) 이후 개설된 LC부터 위 공식이 확정 적용된다. */
export const SCHEDULE_RULE_FROM = '2025-06-01'

export interface SettlementSchedule {
  /** 보정 전 원 계산일 (LC 개설일 + 165일) */
  interimRaw: string | null
  /** 주말·공휴일을 직전 영업일로 당긴 중간정산 예정일 */
  interimDue: string | null
  /** 보정 전 원 계산일 (LC 개설일 + 180일) */
  closingRaw: string | null
  /** 주말·공휴일을 직전 영업일로 당긴 최종정산 예정일 */
  closingDue: string | null
  /** 공식 적용 대상이 아니면 false — 화면에서 '미확정'으로 표기한다 */
  applicable: boolean
}

/** 'YYYY-MM-DD' → UTC 자정 Date. 로컬 타임존 때문에 하루가 밀리는 일이 없어야 한다. */
function parseIso(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  const d = parseIso(date)
  d.setUTCDate(d.getUTCDate() + days)
  return toIso(d)
}

export function isWeekend(date: string): boolean {
  const day = parseIso(date).getUTCDay()
  return day === 0 || day === 6
}

/**
 * 주말·공휴일이면 직전 영업일로 당긴다.
 * holidays 는 'YYYY-MM-DD' 집합.
 */
export function prevBusinessDay(date: string, holidays: ReadonlySet<string> = new Set()): string {
  let cursor = date
  // 연휴가 아무리 길어도 이 범위를 넘지 않는다. 공휴일 데이터가 오염돼도 무한루프는 막는다.
  for (let i = 0; i < 30; i++) {
    if (!isWeekend(cursor) && !holidays.has(cursor)) return cursor
    cursor = addDays(cursor, -1)
  }
  throw new Error(`직전 영업일을 찾지 못했습니다: ${date} 기준 30일 내 영업일 없음`)
}

export function isScheduleApplicable(lcOpenDate: string | null | undefined): boolean {
  return Boolean(lcOpenDate) && lcOpenDate! >= SCHEDULE_RULE_FROM
}

export function computeSettlementSchedule(
  lcOpenDate: string | null | undefined,
  holidays: ReadonlySet<string> = new Set()
): SettlementSchedule {
  const empty: SettlementSchedule = {
    interimRaw: null, interimDue: null,
    closingRaw: null, closingDue: null,
    applicable: false,
  }
  if (!isScheduleApplicable(lcOpenDate)) return empty

  const base = lcOpenDate!.slice(0, 10)
  const interimRaw = addDays(base, INTERIM_OFFSET_DAYS)
  const closingRaw = addDays(base, CLOSING_OFFSET_DAYS)

  return {
    interimRaw,
    interimDue: prevBusinessDay(interimRaw, holidays),
    closingRaw,
    closingDue: prevBusinessDay(closingRaw, holidays),
    applicable: true,
  }
}

export type ScheduleState = 'done' | 'overdue' | 'upcoming' | 'scheduled' | 'unknown'

/**
 * 화면 표시용 상태. actualDate 가 있으면 그 날짜가 곧 결과다.
 * upcoming 은 예정일까지 14일 이내를 뜻한다.
 */
export function scheduleState(
  dueDate: string | null,
  actualDate: string | null | undefined,
  today: string
): ScheduleState {
  if (actualDate) return 'done'
  if (!dueDate) return 'unknown'
  if (dueDate < today) return 'overdue'
  return addDays(today, 14) >= dueDate ? 'upcoming' : 'scheduled'
}
