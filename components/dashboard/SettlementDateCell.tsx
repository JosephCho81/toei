import { cn } from '@/lib/utils'
import type { ScheduleState } from '@/lib/calculations/schedule'

/**
 * 정산일 한 칸. 실제 정산일이 있으면 그 날짜를, 없으면 예정일을 보여준다.
 * 예정일 공식이 미확정인 2025-06 이전 개설분은 '미확정'.
 *
 * 상태를 색 다섯 가지로 말하지 않는다 — 지난 것만 빨강이고 나머지는 회색조에
 * 「예정」·「지연」을 글자로 붙인다. 색은 손댈 곳에만 쓴다는 규칙이 화면 전체에 걸린다.
 */
const SUFFIX: Record<ScheduleState, string> = {
  done: '',
  overdue: ' 지연',
  upcoming: ' 예정',
  scheduled: ' 예정',
  unknown: '',
}

/** 'YYYY-MM-DD' → 'MM/DD'. 목록에서 연도까지 붙으면 너무 길다. */
function short(date: string): string {
  return `${date.slice(5, 7)}/${date.slice(8, 10)}`
}

export function SettlementDateCell({ due, actual, state, applicable }: {
  due: string | null
  actual: string | null
  state: ScheduleState
  applicable: boolean
}) {
  if (actual) {
    return <span className="tabular-nums text-slate-800">{short(actual)}</span>
  }
  if (!applicable) {
    return <span className="text-muted-foreground">미확정</span>
  }
  if (!due) return <span className="text-muted-foreground">-</span>

  return (
    <span className={cn(
      'whitespace-nowrap tabular-nums',
      state === 'overdue' ? 'font-semibold text-red-700' : 'text-muted-foreground',
    )}>
      {short(due)}{SUFFIX[state]}
    </span>
  )
}
