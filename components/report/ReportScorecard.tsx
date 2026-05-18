interface Props {
  fxRiskRatio: number
  marginPct: number | null
  isSettled: boolean
  costRatio: number
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

function evalLabel(score: number): { text: string; icon: string } {
  if (score >= 80) return { text: '우수', icon: '✓' }
  if (score >= 60) return { text: '양호', icon: '✓' }
  if (score >= 40) return { text: '보통', icon: '' }
  return { text: '미흡', icon: '△' }
}

function scoreColor(score: number) {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-400'
  return 'bg-red-400'
}

function textColor(score: number) {
  if (score >= 70) return 'text-green-700'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-600'
}

function gradeOf(avg: number) {
  if (avg >= 80) return { grade: 'S', cls: 'text-green-700 bg-green-100' }
  if (avg >= 60) return { grade: 'A', cls: 'text-blue-700 bg-blue-100' }
  if (avg >= 40) return { grade: 'B', cls: 'text-amber-700 bg-amber-100' }
  return { grade: 'C', cls: 'text-red-700 bg-red-100' }
}

export function ReportScorecard({ fxRiskRatio, marginPct, isSettled, costRatio }: Props) {
  const fxScore = Math.round(Math.max(0, 100 - fxRiskRatio * 2000))
  const marginScore = marginPct == null ? 50 : Math.round(Math.min(100, Math.max(0, marginPct * 8)))
  const settleScore = isSettled ? 100 : 50
  const costScore = Math.round(Math.max(0, 100 - costRatio * 500))
  const avg = Math.round((fxScore + marginScore + settleScore + costScore) / 4)
  const { grade, cls } = gradeOf(avg)

  const rows = [
    { name: '환율 리스크', score: fxScore, desc: '환차손익/수입원가 비율 (낮을수록 좋음)' },
    { name: '수익성', score: marginScore, desc: '마진율 기준 (높을수록 좋음)' },
    { name: '정산 완료율', score: settleScore, desc: isSettled ? '중간 + 클로징 모두 확정' : '미완료 정산 있음' },
    { name: '비용 효율', score: costScore, desc: '비용/수입원가 비율 (낮을수록 좋음)' },
  ]

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white break-inside-avoid">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">거래 종합 평가</h3>
        <span className={`text-base font-bold px-3 py-0.5 rounded ${cls}`}>{grade} 등급</span>
      </div>
      <div className="space-y-2.5">
        {rows.map(r => {
          const { text, icon } = evalLabel(r.score)
          return (
            <div key={r.name} className="flex items-center gap-3 text-sm" title={r.desc}>
              <span className="w-24 text-muted-foreground shrink-0 text-xs">{r.name}</span>
              <ProgressBar pct={r.score} color={scoreColor(r.score)} />
              <span className={`w-14 text-right text-xs shrink-0 ${textColor(r.score)}`}>
                {text} {icon}
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        종합 점수: {avg}점 | 등급 기준: S(≥80) · A(≥60) · B(≥40) · C
      </p>
    </div>
  )
}
