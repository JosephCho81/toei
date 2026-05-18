interface Segment {
  label: string
  amount: number
  bgClass: string
  textClass: string
}

interface Props {
  segments: Segment[]
}

export function ReportCostBar({ segments }: Props) {
  const nonZero = segments.filter(s => s.amount > 0)
  const total = nonZero.reduce((s, r) => s + r.amount, 0)
  if (total <= 0 || !nonZero.length) return null

  return (
    <div className="mb-4 break-inside-avoid">
      <p className="text-xs font-semibold text-muted-foreground mb-2">원가 구성 비율</p>
      <div className="flex h-7 rounded overflow-hidden mb-2 border border-gray-100">
        {nonZero.map(seg => (
          <div
            key={seg.label}
            className={seg.bgClass}
            style={{ width: `${(seg.amount / total) * 100}%` }}
            title={`${seg.label}: ${seg.amount.toLocaleString('ko-KR')}원 (${Math.round(seg.amount / total * 100)}%)`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {nonZero.map(seg => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs">
            <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${seg.bgClass}`} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className={`font-mono font-medium ${seg.textClass}`}>
              {Math.round(seg.amount / total * 100)}%
            </span>
            <span className="text-muted-foreground/60">
              ({seg.amount.toLocaleString('ko-KR')}원)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
