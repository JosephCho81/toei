/**
 * 계정 역할 — 2026-10-01 직원 요청.
 *
 *   a1_admin · a1_user : 한국에이원 — 입력·계산
 *   toei_user          : 토에이 — 읽기 + 메모(정산 비고·지급 비고·거래 메모·오류 체크).
 *                        계산금액 차이 사유는 에이원만 적는다 (044)
 *
 * 화면에서 감추는 것은 편의일 뿐이고 실제로 막는 곳은 DB(041 RLS + 040 칸 제한 트리거)다.
 * 역할은 app_metadata 에서만 읽는다 — user_metadata 는 본인이 고칠 수 있어 역할을 담으면
 * 토에이 계정이 스스로 관리자가 된다.
 */
export type Role = 'a1_admin' | 'a1_user' | 'toei_user'

const ROLES: readonly Role[] = ['a1_admin', 'a1_user', 'toei_user']

/** 로그인 화면은 ID 만 받는다. Supabase Auth 는 이메일을 요구해 내부 도메인을 붙인다 */
export const LOGIN_DOMAIN = 'toei.local'

export function loginEmail(id: string): string {
  const v = id.trim().toLowerCase()
  return v.includes('@') ? v : `${v}@${LOGIN_DOMAIN}`
}

export function roleOf(user: { app_metadata?: Record<string, unknown> } | null | undefined): Role | null {
  const r = user?.app_metadata?.role
  return typeof r === 'string' && (ROLES as readonly string[]).includes(r) ? (r as Role) : null
}

/** 금액·항목·지급 등 메모 아닌 모든 입력 */
export function canEdit(role: Role | null): boolean {
  return role === 'a1_admin' || role === 'a1_user'
}

/** 메모 칸 — 양사가 같이 보고 같이 적는다 */
export function canEditNotes(role: Role | null): boolean {
  return canEdit(role) || role === 'toei_user'
}

export const ROLE_LABEL: Record<Role, string> = {
  a1_admin: '한국에이원',
  a1_user: '한국에이원',
  toei_user: '토에이 (읽기 전용)',
}

/**
 * 토에이 계정이 들어오면 안 되는 화면 → 대신 보낼 곳. 입력 전용 화면이라 읽을 것이 없거나
 * (신규·수정), 내부 운영 화면이다(설정·감사 로그·검증·기준정보).
 * 정산 입력 화면은 같은 내용을 읽기 전용으로 보여 주는 정산 리포트로 보낸다.
 */
export function toeiRedirect(pathname: string): string | null {
  const tx = pathname.match(/^\/transactions\/([^/]+)\/(edit|interim|closing)\/?$/)
  if (tx && tx[1] !== 'new') return tx[2] === 'edit' ? `/transactions/${tx[1]}` : `/transactions/${tx[1]}/report`
  if (pathname === '/transactions/new' || pathname.startsWith('/transactions/new/')) return '/transactions'
  const blocked = ['/settings', '/audit-logs', '/verification', '/manufacturers', '/products']
  if (blocked.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return '/payments'
  return null
}
