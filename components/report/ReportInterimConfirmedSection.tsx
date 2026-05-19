import { ReportSection } from './ReportSection'
import { formatKrw, formatDate } from '@/lib/utils/format'

export interface InterimConfirmedData {
  confirmed_amount_krw: number | null
  updated_at: string | null
}

export function ReportInterimConfirmedSection({ data }: { data: InterimConfirmedData }) {
  const confirmed = data.confirmed_amount_krw
  const direction = confirmed != null
    ? confirmed >= 0
      ? '한국에이원 → 토에이산교 지급'
      : '토에이산교 → 한국에이원 지급'
    : null

  return (
    <ReportSection title="섹션 4 — 중간정산 확정금액">
      {confirmed != null ? (
        <div className="border-2 border-green-300 rounded-lg p-5 bg-green-50">
          <p className="text-xs text-muted-foreground mb-1">중간정산 확정금액</p>
          <p className="text-3xl font-bold font-mono text-green-800">
            {formatKrw(Math.abs(confirmed))}
          </p>
          {direction && (
            <div className="mt-3 inline-flex items-center bg-green-100 text-green-800 rounded px-3 py-1.5">
              <span className="text-sm font-semibold">{direction}</span>
            </div>
          )}
          {data.updated_at && (
            <p className="text-xs text-muted-foreground mt-2">정산일: {formatDate(data.updated_at)}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">미확정</p>
      )}
    </ReportSection>
  )
}
