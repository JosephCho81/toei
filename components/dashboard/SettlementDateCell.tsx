import type { ScheduleState } from '@/lib/calculations/schedule'

const STYLE: Record<ScheduleState, { color: string; suffix: string }> = {
  done:      { color: '#1B5E20', suffix: '' },
  overdue:   { color: '#C62828', suffix: ' 지연' },
  upcoming:  { color: '#EF6C00', suffix: ' 예정' },
  scheduled: { color: '#9E9E9E', suffix: ' 예정' },
  unknown:   { color: '#BDBDBD', suffix: '' },
}

/** 'YYYY-MM-DD' → 'MM/DD'. 목록에서 연도까지 붙으면 너무 길다. */
function short(date: string): string {
  return `${date.slice(5, 7)}/${date.slice(8, 10)}`
}

/**
 * 정산일 한 칸. 실제 정산일이 있으면 그 날짜를, 없으면 예정일을 상태색과 함께 보여준다.
 * 예정일 공식이 미확정인 2025-06 이전 개설분은 '미확정'.
 */
export function SettlementDateCell({ due, actual, state, applicable }: {
  due: string | null
  actual: string | null
  state: ScheduleState
  applicable: boolean
}) {
  if (actual) {
    return <span className="font-mono text-xs" style={{ color: STYLE.done.color }}>{short(actual)}</span>
  }
  if (!applicable) {
    return <span className="text-xs text-muted-foreground">미확정</span>
  }
  if (!due) return <span className="text-xs text-muted-foreground">-</span>

  const s = STYLE[state]
  return (
    <span className="font-mono text-xs whitespace-nowrap" style={{ color: s.color }}>
      {short(due)}<span className="font-sans">{s.suffix}</span>
    </span>
  )
}
