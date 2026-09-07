import { formatUsd, formatKrw } from '@/lib/utils/format'

interface Props {
  importUsd: number
  marginRatePct: number | null
  fxGainLossKrw: number | null
  grandTotalKrw: number | null
}

export function ReportKpiCards({ importUsd, marginRatePct, fxGainLossKrw, grandTotalKrw }: Props) {
  const fxIsGain = fxGainLossKrw != null && fxGainLossKrw >= 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 print:mb-3">
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <p className="text-sm text-muted-foreground mb-1">수입금액</p>
        <p className="text-xl font-bold tabular-nums text-gray-900">{formatUsd(importUsd)}</p>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <p className="text-sm text-muted-foreground mb-1">마진율</p>
        <p className="text-xl font-bold tabular-nums text-gray-900">
          {marginRatePct != null ? `${marginRatePct}%` : '-'}
        </p>
      </div>

      <div className={`border rounded-lg p-4 ${
        fxGainLossKrw == null ? 'border-gray-200 bg-white' :
        fxIsGain ? 'border-slate-200 bg-slate-50' : 'border-red-200 bg-red-50'
      }`}>
        <p className="text-sm text-muted-foreground mb-1">환차손익</p>
        <p className={`text-base font-bold tabular-nums ${
          fxGainLossKrw == null ? 'text-gray-400' :
          fxIsGain ? 'text-slate-700' : 'text-red-700'
        }`}>
          {fxGainLossKrw == null ? '-' : `${fxGainLossKrw >= 0 ? '+' : ''}${formatKrw(fxGainLossKrw)}`}
        </p>
        {fxGainLossKrw != null && (
          <p className={`text-sm mt-0.5 ${fxIsGain ? 'text-slate-500' : 'text-red-500'}`}>
            {fxIsGain ? '환차익' : '환차손'}
          </p>
        )}
      </div>

      <div className={`border rounded-lg p-4 ${
        grandTotalKrw != null ? 'border-slate-300 bg-slate-50' : 'border-gray-200 bg-white'
      }`}>
        <p className="text-sm text-muted-foreground mb-1">종합정산</p>
        <p className={`text-base font-bold tabular-nums ${
          grandTotalKrw != null ? 'text-slate-700' : 'text-gray-400'
        }`}>
          {grandTotalKrw != null ? formatKrw(grandTotalKrw) : '-'}
        </p>
      </div>
    </div>
  )
}
