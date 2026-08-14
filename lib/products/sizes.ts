/** 품목 마스터 기반 사이즈 자동입력 규칙. */

export const DEFAULT_SIZE_SEQUENCE = ['S', 'M', 'L']
/** 라텍스·니트릴은 XS부터 시작 (담당자 요청 기준). */
export const XS_FIRST_SIZE_SEQUENCE = ['XS', 'S', 'M', 'L']

const XS_FIRST_TYPES = ['라텍스', '니트릴', 'latex', 'nitrile']

/** 품목에 등록된 순서가 있으면 그것을, 없으면 재질 기준 기본 순서를 쓴다. */
export function sizeSequenceFor(
  sequence: string[] | null | undefined,
  gloveType: string | null | undefined,
): string[] {
  if (sequence && sequence.length) return sequence
  const t = (gloveType ?? '').trim().toLowerCase()
  return XS_FIRST_TYPES.some((x) => t === x.toLowerCase()) ? XS_FIRST_SIZE_SEQUENCE : DEFAULT_SIZE_SEQUENCE
}

/**
 * 이미 쓰인 사이즈를 제외한 다음 사이즈.
 * 순서를 다 썼으면 빈 문자열(직접 입력)을 돌려준다.
 */
export function nextSize(sequence: string[], usedSizes: (string | null | undefined)[]): string {
  const used = new Set(usedSizes.filter(Boolean).map((s) => String(s).trim().toUpperCase()))
  return sequence.find((s) => !used.has(s.trim().toUpperCase())) ?? ''
}
