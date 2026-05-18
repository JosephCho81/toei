'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type VerRow = {
  id: string
  notes: string | null
  confirmed_amount_krw: number | null
  round_label: string
}

function parseIssueNote(notes: string | null): string {
  if (!notes) return '-'
  if (notes.includes('소수점')) {
    return '수입금액 또는 통관환율 소수점 차이로 인한 미세 불일치. 실지불 확정액 유지.'
  }
  if (notes.includes('1,119,460') || notes.includes('1.1M')) {
    return '계산값 대비 약 112만원 차이. 원인 미확정, 실지불 확정액 유지.'
  }
  return '-'
}

export function VerificationIssueCard({ rows }: { rows: VerRow[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

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
              <tr key={row.id} className="border-t" style={{ borderColor: '#FFE0B2' }}>
                <td className="px-4 py-2 font-semibold" style={{ color: '#BF360C' }}>
                  {row.round_label}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">
                  {row.confirmed_amount_krw != null
                    ? `${Number(row.confirmed_amount_krw).toLocaleString('ko-KR')}원`
                    : '-'}
                </td>
                <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>
                  {parseIssueNote(row.notes)}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => handleConfirm(row.id)}
                    className="text-xs text-green-700 border border-green-300 rounded px-2 py-1 hover:bg-green-50 whitespace-nowrap transition-colors"
                  >
                    ✓ 확인 완료
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
