'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type VerRow = {
  id: string
  notes: string | null
  confirmed_amount_krw: number | null
  round_label: string
  transaction_id: string
  diff: number | null
}

function formatDiff(diff: number | null): string {
  if (diff == null) return '-'
  const abs = Math.round(Math.abs(diff))
  const formatted = abs.toLocaleString('ko-KR')
  if (diff < -100) {
    return `계산값 대비 ${formatted}원 초과 지급. 수입금액 또는 통관환율 소수점 불일치. 실지불 확정액 유지.`
  }
  if (diff > 100) {
    return `계산값 대비 ${formatted}원 미달. 원인 미확정. 실지불 확정액 유지.`
  }
  return '계산값과 일치 (소수점 반올림 차이 이내)'
}

export function VerificationIssueCard({ rows }: { rows: VerRow[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const router = useRouter()

  const visible = rows.filter((r) => !hidden.has(r.id))
  if (visible.length === 0) return null

  async function handleConfirm(id: string) {
    const res = await fetch(`/api/interim-settlements/${id}/confirm-issue`, { method: 'PATCH' })
    if (res.ok) {
      setHidden((prev) => new Set([...prev, id]))
    }
  }

  return (
    <Card style={{ borderColor: '#FFB74D' }}>
      <CardHeader className="pb-2" style={{ backgroundColor: '#FFF3E0', borderRadius: '0.5rem 0.5rem 0 0' }}>
        <CardTitle className="text-base flex items-center gap-2" style={{ color: '#E65100' }}>
          ⚠️ 검증 이슈 차수
          <span className="text-xs font-normal text-orange-500">행 클릭 시 거래 상세로 이동</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#FFE0B2' }}>
              <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: '#E65100' }}>차수</th>
              <th className="text-right px-4 py-2 text-xs font-medium" style={{ color: '#E65100' }}>확정금액</th>
              <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: '#E65100' }}>이슈 내용</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                className="border-t cursor-pointer hover:bg-orange-50 transition-colors"
                style={{ borderColor: '#FFE0B2' }}
                onClick={() => router.push(`/transactions/${row.transaction_id}`)}
              >
                <td className="px-4 py-2 font-semibold" style={{ color: '#BF360C' }}>
                  {row.round_label}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">
                  {row.confirmed_amount_krw != null
                    ? `${Number(row.confirmed_amount_krw).toLocaleString('ko-KR')}원`
                    : '-'}
                </td>
                <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>
                  {formatDiff(row.diff)}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); void handleConfirm(row.id) }}
                    className="text-xs text-green-700 border border-green-300 rounded px-2 py-1 hover:bg-green-50 whitespace-nowrap transition-colors"
                  >
                    확인했음
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
