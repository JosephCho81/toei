'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * 기준정보 탭. 제조사·품목 마스터는 거래 입력을 받쳐 주는 같은 종류의 표라
 * 사이드바 두 칸을 먹을 이유가 없다 — 정산 3화면과 같은 방식으로 화면 안에서 가른다.
 */
const TABS = [
  { href: '/manufacturers', label: '제조사' },
  { href: '/products', label: '품목 마스터' },
]

export function MasterTabs() {
  const pathname = usePathname()

  return (
    <div className="inline-flex overflow-hidden rounded-md border text-sm">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            'border-l px-4 py-1.5 first:border-l-0',
            pathname === t.href ? 'bg-slate-800 font-semibold text-white' : 'hover:bg-muted',
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
