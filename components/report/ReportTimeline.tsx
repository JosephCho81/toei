import { formatDate } from '@/lib/utils/format'

interface Props {
  lcOpenDate: string | null
  customsDate: string | null
  closingDate: string | null
  customsRate: number | null
  bokRate: number | null
}

function daysBetween(d1: string | null, d2: string | null): number | null {
  if (!d1 || !d2) return null
  const ms = new Date(d2).getTime() - new Date(d1).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function ReportTimeline({ lcOpenDate, customsDate, closingDate, customsRate, bokRate }: Props) {
  const phase1 = daysBetween(lcOpenDate, customsDate)
  const phase2 = daysBetween(customsDate, closingDate)
  const total = daysBetween(lcOpenDate, closingDate)

  return (
    <div className="border border-gray-100 rounded-lg p-4 mt-3 bg-gray-50/70 overflow-x-auto break-inside-avoid">
      <p className="text-xs font-semibold text-muted-foreground mb-3">거래 타임라인</p>
      <div className="relative flex items-start justify-between min-w-[380px]">
        {/* LC개설 */}
        <div className="flex flex-col items-center w-28">
          <div className="w-3 h-3 rounded-full bg-green-600 mb-1 shrink-0" />
          <p className="text-xs font-semibold text-green-800">LC개설</p>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{formatDate(lcOpenDate)}</p>
        </div>

        {/* Phase 1 connector */}
        <div className="flex-1 flex flex-col items-center pt-1.5">
          <div className="w-full h-0.5 bg-green-300 relative">
            {phase1 != null && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap bg-gray-50 px-1">
                {phase1}일
              </span>
            )}
          </div>
        </div>

        {/* 통관/입고 */}
        <div className="flex flex-col items-center w-28">
          <div className="w-3 h-3 rounded-full bg-amber-500 mb-1 shrink-0" />
          <p className="text-xs font-semibold text-amber-700">통관/입고</p>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{formatDate(customsDate)}</p>
          {customsRate != null && (
            <p className="text-[10px] text-blue-600 mt-0.5">{customsRate.toLocaleString('ko-KR')}원/$</p>
          )}
        </div>

        {/* Phase 2 connector */}
        <div className="flex-1 flex flex-col items-center pt-1.5">
          <div className="w-full h-0.5 bg-green-300 relative">
            {phase2 != null && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap bg-gray-50 px-1">
                {phase2}일
              </span>
            )}
          </div>
        </div>

        {/* LC결제 */}
        <div className="flex flex-col items-center w-28">
          <div className="w-3 h-3 rounded-full bg-blue-600 mb-1 shrink-0" />
          <p className="text-xs font-semibold text-blue-800">LC결제</p>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{formatDate(closingDate)}</p>
          {bokRate != null && (
            <p className="text-[10px] text-blue-600 mt-0.5">{bokRate.toLocaleString('ko-KR')}원/$</p>
          )}
        </div>
      </div>
      {total != null && (
        <p className="text-xs text-center text-muted-foreground mt-3">
          총 소요기간: <span className="font-semibold text-gray-700">{total}일</span>
        </p>
      )}
    </div>
  )
}
