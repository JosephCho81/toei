import Link from 'next/link'
import { cn } from '@/lib/utils'
import { BlLink } from '@/components/tracking/BlLink'
import { TABLE, TABLE_WRAP, TH, TD, THEAD_ROW, CENTER, NUM, zebra } from '@/components/ui/table-style'
import { StatusBadge } from './StatusBadge'
import { SettlementDateCell } from './SettlementDateCell'
import type { DashboardRow } from '@/lib/data/dashboard'

/** 'YYYY-MM-DD' → 'MM/DD' */
function short(date: string | null): string {
  return date ? `${date.slice(5, 7)}/${date.slice(8, 10)}` : '-'
}

/**
 * 기간 내 거래 전부를 한 줄씩. 물류(B/L·ETD·ETA)와 정산 일정(LC개설·중간·최종)을
 * 같은 행에 두어 "어떻게 진행돼서 어떻게 마무리됐는지"가 한눈에 보이게 한다.
 *
 * 표 규칙은 지급 현황과 같은 것(`table-style`)을 쓴다 — 초록 헤더와 초록 얼룩말을
 * 걷어낸 이유는, 같은 시스템의 표 다섯 개가 서로 다르게 생기면 읽는 사람이
 * 매번 새 표를 배워야 하기 때문이다.
 */
export function TransactionOverviewTable({ rows }: { rows: DashboardRow[] }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          거래 현황
          <span className="ml-1.5 font-normal text-muted-foreground">{rows.length}건</span>
        </h3>
        <Link href="/transactions" className="text-sm underline underline-offset-2 text-muted-foreground">
          거래 목록에서 품목·금액 보기
        </Link>
      </div>

      <div className={TABLE_WRAP}>
        <table className={TABLE}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={cn(TH, CENTER)}>회차</th>
              <th className={cn(TH, CENTER)}>제조사</th>
              <th className={cn(TH, NUM)}>수입금액</th>
              <th className={cn(TH, CENTER)}>B/L</th>
              <th className={cn(TH, CENTER)}>ETD</th>
              <th className={cn(TH, CENTER)}>ETA</th>
              <th className={cn(TH, CENTER)}>LC 개설</th>
              <th className={cn(TH, CENTER)}>중간정산</th>
              <th className={cn(TH, CENTER)}>최종정산</th>
              <th className={cn(TH, CENTER)}>상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={cn('border-b last:border-0', zebra(i))}>
                <td className={cn(TD, CENTER, 'font-semibold')}>
                  <Link href={`/transactions/${r.id}`} className="hover:underline">
                    {r.roundLabel}
                  </Link>
                </td>
                <td className={cn(TD, CENTER, 'text-muted-foreground')}>{r.manufacturer ?? '-'}</td>
                <td className={cn(TD, NUM, 'tabular-nums')}>
                  ${Math.round(r.importAmountUsd).toLocaleString('en-US')}
                </td>
                <td className={cn(TD, CENTER)}>
                  <BlLink blNo={r.blNo} mblNo={r.mblNo} carrierName={r.carrierName} />
                </td>
                <td className={cn(TD, CENTER, 'tabular-nums text-muted-foreground')}>{short(r.etd)}</td>
                <td className={cn(TD, CENTER, 'tabular-nums text-muted-foreground')}>{short(r.eta)}</td>
                <td className={cn(TD, CENTER, 'tabular-nums')}>{short(r.lcOpenDate)}</td>
                <td className={cn(TD, CENTER)}>
                  <SettlementDateCell
                    due={r.interimDue} actual={r.interimActual}
                    state={r.interimState} applicable={r.scheduleApplicable}
                  />
                </td>
                <td className={cn(TD, CENTER)}>
                  <SettlementDateCell
                    due={r.closingDue} actual={r.closingActual}
                    state={r.closingState} applicable={r.scheduleApplicable}
                  />
                </td>
                <td className={cn(TD, CENTER)}><StatusBadge status={r.settlementStatus} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  선택한 기간에 LC 개설일이 있는 거래가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        정산일은 LC 개설일 +165일(중간) / +180일(최종) 기준이며 휴일이면 직전 영업일로 당겨 표시합니다.
        실제 정산이 끝난 건은 실제 정산일을 보여줍니다. 2025-06 이전 개설분은 공식이 미확정이라 &lsquo;미확정&rsquo;입니다.
      </p>
    </div>
  )
}
