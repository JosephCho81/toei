const STATUS_LABELS: Record<string, string> = {
  pending: '미진행',
  interim_saved: '중간정산(임시)',
  interim_done: '중간정산 완료',
  closing_saved: '클로징(임시)',
  closing_done: '클로징 완료',
}

/**
 * 진행 상태 한 칸.
 *
 * 색 배지를 쓰지 않는다 — 40줄짜리 표에서 줄마다 초록·노랑 알약이 붙으면
 * 화면에서 색이 곧 소음이 되고, 정작 손대야 할 빨강이 묻힌다.
 * 지급 현황의 「상태」 칸과 같은 규칙이다: 끝난 것은 회색, 아직인 것은 진한 글자.
 */
export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  const done = status === 'closing_done'
  return (
    <span className={done ? 'text-muted-foreground' : 'text-slate-800'}>
      {label}
    </span>
  )
}
