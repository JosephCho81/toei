import { formatKrw } from '@/lib/utils/format'

interface Props {
  currentMarginPct: number | null
  currentFxAbsKrw: number
  currentDays: number | null
  currentLcFeeRatePct: number | null
  avgMarginPct: number | null
  avgFxAbsKrw: number | null
  avgDays: number | null
  benchCount: number
}

function evalArrow(current: number | null, avg: number | null, higherIsBetter: boolean): string {
  if (current == null || avg == null) return '-'
  const better = higherIsBetter ? current > avg : current < avg
  return better ? '↑ 우수' : '↓ 미흡'
}

function evalColor(current: number | null, avg: number | null, higherIsBetter: boolean): string {
  if (current == null || avg == null) return 'text-muted-foreground'
  const better = higherIsBetter ? current > avg : current < avg
  return better ? 'text-green-700' : 'text-red-600'
}

export function ReportBenchmark({
  currentMarginPct, currentFxAbsKrw, currentDays, currentLcFeeRatePct,
  avgMarginPct, avgFxAbsKrw, avgDays, benchCount,
}: Props) {
  if (benchCount < 2) return null

  const rows: {
    label: string
    thisVal: string
    avgVal: string
    evalStr: string
    evalCls: string
  }[] = [
    {
      label: '마진율',
      thisVal: currentMarginPct != null ? `${currentMarginPct}%` : '-',
      avgVal: avgMarginPct != null ? `${avgMarginPct.toFixed(1)}%` : '-',
      evalStr: evalArrow(currentMarginPct, avgMarginPct, true),
      evalCls: evalColor(currentMarginPct, avgMarginPct, true),
    },
    {
      label: '환차손익 규모',
      thisVal: formatKrw(currentFxAbsKrw),
      avgVal: avgFxAbsKrw != null ? formatKrw(avgFxAbsKrw) : '-',
      evalStr: evalArrow(currentFxAbsKrw, avgFxAbsKrw, false),
      evalCls: evalColor(currentFxAbsKrw, avgFxAbsKrw, false),
    },
    {
      label: 'LC수수료율',
      thisVal: currentLcFeeRatePct != null ? `${currentLcFeeRatePct.toFixed(2)}%` : '-',
      avgVal: '-',
      evalStr: '-',
      evalCls: 'text-muted-foreground',
    },
    {
      label: '정산 소요일',
      thisVal: currentDays != null ? `${currentDays}일` : '-',
      avgVal: avgDays != null ? `${avgDays}일` : '-',
      evalStr: evalArrow(currentDays, avgDays, false),
      evalCls: evalColor(currentDays, avgDays, false),
    },
  ]

  return (
    <div className="mb-4 break-inside-avoid">
      <p className="text-xs font-semibold text-muted-foreground mb-2">
        전체 거래 벤치마크 비교 (확정 거래 {benchCount}건 기준)
      </p>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex text-xs font-semibold bg-gray-50 border-b border-gray-200">
          <div className="flex-1 px-3 py-2 text-muted-foreground">항목</div>
          <div className="w-32 px-3 py-2 text-right text-muted-foreground">이번 거래</div>
          <div className="w-32 px-3 py-2 text-right text-muted-foreground">전체 평균</div>
          <div className="w-20 px-3 py-2 text-center text-muted-foreground">평가</div>
        </div>
        {rows.map(r => (
          <div key={r.label} className="flex text-sm border-b border-gray-100 last:border-0">
            <div className="flex-1 px-3 py-2 text-muted-foreground">{r.label}</div>
            <div className="w-32 px-3 py-2 text-right font-mono">{r.thisVal}</div>
            <div className="w-32 px-3 py-2 text-right font-mono text-muted-foreground">{r.avgVal}</div>
            <div className={`w-20 px-3 py-2 text-center text-xs font-medium ${r.evalCls}`}>{r.evalStr}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
