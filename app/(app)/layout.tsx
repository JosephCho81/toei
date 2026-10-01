import { Sidebar } from '@/components/nav/sidebar'
import { RoleProvider } from '@/components/auth/RoleProvider'
import { createClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const role = await getRole(await createClient())
  return (
    <RoleProvider role={role}>
      <div className="flex min-h-screen print:min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto print:overflow-visible">
          <div className="container max-w-7xl mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </RoleProvider>
  )
}
