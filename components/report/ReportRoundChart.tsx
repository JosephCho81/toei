'use client'

import { useState } from 'react'

interface RoundPoint {
  roundNo: number
  roundLabel: string
  confirmedAmountKrw: number
}

interface Props {
  data: RoundPoint[]
  currentRoundNo: number
}

const W = 600
const H = 180
const ML = 50, MR = 20, MT = 20, MB = 35
const CW = W - ML - MR
const CH = H - MT - MB

export function ReportRoundChart({ data, currentRoundNo }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; val: string } | null>(null)

  if (!data.length) return null

  const vals = data.map(d => d.confirmedAmountKrw)
  const minVal = Math.min(...vals)
  const maxVal = Math.max(...vals)
  const range = maxVal - minVal || 1

  const xOf = (i: number) => ML + (i / Math.max(data.length - 1, 1)) * CW
  const yOf = (v: number) => MT + (1 - (v - minVal) / range) * CH

  const pathD = data.map((p, i) => {
    const x = xOf(i)
    const y = yOf(p.confirmedAmountKrw)
    return i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `L ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')

  const eok = (v: number) => `${(v / 100000000).toFixed(2)}억`

  const yTicks = 4
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => minVal + (range / yTicks) * i)

  return (
    <div className="mb-4 break-inside-avoid">
      <p className="text-xs font-semibold text-muted-foreground mb-1">차수별 중간정산 확정금액 비교</p>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-gray-100 rounded-lg bg-white" style={{ maxHeight: 200 }}>
          {/* Y grid lines */}
          {tickVals.map((v, i) => {
            const y = yOf(v)
            return (
              <g key={i}>
                <line x1={ML} y1={y} x2={ML + CW} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />
                <text x={ML - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{eok(v)}</text>
              </g>
            )
          })}

          {/* Line */}
          <path d={pathD} fill="none" stroke="#86efac" strokeWidth={1.5} />

          {/* Data points */}
          {data.map((p, i) => {
            const x = xOf(i)
            const y = yOf(p.confirmedAmountKrw)
            const isCurrent = p.roundNo === currentRoundNo
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={isCurrent ? 6 : 3}
                fill={isCurrent ? '#15803d' : '#4ade80'}
                stroke={isCurrent ? '#14532d' : '#22c55e'}
                strokeWidth={isCurrent ? 1.5 : 1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setTooltip({
                  x, y,
                  label: p.roundLabel,
                  val: `${p.confirmedAmountKrw.toLocaleString('ko-KR')}원`,
                })}
                onMouseLeave={() => setTooltip(null)}
              />
            )
          })}

          {/* X axis labels (sampled) */}
          {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0 || i === data.length - 1).map((p, _, arr) => {
            const i = data.indexOf(p)
            return (
              <text key={i} x={xOf(i)} y={H - 5} textAnchor="middle" fontSize={9} fill="#9ca3af">
                {p.roundLabel}
              </text>
            )
          })}

          {/* Tooltip */}
          {tooltip && (
            <g>
              <rect
                x={Math.min(tooltip.x + 6, W - 110)}
                y={Math.max(tooltip.y - 32, 2)}
                width={104}
                height={28}
                rx={4}
                fill="#1f2937"
                opacity={0.88}
              />
              <text
                x={Math.min(tooltip.x + 58, W - 58)}
                y={Math.max(tooltip.y - 20, 14)}
                textAnchor="middle"
                fontSize={10}
                fill="white"
                fontWeight={600}
              >
                {tooltip.label}
              </text>
              <text
                x={Math.min(tooltip.x + 58, W - 58)}
                y={Math.max(tooltip.y - 8, 26)}
                textAnchor="middle"
                fontSize={9}
                fill="#d1fae5"
              >
                {tooltip.val}
              </text>
            </g>
          )}
        </svg>
        <p className="text-xs text-muted-foreground text-right mt-1">Y축: 억원 단위 | 진한 점: 현재 차수</p>
      </div>
    </div>
  )
}
