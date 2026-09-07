import { cn } from '@/lib/utils'

/**
 * 화면 맨 위의 숫자 카드 줄. 지급 현황·정산 비교·정산 현황이 같은 것을 쓴다.
 *
 * 카드 사이는 테두리 한 줄(gap-px + bg-border)로만 가른다 — 카드마다 그림자와
 * 색 배경을 주면 세 장만 놓여도 화면이 소란스러워지고, 정작 빨간 숫자가 묻힌다.
 * 색은 `alert` 하나뿐이다: 손대야 하는 숫자만 빨강.
 */
export interface Stat {
  label: string
  /** 이미 서식이 끝난 문자열. 단위는 `unit` 로 따로 넘겨 작게 붙인다 */
  value: string
  unit?: string
  sub?: string
  alert?: boolean
}

export function StatCards({ items, className }: { items: Stat[]; className?: string }) {
  const cols = items.length >= 5
    ? 'lg:grid-cols-5'
    : items.length === 4
      ? 'lg:grid-cols-4'
      : items.length === 3
        ? 'lg:grid-cols-3'
        : 'lg:grid-cols-2'

  return (
    <div className={cn(
      'grid grid-cols-1 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2',
      cols,
      className,
    )}>
      {items.map((c) => (
        <div key={c.label} className="bg-card px-4 py-3">
          <div className="break-keep text-sm text-muted-foreground">{c.label}</div>
          <div className={cn(
            'mt-1 text-xl font-semibold tabular-nums tracking-tight',
            c.alert && 'text-red-700',
          )}>
            {c.value}
            {c.unit && (
              <span className="ml-0.5 text-sm font-normal text-muted-foreground">{c.unit}</span>
            )}
          </div>
          {c.sub && (
            <div className="mt-1 break-keep text-sm leading-snug text-muted-foreground">{c.sub}</div>
          )}
        </div>
      ))}
    </div>
  )
}
