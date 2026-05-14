import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { UserManagement } from '@/components/settings/UserManagement'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // auth 활성화 시: a1_admin만 접근 가능
  if (user && user.user_metadata?.role !== 'a1_admin') redirect('/transactions')

  type UserData = { id: string; email?: string; user_metadata: Record<string, string>; banned_until?: string | null; created_at: string }
  let users: UserData[] = []
  try {
    const admin = createAdminClient()
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    users = (data?.users ?? []) as UserData[]
  } catch {
    // SUPABASE_SERVICE_ROLE_KEY 미설정
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">사용자 관리</h2>
        <Link href="/settings/audit" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          감사 로그
        </Link>
      </div>
      <UserManagement initialUsers={users} />
    </div>
  )
}
