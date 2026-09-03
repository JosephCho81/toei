/**
 * 지급 입력값 검증.
 *
 * 돈이 걸린 입력이라 화면 검증만 믿지 않는다. 라우트에서 반드시 한 번 더 거른다.
 * 숫자는 원 단위 정수만 받는다 — 소수·음수·지수표기(1e9)·콤마는 전부 거부한다.
 */

export const KINDS = ['interim', 'closing', 'warehouse', 'other'] as const
export type AllocKind = (typeof KINDS)[number]

export const DIRECTIONS = ['out', 'in'] as const
export type Direction = (typeof DIRECTIONS)[number]

/** 한 번의 이체로 있을 수 있는 최대 금액. 자릿수 오타를 막는 상한. */
const MAX_AMOUNT_KRW = 10_000_000_000

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export class InputError extends Error {}

function fail(msg: string): never {
  throw new InputError(msg)
}

export function parseDate(v: unknown, field = '날짜'): string {
  if (typeof v !== 'string' || !DATE_RE.test(v)) fail(`${field}는 YYYY-MM-DD 형식이어야 합니다`)
  const s = v as string
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    fail(`${field}가 존재하지 않는 날짜입니다`)
  }
  if (y < 2000 || y > 2100) fail(`${field}가 범위를 벗어났습니다`)
  return s
}

export function parseAmount(v: unknown, field = '금액'): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.trim()) : NaN
  if (!Number.isFinite(n)) fail(`${field}를 숫자로 읽을 수 없습니다`)
  if (!Number.isInteger(n)) fail(`${field}는 원 단위 정수여야 합니다`)
  if (n <= 0) fail(`${field}는 0보다 커야 합니다`)
  if (n > MAX_AMOUNT_KRW) fail(`${field}가 너무 큽니다 (${MAX_AMOUNT_KRW.toLocaleString('ko-KR')}원 초과)`)
  return n
}

export function parseUuid(v: unknown, field = 'ID'): string {
  if (typeof v !== 'string' || !UUID_RE.test(v)) fail(`${field}가 올바르지 않습니다`)
  return v
}

export function parseDirection(v: unknown): Direction {
  if (v == null) return 'out'
  if (typeof v !== 'string' || !DIRECTIONS.includes(v as Direction)) fail('입출금 구분이 올바르지 않습니다')
  return v as Direction
}

export function parseKind(v: unknown): AllocKind {
  if (typeof v !== 'string' || !KINDS.includes(v as AllocKind)) fail('정산 구분이 올바르지 않습니다')
  return v as AllocKind
}

export function parseMemo(v: unknown): string | null {
  if (v == null || v === '') return null
  if (typeof v !== 'string') fail('메모 형식이 올바르지 않습니다')
  const s = v.trim().slice(0, 500)
  return s === '' ? null : s
}

export interface AllocationInput {
  transactionId: string | null
  kind: AllocKind
  amountKrw: number
}

export interface PaymentInput {
  paidAt: string
  direction: Direction
  amountKrw: number
  bankMemo: string | null
  allocations: AllocationInput[]
}

/**
 * 한 번의 이체와 그 배분을 함께 검증한다.
 *
 * 배분 합계가 이체 금액을 넘으면 거부하고, 모자라는 것은 허용한다 —
 * 어느 차수인지 모르는 돈은 억지로 배분하는 것보다 미배분으로 두는 편이 낫다.
 */
export function parsePaymentInput(body: unknown): PaymentInput {
  if (typeof body !== 'object' || body == null) fail('요청 형식이 올바르지 않습니다')
  const b = body as Record<string, unknown>

  const paidAt = parseDate(b.paidAt, '지급일')
  const direction = parseDirection(b.direction)
  const amountKrw = parseAmount(b.amountKrw)
  const bankMemo = parseMemo(b.bankMemo)

  const raw = Array.isArray(b.allocations) ? b.allocations : []
  if (raw.length > 50) fail('한 이체에 배분은 50건까지 넣을 수 있습니다')

  const allocations: AllocationInput[] = raw.map((a, i) => {
    if (typeof a !== 'object' || a == null) fail(`${i + 1}번째 배분 형식이 올바르지 않습니다`)
    const o = a as Record<string, unknown>
    const kind = parseKind(o.kind)
    const needsRound = kind === 'interim' || kind === 'closing'
    const transactionId = needsRound
      ? parseUuid(o.transactionId, `${i + 1}번째 배분의 차수`)
      : o.transactionId == null || o.transactionId === ''
        ? null
        : parseUuid(o.transactionId, `${i + 1}번째 배분의 차수`)
    return { transactionId, kind, amountKrw: parseAmount(o.amountKrw, `${i + 1}번째 배분 금액`) }
  })

  const seen = new Set<string>()
  for (const a of allocations) {
    const key = `${a.transactionId ?? '-'}|${a.kind}`
    if (seen.has(key)) fail('같은 차수·구분에 두 번 배분할 수 없습니다')
    seen.add(key)
  }

  const total = allocations.reduce((s, a) => s + a.amountKrw, 0)
  if (total > amountKrw) {
    fail(`배분 합계 ${total.toLocaleString('ko-KR')}원이 이체 금액 ${amountKrw.toLocaleString('ko-KR')}원을 넘습니다`)
  }

  return { paidAt, direction, amountKrw, bankMemo, allocations }
}
