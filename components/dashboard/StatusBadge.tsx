const STATUS_LABELS: Record<string, string> = {
  pending: '미진행',
  interim_saved: '중간정산(임시)',
  interim_done: '중간정산 완료',
  closing_saved: '클로징(임시)',
  closing_done: '클로징 완료',
}

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  const style = status === 'closing_done'
    ? { backgroundColor: '#2E7D32', color: '#ffffff' }
    : status === 'interim_done'
      ? { backgroundColor: '#E8F5E9', color: '#2E7D32' }
      : { backgroundColor: '#FFF8E1', color: '#FF8F00' }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={style}>
      {label}
    </span>
  )
}
