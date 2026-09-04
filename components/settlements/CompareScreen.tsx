import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CompareTable } from './CompareTable'
import { KIND_LABEL, type CompareRow, type CompareSummary, type SettlementKind } from '@/lib/data/settlementCompare'

/**
 * 중간정산 · 최종정산 · 지체상금 세 화면의 공통 틀.
 *
 * 화면을 나눈 이유는 항목이 많아서가 아니라 **읽는 질문이 다르기 때문**이다 —
 * 「얼마나 더 내고 덜 냈는가」(청구 vs 계산)와 「앞으로 얼마를 더 내야 하는가」(청구 vs 지급)는
 * 같은 표에 섞으면 서로를 가린다. 여기서는 앞의 질문을 답하고,
 * 「언제 얼마」는 지급 현황이 답한다.
 *
 * 금액은 전부 **에이원 기준**이다 — 토에이/에이원 시점 토글은 없앴다(담당자 2026-09-05:
 * 「에이원 자료이니 에이원 기준으로만 해도 상관없을거 같습니다」). 관점을 둘로 두면
 * 화면마다 같은 금액에 다른 이름이 붙어 대화가 어긋난다.
 */

const TABS: { kind: SettlementKind; href: string }[] = [
  { kind: 'interim', href: '/settlements/interim' },
  { kind: 'closing', href: '/settlements/closing' },
  { kind: 'penalty', href: '/settlements/penalty' },
]

function krw(n: number): string {
  return Math.round(n).toLocaleString('ko-KR')
}

export function CompareScreen({
  kind,
  rows,
  summary,
  today,
  note,
  error,
}: {
  kind: SettlementKind
  rows: CompareRow[]
  summary: CompareSummary
  today: string
  note?: React.ReactNode
  /** 데이터를 못 읽었으면 빈 표 대신 이유를 띄운다 */
  error?: string | null
}) {
  /**
   * 카드 다섯 장이 담당자의 문장 하나를 그대로 답한다 —
   * 「청구금액 기준으로는 68만 더 지급됐는데, 계산금액과 비교하면 덜 지급된 상태다」.
   * 넷째·다섯째가 그 두 숫자다. 어제까지 다섯째가 없어 뒷문장을 화면에서 확인할 수 없었다.
   */
  const cards = [
    {
      label: '청구 누계',
      value: summary.invoicedKrw,
      sub: `${summary.billedCount}건 청구`
        + (summary.unbilledCount > 0 ? ` · ${summary.unbilledCount}건 아직 청구 전` : ''),
      alert: false,
    },
    {
      label: '계산 누계',
      value: summary.calcKrw,
      sub: `청구된 차수를 현재 규약으로 다시 계산`
        + (summary.excludedCount > 0 ? ` · 비교 불가 ${summary.excludedCount}건 제외` : '')
        + (summary.plannedCalcKrw !== 0
          ? ` · 청구 예정 ${krw(summary.plannedCalcKrw)}원 별도`
          : ''),
      alert: false,
    },
    {
      label: '덜 청구한 금액',
      value: summary.underBilledKrw,
      sub: summary.underBilledCount > 0
        ? `${summary.underBilledCount}건`
          + (summary.overBilledCount > 0
            ? ` · 더 청구 ${summary.overBilledCount}건 ${krw(summary.overBilledKrw)}원`
            : '')
        : '없습니다',
      alert: summary.underBilledKrw > 0,
    },
    // 아래 두 장은 **기일이 지난 차수의 순액**이다 — 초과 지급분이 상계되어 들어간다.
    // 담당자 수기검산이 그렇게 낸다(「35차까지 68만 더 지급」). 그래서 지급 현황의
    // 「미지급금」(초과 지급을 따로 세우는 대표용 숫자)과 이름을 나눠 둔다 —
    // 같은 말에 다른 수가 붙으면 두 화면을 두고 하는 대화가 어긋난다.
    {
      label: '청구 대비 차액',
      value: Math.abs(summary.overdueBalanceKrw),
      sub: `기일 지난 ${summary.overdueCount}건 순액 · `
        + (summary.overdueBalanceKrw >= 0 ? '덜 지급' : '더 지급')
        + (Math.abs(summary.notDueBalanceKrw) >= 1
          ? ` · 기일 미도래 ${krw(summary.notDueBalanceKrw)}원 별도`
          : ''),
      alert: summary.overdueBalanceKrw > 0,
    },
    {
      label: '계산 대비 차액',
      value: Math.abs(summary.overdueCalcVsPaidKrw),
      sub: '기일 지난 차수 순액 · '
        + (summary.overdueCalcVsPaidKrw >= 0
          ? '청구가 맞았다면 더 받았을 금액'
          : '계산값보다 더 지급된 금액')
        + (summary.excludedCount > 0 ? ` · 비교 불가 ${summary.excludedCount}건 제외` : ''),
      alert: summary.overdueCalcVsPaidKrw > 0,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1B5E20' }}>{KIND_LABEL[kind]}</h2>
          <p className="text-sm text-muted-foreground">
            청구액 · 계산값 · 지급액을 나란히 놓고 어디가 어긋났는지 봅니다 ·
            {' '}한국에이원 기준이며 대금은 에이원 → 토에이산교 방향입니다
          </p>
        </div>
      </div>

      <div className="inline-flex overflow-hidden rounded-md border text-sm">
        {TABS.map((t) => (
          <Link
            key={t.kind}
            href={t.href}
            className={cn(
              'border-l px-4 py-1.5 first:border-l-0',
              t.kind === kind ? 'bg-slate-800 font-semibold text-white' : 'hover:bg-muted',
            )}
          >
            {KIND_LABEL[t.kind]}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="bg-card px-4 py-3">
            <div className="break-keep text-sm text-muted-foreground">{c.label}</div>
            <div className={cn(
              'mt-1 text-xl font-semibold tabular-nums tracking-tight',
              c.alert && 'text-red-700',
            )}>
              {krw(c.value)}
              <span className="ml-0.5 text-sm font-normal text-muted-foreground">원</span>
            </div>
            <div className="mt-1 break-keep text-sm leading-snug text-muted-foreground">{c.sub}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm">
          <p className="font-semibold text-red-800">데이터를 읽지 못했습니다 — 아래 표는 비어 있는 것이 아닙니다.</p>
          <p className="mt-1 text-red-900">{error}</p>
          <p className="mt-1 text-red-900">
            마이그레이션 <span className="font-mono">036·037·038</span> 이 아직 적용되지 않았을 수 있습니다.
          </p>
        </div>
      )}

      {note}

      <CompareTable rows={rows} kind={kind} today={today} />
    </div>
  )
}
