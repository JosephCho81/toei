'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type VerRow = {
  id: string
  notes: string | null
  confirmed_amount_krw: number | null
  round_label: string
  transaction_id: string
  diff: number | null
}

function formatDiff(diff: number | null, roundLabel: string): string {
  if (diff == null) return '-'
  const abs = Math.round(Math.abs(diff))
  const formatted = abs.toLocaleString('ko-KR')

  // 27차 특수 케이스
  if (roundLabel === '27차') {
    return `한국에이원이 토에이산교에 계산값보다 ${formatted}원 초과 지급. 엑셀 기준 누락 비용 항목 추정. 원인 미확정. 실지불 확정액 유지.`
  }

  if (diff < -100) {
    return `한국에이원이 토에이산교에 계산값보다 ${formatted}원 초과 지급. 수입금액(USD) 또는 통관환율 소수점 입력값과 DB 저장값 차이에서 발생. 실지불 확정액 유지.`
  }
  if (diff > 100) {
    return `한국에이원이 토에이산교에 계산값보다 ${formatted}원 미달 지급. 수입금액(USD) 또는 통관환율 소수점 입력값과 DB 저장값 차이에서 발생. 실지불 확정액 유지.`
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
          ⚠️ 검증 이슈
          <span className="text-xs font-normal text-orange-500">행 클릭 시 거래 상세로 이동</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-4 py-3 flex items-start gap-2 text-sm" style={{ backgroundColor: '#F0F7F0', borderBottom: '1px solid #A5D6A7' }}>
          <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#388E3C' }} />
          <div style={{ color: '#1B5E20' }}>
            <span className="font-semibold">중간정산 계산 기준</span>
            <br />
            확정금액 = &#123; (수입금액<sub>USD</sub> × 통관환율 × (1 + 마진율)) + 통관비용 합계 &#125; × 1.10
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#FFE0B2' }}>
              <th className="text-center px-4 py-2 text-xs font-medium" style={{ color: '#E65100' }}>차수</th>
              <th className="text-center px-4 py-2 text-xs font-medium" style={{ color: '#E65100' }}>확정금액</th>
              <th className="text-center px-4 py-2 text-xs font-medium" style={{ color: '#E65100' }}>이슈 내용</th>
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
                <td className="px-4 py-2 font-semibold text-center" style={{ color: '#BF360C' }}>
                  {row.round_label}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">
                  {row.confirmed_amount_krw != null
                    ? `${Number(row.confirmed_amount_krw).toLocaleString('ko-KR')}원`
                    : '-'}
                </td>
                <td className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>
                  {formatDiff(row.diff, row.round_label)}
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
