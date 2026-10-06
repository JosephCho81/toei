import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { roleOf } from '@/lib/auth/role'

/**
 * 관리자 키(service role)를 쓰는 라우트의 문지기. proxy 는 /api/* 를 로그인 검사 밖에 두므로
 * 여기서 막지 않으면 주소만 알면 계정 목록·초대·차단이 열린다. 역할은 app_metadata 에서만 읽는다.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  if (roleOf(user) !== 'a1_admin') return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
  return null
}
