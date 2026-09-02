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

  const selectStyle = {
    border: '1.5px solid #4CAF50',
    color: '#2E7D32',
    backgroundColor: '#fff',
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={from}
        onChange={(e) => go(e.target.value, e.target.value > to ? e.target.value : to)}
        className="px-3 py-1.5 text-sm rounded focus:outline-none focus:ring-2"
        style={selectStyle}
        aria-label="시작 연도"
      >
        {years.map((y) => <option key={y} value={y}>{y}년</option>)}
      </select>
      <span className="text-sm text-muted-foreground">~</span>
      <select
        value={to}
        onChange={(e) => go(e.target.value < from ? e.target.value : from, e.target.value)}
        className="px-3 py-1.5 text-sm rounded focus:outline-none focus:ring-2"
        style={selectStyle}
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
                'px-2.5 py-1 text-xs rounded border transition-colors',
                active ? 'font-semibold' : 'hover:bg-green-50'
              )}
              style={active
                ? { backgroundColor: '#4CAF50', borderColor: '#388E3C', color: '#fff' }
                : { borderColor: '#C8E6C9', color: '#388E3C' }}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
