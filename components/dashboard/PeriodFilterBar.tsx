'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const thisYear = new Date().getFullYear()

export function PeriodFilterBar({ from, to, earliestYear }: {
  from: string
  to: string
  earliestYear: number
}) {
  const router = useRouter()
  const years = Array.from(
    { length: thisYear - earliestYear + 1 },
    (_, i) => String(thisYear - i)
  )

  function go(nextFrom: string, nextTo: string) {
    router.push(`/dashboard?from=${nextFrom}&to=${nextTo}`)
  }

  const presets: { label: string; from: string; to: string }[] = [
    { label: '전체', from: String(earliestYear), to: String(thisYear) },
    { label: '최근 3년', from: String(thisYear - 2), to: String(thisYear) },
    { label: `${thisYear}년`, from: String(thisYear), to: String(thisYear) },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={from}
        onChange={(e) => go(e.target.value, e.target.value > to ? e.target.value : to)}
        className="rounded-md border bg-white px-3 py-1.5 text-sm"
        aria-label="시작 연도"
      >
        {years.map((y) => <option key={y} value={y}>{y}년</option>)}
      </select>
      <span className="text-sm text-muted-foreground">~</span>
      <select
        value={to}
        onChange={(e) => go(e.target.value < from ? e.target.value : from, e.target.value)}
        className="rounded-md border bg-white px-3 py-1.5 text-sm"
        aria-label="종료 연도"
      >
        {years.map((y) => <option key={y} value={y}>{y}년</option>)}
      </select>

      <div className="flex gap-1 ml-2">
        {presets.map((p) => {
          const active = p.from === from && p.to === to
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => go(p.from, p.to)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-sm transition-colors',
                active ? 'bg-slate-800 font-semibold text-white' : 'bg-white hover:bg-muted',
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
