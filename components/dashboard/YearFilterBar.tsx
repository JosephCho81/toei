'use client'

import { useRouter } from 'next/navigation'

const thisYear = new Date().getFullYear()
const YEARS = Array.from({ length: thisYear - 2020 }, (_, i) => String(thisYear - i))

export function YearFilterBar({ currentYear }: { currentYear?: string }) {
  const router = useRouter()

  return (
    <select
      value={currentYear ?? '2026'}
      onChange={(e) => router.push(`/dashboard?year=${e.target.value}`)}
      className="px-3 py-2 text-sm rounded focus:outline-none focus:ring-2"
      style={{
        border: '1.5px solid #4CAF50',
        color: '#2E7D32',
        backgroundColor: '#fff',
      }}
    >
      {YEARS.map((y) => (
        <option key={y} value={y}>{y}년</option>
      ))}
    </select>
  )
}
