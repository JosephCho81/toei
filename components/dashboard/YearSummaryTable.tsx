'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { YearSummary } from '@/lib/data/dashboard'

/** 연도별 수입 건수·금액. 행을 누르면 그 해만 보도록 기간이 좁혀진다. */
export function YearSummaryTable({ summaries }: { summaries: YearSummary[] }) {
  const router = useRouter()
  if (summaries.length === 0) return null

  return (
    <Card className="border-green-200">
      <CardHeader className="pb-2 border-l-4 pl-3" style={{ borderColor: '#4CAF50' }}>
        <CardTitle className="text-base" style={{ color: '#2E7D32' }}>연도별 수입 실적</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#E8F5E9' }}>
              <th className="text-left px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>연도</th>
              <th className="text-right px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>건수</th>
              <th className="text-right px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>수입금액</th>
              <th className="text-right px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>정산 완료</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s, i) => (
              <tr
                key={s.year}
                onClick={() => router.push(`/dashboard?from=${s.year}&to=${s.year}`)}
                className="border-b last:border-0 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: i % 2 === 1 ? '#F1F8E9' : '#ffffff' }}
              >
                <td className="px-4 py-2 font-semibold" style={{ color: '#2E7D32' }}>{s.year}년</td>
                <td className="px-4 py-2 text-right font-mono">{s.count}건</td>
                <td className="px-4 py-2 text-right font-mono">
                  ${Math.round(s.totalUsd).toLocaleString('en-US')}
                </td>
                <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                  {s.closingDone} / {s.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
