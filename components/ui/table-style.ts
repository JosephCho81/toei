/**
 * 표 한 칸의 규칙. **지급 현황이 정한 것을 나머지 화면이 그대로 쓴다** —
 * 담당자 2026-09-07: 「지급현황, 정산 비교의 디자인과 정산 현황, 거래 목록,
 * 기준 정보의 디자인이 달라. 지급현황에 맞게 해줘」.
 *
 * 화면마다 표 스타일을 따로 들고 있으면 초록 헤더·회색 헤더가 한 시스템 안에 공존하고,
 * 고칠 때도 다섯 군데를 고쳐야 한다. 규칙은 여기 하나뿐이다.
 *
 * 색 규칙: **초록은 화면 제목만, 빨강은 손댈 곳만, 나머지는 전부 회색조.**
 * 숫자는 `font-mono` 가 아니라 `tabular-nums` 로 자릿수를 맞춘다 —
 * 본문 서체를 유지한 채 세로줄만 서게 하려는 것이다.
 */

/**
 * 열이 여덟 이하일 때. 글자 열은 왼쪽이 기본이고,
 * 숫자·가운데 정렬은 `NUM`·`CENTER` 로 덮어쓴다 (뒤에 오는 클래스가 이긴다).
 */
export const TH = 'px-3 py-2.5 text-left font-semibold whitespace-nowrap text-slate-600'
export const TD = 'px-3 py-2.5 whitespace-nowrap align-middle'

/** 열이 아홉 이상이면 좌우 여백을 줄인다 (정산 비교 표) */
export const TH_TIGHT = 'px-2.5 py-2.5 text-left font-semibold whitespace-nowrap text-slate-600'
export const TD_TIGHT = 'px-2.5 py-2.5 whitespace-nowrap align-middle'

/** 금액은 오른쪽으로 붙여야 자릿수가 세로로 선다. 글자 열은 가운데. */
export const NUM = 'text-right'
export const CENTER = 'text-center'

export const TABLE_WRAP = 'overflow-x-auto rounded-md border'
export const TABLE = 'w-full border-collapse text-sm'
export const THEAD_ROW = 'border-b bg-slate-50'

/** 홀수 줄에만 아주 옅은 바탕. 줄을 세는 눈이 미끄러지지 않을 만큼만. */
export function zebra(i: number): string {
  return i % 2 === 1 ? 'bg-slate-50/60' : ''
}
