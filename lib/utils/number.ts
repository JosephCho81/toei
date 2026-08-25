/**
 * 화면 입력값을 숫자로 바꿀 때 쓰는 결정적 변환·검증.
 * parseInt/parseFloat 를 그대로 쓰면 '12.7' → 12, '1e5' → 1 처럼 조용히 잘려
 * 수량·금액이 틀린 채 저장된다. 금액·재고 직결 값은 반드시 여기를 거친다.
 */

/** 정수만 허용(0 이상). 소수·음수·빈값·비숫자는 null. */
export function parseIntegerStrict(value: string | null | undefined): number | null {
  const s = String(value ?? '').trim()
  if (!/^\d+$/.test(s)) return null
  const n = Number(s)
  return Number.isSafeInteger(n) ? n : null
}

/** 원화 금액 — 소수점 입력은 반올림해서 정수로. 비숫자는 0. */
export function parseKrwAmount(value: string | null | undefined): number {
  const n = parseFloat(String(value ?? ''))
  return Number.isFinite(n) ? Math.round(n) : 0
}

/** 달러 등 소수 허용 금액. 비숫자는 null. */
export function parseDecimal(value: string | null | undefined): number | null {
  const s = String(value ?? '').trim()
  if (s === '') return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}
