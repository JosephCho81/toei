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
  view,
  note,
  error,
}: {
  kind: SettlementKind
  rows: CompareRow[]
  summary: CompareSummary
  view: 'toei' | 'a1'
  note?: React.ReactNode
  /** 데이터를 못 읽었으면 빈 표 대신 이유를 띄운다 */
  error?: string | null
}) {
  const toei = view === 'toei'
  const q = view === 'a1' ? '?view=a1' : ''

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
      sub: `같은 ${summary.billedCount}건을 현재 규약으로 다시 계산`
        + (summary.legacyCount > 0 ? ` · 구방식 ${summary.legacyCount}건은 직접 비교 불가` : '')
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
    {
      label: toei ? '미수금' : '미지급금',
      value: summary.balanceKrw,
      sub: `${toei ? '입금' : '지급'} 누계 ${krw(summary.paidKrw)}원`,
      alert: false,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1B5E20' }}>{KIND_LABEL[kind]}</h2>
          <p className="text-sm text-muted-foreground">
            청구액 · 계산값 · {toei ? '입금액' : '지급액'}을 나란히 놓고 어디가 어긋났는지 봅니다 ·
            {' '}대금은 한국에이원 → 토에이산교 방향입니다
          </p>
        </div>

        <div className="inline-flex overflow-hidden rounded-md border text-sm">
          {(['toei', 'a1'] as const).map((v) => (
            <Link
              key={v}
              href={`/settlements/${kind}${v === 'a1' ? '?view=a1' : ''}`}
              className={cn(
                'px-3 py-1.5',
                view === v ? 'bg-slate-800 font-semibold text-white' : 'hover:bg-muted',
              )}
            >
              {v === 'toei' ? '토에이 시점' : '에이원 시점'}
            </Link>
          ))}
        </div>
      </div>

      <div className="inline-flex overflow-hidden rounded-md border text-sm">
        {TABS.map((t) => (
          <Link
            key={t.kind}
            href={`${t.href}${q}`}
            className={cn(
              'border-l px-4 py-1.5 first:border-l-0',
              t.kind === kind ? 'bg-slate-800 font-semibold text-white' : 'hover:bg-muted',
            )}
          >
            {KIND_LABEL[t.kind]}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-4">
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

      <CompareTable rows={rows} kind={kind} view={view} />

      <p className="text-sm text-muted-foreground">
        「청구−계산」은 청구서가 어긋난 금액이고, 「{toei ? '미수금' : '미지급금'}」은 아직 오가지 않은 금액입니다 —
        서로 다른 이야기라 열을 나눠 두었습니다. 1,000원 미만 차이는 절사로 보아 0으로 봅니다.
      </p>
    </div>
  )
}
