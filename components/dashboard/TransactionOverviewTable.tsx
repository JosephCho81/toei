import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'
import { BlLink } from '@/components/tracking/BlLink'
import { StatusBadge } from './StatusBadge'
import { SettlementDateCell } from './SettlementDateCell'
import type { DashboardRow } from '@/lib/data/dashboard'

/** 'YYYY-MM-DD' → 'MM/DD' */
function short(date: string | null): string {
  return date ? `${date.slice(5, 7)}/${date.slice(8, 10)}` : '-'
}

const TH = 'px-3 py-2 font-medium text-xs whitespace-nowrap'

/**
 * 기간 내 거래 전부를 한 줄씩. 물류(B/L·ETD·ETA)와 정산 일정(LC개설·중간·최종)을
 * 같은 행에 두어 "어떻게 진행돼서 어떻게 마무리됐는지"가 한눈에 보이게 한다.
 */
export function TransactionOverviewTable({ rows }: { rows: DashboardRow[] }) {
  return (
    <Card className="border-green-200">
      <CardHeader
        className="pb-2 flex flex-row items-center justify-between border-l-4 pl-3"
        style={{ borderColor: '#4CAF50' }}
      >
        <CardTitle className="text-base" style={{ color: '#2E7D32' }}>
          거래 현황 <span className="text-xs font-normal text-muted-foreground">({rows.length}건)</span>
        </CardTitle>
        <Link
          href="/transactions"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hover:bg-green-50')}
          style={{ color: '#4CAF50' }}
        >
          거래 목록 <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#E8F5E9', color: '#2E7D32' }}>
                <th className={cn(TH, 'text-left')}>회차</th>
                <th className={cn(TH, 'text-left')}>제조사</th>
                <th className={cn(TH, 'text-right')}>수입금액</th>
                <th className={cn(TH, 'text-left')}>B/L</th>
                <th className={cn(TH, 'text-center')}>ETD</th>
                <th className={cn(TH, 'text-center')}>ETA</th>
                <th className={cn(TH, 'text-center')}>LC 개설</th>
                <th className={cn(TH, 'text-center')}>중간정산</th>
                <th className={cn(TH, 'text-center')}>최종정산</th>
                <th className={cn(TH, 'text-center')}>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b last:border-0"
                  style={{ backgroundColor: i % 2 === 1 ? '#F1F8E9' : '#ffffff' }}
                >
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">
                    <Link href={`/transactions/${r.id}`} className="hover:underline" style={{ color: '#2E7D32' }}>
                      {r.roundLabel}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.manufacturer ?? '-'}</td>
                  <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                    ${Math.round(r.importAmountUsd).toLocaleString('en-US')}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <BlLink blNo={r.blNo} mblNo={r.mblNo} carrierName={r.carrierName} containerNo={r.containerNo} />
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-xs text-muted-foreground">{short(r.etd)}</td>
                  <td className="px-3 py-2 text-center font-mono text-xs text-muted-foreground">{short(r.eta)}</td>
                  <td className="px-3 py-2 text-center font-mono text-xs">{short(r.lcOpenDate)}</td>
                  <td className="px-3 py-2 text-center">
                    <SettlementDateCell
                      due={r.interimDue} actual={r.interimActual}
                      state={r.interimState} applicable={r.scheduleApplicable}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <SettlementDateCell
                      due={r.closingDue} actual={r.closingActual}
                      state={r.closingState} applicable={r.scheduleApplicable}
                    />
                  </td>
                  <td className="px-3 py-2 text-center"><StatusBadge status={r.settlementStatus} /></td>
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
        <p className="px-3 py-2 text-xs text-muted-foreground border-t">
          정산일은 LC 개설일 +165일(중간) / +180일(최종) 기준이며 휴일이면 직전 영업일로 당겨 표시한다.
          실제 정산이 끝난 건은 실제 정산일을 보여준다. 2025-06 이전 개설분은 공식이 미확정이라 &lsquo;미확정&rsquo;.
        </p>
      </CardContent>
    </Card>
  )
}
