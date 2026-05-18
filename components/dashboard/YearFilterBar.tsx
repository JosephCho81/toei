'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

const YEARS = ['2021', '2022', '2023', '2024', '2025']

export function YearFilterBar({ currentYear }: { currentYear?: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Link
        href="/dashboard"
        className={cn(
          'px-3 py-1.5 rounded text-sm font-medium transition-colors',
          !currentYear ? 'text-white' : 'border border-green-300 hover:bg-green-50',
        )}
        style={!currentYear ? { backgroundColor: '#2E7D32' } : { color: '#2E7D32' }}
      >
        전체
      </Link>
      {YEARS.map((year) => (
        <Link
          key={year}
          href={`/dashboard?year=${year}`}
          className={cn(
            'px-3 py-1.5 rounded text-sm font-medium transition-colors',
            currentYear === year ? 'text-white' : 'border border-green-300 hover:bg-green-50',
          )}
          style={currentYear === year ? { backgroundColor: '#2E7D32' } : { color: '#2E7D32' }}
        >
          {year}
        </Link>
      ))}
    </div>
  )
}
