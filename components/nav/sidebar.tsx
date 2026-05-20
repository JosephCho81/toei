'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FileText, Building2, LogOut, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: '정산 현황', icon: LayoutDashboard, badge: null },
  { href: '/transactions', label: '거래 목록', icon: FileText, badge: null },
  { href: '/manufacturers', label: '제조사', icon: Building2, badge: null },
  { href: '/verification', label: '검증 리포트', icon: ClipboardList, badge: '임시' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 min-h-screen border-r bg-card flex flex-col">
      <div className="px-4 py-5 border-b">
        <h1 className="text-sm font-semibold leading-tight">수입 정산 시스템</h1>
        <p className="text-xs text-muted-foreground mt-0.5">토에이↔에이원</p>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon, badge }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === href || (href !== '/' && pathname.startsWith(href))
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && <span className="text-xs text-orange-500 font-medium">({badge})</span>}
          </Link>
        ))}
      </nav>
      <div className="px-2 py-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          로그아웃
        </Button>
      </div>
    </aside>
  )
}
