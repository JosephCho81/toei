/** 품목 마스터 기반 사이즈 자동입력 규칙. */

export const DEFAULT_SIZE_SEQUENCE = ['S', 'M', 'L']
/** XS 부터 시작하는 품목의 사이즈 순서. */
export const XS_FIRST_SIZE_SEQUENCE = ['XS', 'S', 'M', 'L']

/**
 * XS 가 있는 품목은 A1 라텍스·A1 니트릴 뿐이다(담당자 확인).
 * 원칙은 품목 마스터의 '사이즈 순서'를 따르는 것이고,
 * 마스터에 아직 등록되지 않은 품목만 이 패턴으로 보조한다.
 */
const XS_NAME_PATTERN = /a\s*1/i
const XS_MATERIAL_PATTERN = /라텍스|니트릴|latex|nitrile/i

function hasXsByName(name: string | null | undefined): boolean {
  const n = (name ?? '').trim()
  if (!n) return false
  return XS_NAME_PATTERN.test(n) && XS_MATERIAL_PATTERN.test(n)
}

/**
 * 품목에 등록된 순서가 있으면 그것을, 없으면 품목명 기준 기본 순서를 쓴다.
 * 재질(라텍스/니트릴)만으로는 XS 를 붙이지 않는다 — A1 제품에만 XS 가 있기 때문.
 */
export function sizeSequenceFor(
  sequence: string[] | null | undefined,
  productName: string | null | undefined,
): string[] {
  if (sequence && sequence.length) return sequence
  return hasXsByName(productName) ? XS_FIRST_SIZE_SEQUENCE : DEFAULT_SIZE_SEQUENCE
}

const norm = (s: string | null | undefined) => String(s ?? '').trim().toUpperCase()

/**
 * 다음 행에 채울 사이즈.
 * 마지막으로 입력된 사이즈의 **다음 순서**부터 찾는다.
 * (S 를 직접 고른 뒤 행을 추가했을 때 XS 로 되돌아가던 오류 수정)
 * 순서를 다 썼으면 빈 문자열(직접 입력)을 돌려준다.
 */
export function nextSize(sequence: string[], usedSizes: (string | null | undefined)[]): string {
  const used = usedSizes.map(norm).filter(Boolean)
  const usedSet = new Set(used)
  const last = used[used.length - 1]
  const lastIdx = last ? sequence.findIndex((s) => norm(s) === last) : -1

  // 마지막 사이즈가 순서에 있으면 그 뒤에서만 찾는다 (앞으로 되돌아가지 않는다)
  if (lastIdx >= 0) {
    return sequence.slice(lastIdx + 1).find((s) => !usedSet.has(norm(s))) ?? ''
  }
  return sequence.find((s) => !usedSet.has(norm(s))) ?? ''
}
