import { formatUsd, formatKrw } from '@/lib/utils/format'

interface Props {
  importUsd: number
  marginRatePct: number | null
  interimKrw: number | null
  closingKrw: number | null
  grandTotalKrw: number | null
}

/** 상단에는 정산금액 셋을 세운다 — 환차손익은 클로징 절에만 둔다 (담당자 2026-10-06) */
export function ReportKpiCards({ importUsd, marginRatePct, interimKrw, closingKrw, grandTotalKrw }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5 print:mb-3">
      <Card label="수입금액" value={formatUsd(importUsd)} large />
      <Card label="마진율" value={marginRatePct != null ? `${marginRatePct}%` : '-'} large />
      <Card label="중간정산" value={interimKrw != null ? formatKrw(interimKrw) : null} />
      <Card
        label="최종정산"
        value={closingKrw != null ? `${closingKrw > 0 ? '+' : ''}${formatKrw(closingKrw)}` : null}
        negative={closingKrw != null && closingKrw < 0}
      />
      <Card label="종합정산" value={grandTotalKrw != null ? formatKrw(grandTotalKrw) : null} emphasis />
    </div>
  )
}

function Card({ label, value, large, negative, emphasis }: {
  label: string
  value: string | null
  large?: boolean
  negative?: boolean
  emphasis?: boolean
}) {
  return (
    <div className={`border rounded-lg p-4 ${
      emphasis && value != null ? 'border-slate-300 bg-slate-50' : 'border-gray-200 bg-white'
    }`}>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className={`${large ? 'text-xl' : 'text-base'} font-bold tabular-nums ${
        value == null ? 'text-gray-400' : negative ? 'text-red-700' : large ? 'text-gray-900' : 'text-slate-700'
      }`}>
        {value ?? '-'}
      </p>
    </div>
  )
}
