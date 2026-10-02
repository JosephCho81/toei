/**
 * 메모를 마지막으로 저장한 계정·날짜 (043 `note_meta`, 트리거가 찍는다).
 *
 * 메모 글 안에 붙이지 않고 펼쳤을 때만 작게 보인다 — 칸이 길어지는 것을 막으려고
 * 따로 저장했다 (사용자 2026-10-02).
 */

export type NoteMeta = Record<string, { by: string | null; at: string } | undefined>

const WHO: Record<string, string> = {
  a1_admin: '에이원',
  a1_user: '에이원',
  toei_user: '토에이',
}

/** 한국 시간 날짜 'YYYY-MM-DD'. 서버·브라우저 시간대와 무관하게 같은 날짜가 나와야 한다 */
function kstDate(iso: string): string {
  return new Date(Date.parse(iso) + 9 * 3_600_000).toISOString().slice(0, 10)
}

/**
 * 「토에이 · 10-02」. 올해가 아니면 「토에이 · 25-10-02」.
 * 기록이 없으면(043 이전 메모) null — 지어내지 않는다.
 */
export function noteStamp(meta: NoteMeta | null | undefined, column: string, today: string): string | null {
  const m = meta?.[column]
  if (!m?.at) return null
  const date = kstDate(m.at)
  const shown = date.slice(0, 4) === today.slice(0, 4) ? date.slice(5) : date.slice(2)
  const who = m.by ? WHO[m.by] : undefined
  return who ? `${who} · ${shown}` : shown
}
