'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { TABLE, TABLE_WRAP, TH, TD, THEAD_ROW, CENTER, NUM, zebra } from '@/components/ui/table-style'

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

/**
 * 확정금액과 계산값이 어긋난 차수.
 *
 * 주황 카드에 주황 표머리로 세워 두었던 것을 회색조로 내렸다 — 화면에 색이 셋(초록·주황·빨강)
 * 있으면 어느 것이 급한지 알 수 없다. 여기 있는 것은 「확인이 필요한 것」이지
 * 「지금 돈이 잘못 나가는 것」이 아니라, 빨강은 쓰지 않는다.
 */
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
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          검증 이슈
          <span className="ml-1.5 font-normal text-muted-foreground">{visible.length}건</span>
        </h3>
        <span className="text-sm text-muted-foreground">행을 누르면 거래 상세로 갑니다</span>
      </div>

      <div className="rounded-md border bg-slate-50 px-4 py-3 text-sm">
        <p className="font-semibold">중간정산 계산 기준</p>
        <p className="mt-1">
          확정금액 = &#123; (수입금액<sub>USD</sub> × 통관환율 × (1 + 마진율)) + 통관비용 합계 &#125; × 1.10
          {' '}+ 해상운임 (부가세 별도 실비 청구)
        </p>
        <ul className="mt-1 space-y-0.5 text-muted-foreground">
          <li>· 통관환율은 입고 시 세관 신고 환율 기준입니다</li>
          <li>· 해상운임은 부가세 별도 실비 청구라 ×1.10 에서 제외합니다</li>
          <li>· 클로징환율(BOK)은 최종정산 환차손익에만 씁니다</li>
        </ul>
      </div>

      <div className={TABLE_WRAP}>
        <table className={TABLE}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={cn(TH, CENTER, 'w-[10%]')}>차수</th>
              <th className={cn(TH, NUM, 'w-[16%]')}>확정금액 (원)</th>
              <th className={TH}>이슈 내용</th>
              <th className={cn(TH, 'w-[10%]')} />
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr
                key={row.id}
                className={cn('cursor-pointer border-t hover:bg-slate-100/70', zebra(i))}
                onClick={() => router.push(`/transactions/${row.transaction_id}`)}
              >
                <td className={cn(TD, CENTER, 'font-semibold')}>{row.round_label}</td>
                <td className={cn(TD, NUM, 'tabular-nums')}>
                  {row.confirmed_amount_krw != null
                    ? Number(row.confirmed_amount_krw).toLocaleString('ko-KR')
                    : '-'}
                </td>
                <td className="px-3 py-2.5 align-middle text-muted-foreground">
                  {formatDiff(row.diff, row.round_label)}
                </td>
                <td className={cn(TD, CENTER)}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void handleConfirm(row.id) }}
                    className="whitespace-nowrap rounded-md border bg-white px-2 py-1 hover:bg-slate-100"
                  >
                    확인했음
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
