import type { SupabaseClient } from '@supabase/supabase-js'
import { roleOf, type Role } from './role'

/** 서버 컴포넌트에서 지금 로그인한 계정의 역할 */
export async function getRole(supabase: SupabaseClient): Promise<Role | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return roleOf(user)
}
