'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FileText, Building2, LogOut, Wallet, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * 사이드바는 「답하는 질문이 다른 화면」만 세운다.
 * 같은 질문을 대상만 바꿔 묻는 것(정산 3구분·기준정보 2종)은 화면 안 탭이 이미 가르고 있어
 * 여기에 다시 늘어놓으면 그 탭 바를 그대로 복제하는 꼴이 된다.
 *
 * `match` 는 활성 표시를 넓히는 접두사다 — 탭으로 옆 화면에 가도 메뉴가 꺼지지 않게 한다.
 */
const navItems = [
  { href: '/payments', label: '지급 현황', icon: Wallet, match: ['/payments'] },
  // 중간·최종·지체상금은 CompareScreen 의 탭이 가른다
  { href: '/settlements/interim', label: '정산 대사', icon: Scale, match: ['/settlements'] },
  { href: '/dashboard', label: '정산 현황', icon: LayoutDashboard, match: ['/dashboard'] },
  { href: '/transactions', label: '거래 목록', icon: FileText, match: ['/transactions'] },
  // 제조사·품목 마스터는 MasterTabs 가 가른다
  { href: '/manufacturers', label: '기준정보', icon: Building2, match: ['/manufacturers', '/products'] },
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
        {navItems.map(({ href, label, icon: Icon, match }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              match.some((m) => pathname === m || pathname.startsWith(`${m}/`))
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
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
