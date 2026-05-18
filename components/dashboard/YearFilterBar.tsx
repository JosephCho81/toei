'use client'

import { useRouter } from 'next/navigation'

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 2020 }, (_, i) => String(2021 + i))

export function YearFilterBar({ currentYear }: { currentYear?: string }) {
  const router = useRouter()

  return (
    <select
      value={currentYear ?? ''}
      onChange={(e) => router.push(e.target.value ? `/dashboard?year=${e.target.value}` : '/dashboard')}
      className="px-3 py-2 text-sm rounded focus:outline-none focus:ring-2"
      style={{
        border: '1.5px solid #4CAF50',
        color: '#2E7D32',
        backgroundColor: '#fff',
      }}
    >
      <option value="">전체 연도</option>
      {YEARS.map((y) => (
        <option key={y} value={y}>{y}년</option>
      ))}
    </select>
  )
}
