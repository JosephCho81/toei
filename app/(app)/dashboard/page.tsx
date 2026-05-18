import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils/format'
import {
  Package, TrendingUp, CheckCircle2, AlertTriangle, Ship, ArrowRight,
} from 'lucide-react'
import { VerificationIssueCard } from '@/components/dashboard/VerificationIssueCard'
import { YearFilterBar } from '@/components/dashboard/YearFilterBar'
import type { VerRow } from '@/components/dashboard/VerificationIssueCard'

export const metadata: Metadata = {
  title: '정산 현황',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '미진행',
  interim_saved: '중간정산(임시)',
  interim_done: '중간정산 완료',
  closing_saved: '클로징(임시)',
  closing_done: '클로징 완료',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const { year } = await searchParams
  const supabase = await createClient()

  const yearFrom = year ? `${year}-01-01` : null
  const yearTo = year ? `${year}-12-31` : null

  const buildAllTxQ = () => {
    let q = supabase.from('transactions').select('import_amount_usd, settlement_status')
    if (yearFrom && yearTo) q = q.gte('lc_open_date', yearFrom).lte('lc_open_date', yearTo)
    return q
  }
  const buildInterimPendingQ = () => {
    // LEFT JOIN 방식: interim_settlements가 없거나, confirmed_amount_krw가 NULL이거나, is_locked=false인 거래
    let q = supabase.from('transactions')
      .select('id, round_label, import_amount_usd, interim_settlements(id, confirmed_amount_krw, is_locked)')
      .not('settlement_status', 'eq', 'closing_done')
    if (yearFrom && yearTo) q = q.gte('lc_open_date', yearFrom).lte('lc_open_date', yearTo)
    return q
  }
  const buildClosingPendingQ = () => {
    let q = supabase.from('transactions')
      .select('id, round_label, import_amount_usd')
      .in('settlement_status', ['interim_done', 'closing_saved'])
    if (yearFrom && yearTo) q = q.gte('lc_open_date', yearFrom).lte('lc_open_date', yearTo)
    return q
  }

  const containerCutoffDate = new Date()
  containerCutoffDate.setDate(containerCutoffDate.getDate() - 7)
  const containerCutoffStr = containerCutoffDate.toISOString().slice(0, 10)

  const [
    { data: allTx },
    { data: ddayTx },
    { data: rawInterimData },
    { data: closingPending },
    { data: containerData },
    { data: recentTx },
    { data: verificationIssues },
  ] = await Promise.all([
    buildAllTxQ(),
    supabase.from('transactions')
      .select('id, round_label, a1_payment_date, settlement_status')
      .not('a1_payment_date', 'is', null)
      .neq('settlement_status', 'closing_done')
      .order('a1_payment_date'),
    buildInterimPendingQ(),
    buildClosingPendingQ(),
    supabase.from('containers')
      .select('id, container_no, etd, eta, actual_arrival, tracking_status, transactions(id, round_label, manufacturers(name), transaction_items(spec))')
      .is('actual_arrival', null)
      .gte('eta', containerCutoffStr)
      .order('eta', { ascending: true, nullsFirst: false })
      .limit(10),
    supabase.from('transactions')
      .select('id, round_label, round_no, import_amount_usd, settlement_status, manufacturers(name), containers(etd, eta)')
      .order('round_no', { ascending: false })
      .limit(5),
    supabase.from('interim_settlements')
      .select('id, notes, confirmed_amount_krw, customs_exchange_rate, transactions(id, round_no, round_label, import_amount_usd, margin_rate_pct), interim_cost_items(amount_krw)')
      .like('notes', '%[검증]%')
      .not('notes', 'like', '%[확인완료]%')
      .order('created_at'),
  ])

  // interimPending: LEFT JOIN 필터 적용
  type RawInterimTx = {
    id: string; round_label: string; import_amount_usd: number | null
    interim_settlements: { id: string; confirmed_amount_krw: number | null; is_locked: boolean | null }[] | null
  }
  const rawInterimAll = (rawInterimData ?? []) as unknown as RawInterimTx[]
  const interimPending = rawInterimAll.filter((t) => {
    // Supabase는 1:1 관계를 단일 객체로 반환하므로 배열로 정규화
    const raw = t.interim_settlements
    const settlements: { id: string; confirmed_amount_krw: number | null; is_locked: boolean | null }[] =
      raw == null ? [] : Array.isArray(raw) ? raw : [raw]
    if (settlements.length === 0) return true
    return settlements.some((s) => s.confirmed_amount_krw == null || s.is_locked === false)
  })

  const totalCount = allTx?.length ?? 0
  const totalUsd = allTx?.reduce((s, t) => s + Number(t.import_amount_usd ?? 0), 0) ?? 0
  const closingDone = allTx?.filter((t) => t.settlement_status === 'closing_done').length ?? 0

  const interimPendingUsd = interimPending.reduce((s, t) => s + Number(t.import_amount_usd ?? 0), 0)
  const closingPendingUsd = (closingPending ?? []).reduce((s, t) => s + Number(t.import_amount_usd ?? 0), 0)
  const totalPendingUsd = interimPendingUsd + closingPendingUsd
  const pendingCount = interimPending.length + (closingPending?.length ?? 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const ddayList = (ddayTx ?? []).map((t) => {
    const payDate = new Date(t.a1_payment_date!)
    payDate.setHours(0, 0, 0, 0)
    const elapsed = Math.floor((today.getTime() - payDate.getTime()) / 86400000)
    return { ...t, dday: 55 - elapsed }
  }).sort((a, b) => a.dday - b.dday)

  // 컨테이너 데이터 처리
  type ContainerRow = {
    id: string
    container_no: string | null
    etd: string | null
    eta: string | null
    actual_arrival: string | null
    tracking_status: string | null
    transactions: {
      id: string; round_label: string
      manufacturers: { name: string } | { name: string }[] | null
      transaction_items: { spec: string | null }[] | null
    } | {
      id: string; round_label: string
      manufacturers: { name: string } | { name: string }[] | null
      transaction_items: { spec: string | null }[] | null
    }[] | null
  }
  const containers = (containerData ?? []) as unknown as ContainerRow[]
  const inTransit = containers.length
  const arrivingSoon = containers.filter((c) => {
    if (!c.eta) return false
    const eta = new Date(c.eta)
    eta.setHours(0, 0, 0, 0)
    return Math.floor((eta.getTime() - today.getTime()) / 86400000) <= 7
  }).length

  // 검증 이슈 처리
  type RawVerRow = {
    id: string
    notes: string | null
    confirmed_amount_krw: number | null
    customs_exchange_rate: number | null
    transactions: {
      id: string; round_no: number; round_label: string
      import_amount_usd: number | null; margin_rate_pct: number | null
    } | {
      id: string; round_no: number; round_label: string
      import_amount_usd: number | null; margin_rate_pct: number | null
    }[] | null
    interim_cost_items: { amount_krw: number | null }[] | null
  }

  const rawVerRows = (verificationIssues ?? []) as unknown as RawVerRow[]
  const verRows: VerRow[] = rawVerRows.map((row) => {
    const tx = Array.isArray(row.transactions) ? row.transactions[0] : row.transactions
    const costSum = (row.interim_cost_items ?? []).reduce(
      (s, c) => s + Number(c.amount_krw || 0), 0,
    )

    let diff: number | null = null
    if (
      tx &&
      row.confirmed_amount_krw != null &&
      row.customs_exchange_rate != null &&
      tx.import_amount_usd != null &&
      tx.margin_rate_pct != null
    ) {
      const calcAmount =
        Math.round(
          Number(tx.import_amount_usd) * Number(row.customs_exchange_rate)
          * (1 + Number(tx.margin_rate_pct) / 100)
          + costSum,
        ) * 1.10
      diff = Number(row.confirmed_amount_krw) - calcAmount
    }

    return {
      id: row.id,
      notes: row.notes,
      confirmed_amount_krw: row.confirmed_amount_krw,
      round_label: tx?.round_label ?? '-',
      transaction_id: tx?.id ?? '',
      diff,
    }
  })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: '#1B5E20' }}>정산 현황</h2>

      {/* 기간 필터 */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">LC 개설일 기준</p>
        <YearFilterBar currentYear={year} />
        {year && (
          <p className="text-sm" style={{ color: '#388E3C' }}>
            {year}년 거래 기준 · 총 {totalCount}건
          </p>
        )}
      </div>

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-medium" style={{ color: '#2E7D32' }}>전체 거래</p>
              <Package className="h-5 w-5" style={{ color: '#81C784' }} />
            </div>
            <p className="text-2xl font-bold font-mono" style={{ color: '#2E7D32' }}>{totalCount}건</p>
            <p className="text-sm mt-1" style={{ color: '#4CAF50' }}>클로징 완료 {closingDone}건</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#F1F8E9', borderColor: '#C8E6C9' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-medium" style={{ color: '#2E7D32' }}>총 수입금액</p>
              <TrendingUp className="h-5 w-5" style={{ color: '#4CAF50' }} />
            </div>
            <p className="text-2xl font-bold font-mono" style={{ color: '#2E7D32' }}>
              ${Math.round(totalUsd).toLocaleString('en-US')}
            </p>
            <p className="text-sm mt-1" style={{ color: '#388E3C' }}>누적 수입 합계</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#4CAF50', borderColor: '#388E3C' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-medium text-white/80">클로징 완료</p>
              <CheckCircle2 className="h-5 w-5 text-white/80" />
            </div>
            <p className="text-2xl font-bold font-mono text-white">{closingDone}건</p>
            <p className="text-sm mt-1 text-white/70">
              완료율 {totalCount > 0 ? Math.round((closingDone / totalCount) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFF8E1', borderColor: '#FFE082' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-medium" style={{ color: '#F57F17' }}>미정산 합계</p>
              <AlertTriangle className="h-5 w-5" style={{ color: '#FFA000' }} />
            </div>
            <p className="text-2xl font-bold font-mono" style={{ color: '#F57F17' }}>{pendingCount}건</p>
            <p className="text-sm mt-1" style={{ color: '#FF8F00' }}>
              ${Math.round(totalPendingUsd).toLocaleString('en-US')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* D-Day 알림 */}
      <Card className="border-green-200">
        <CardHeader className="pb-2 border-l-4 pl-3" style={{ borderColor: '#4CAF50' }}>
          <CardTitle className="text-base flex items-center gap-2" style={{ color: '#2E7D32' }}>
            ⏰ D-Day 알림
            <span className="text-xs font-normal text-muted-foreground">(입금일 기준 55일 마감)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 pt-3">
          {ddayList.length === 0 ? (
            <p className="text-sm text-muted-foreground">마감 임박 거래 없음</p>
          ) : ddayList.map((t) => {
            const isOverdue = t.dday < 0
            const isUrgent = t.dday >= 0 && t.dday <= 7
            const ddayLabel = isOverdue ? `D+${Math.abs(t.dday)} 초과` : t.dday === 0 ? 'D-Day' : `D-${t.dday}`
            return (
              <Link
                key={t.id}
                href={`/transactions/${t.id}`}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-md text-sm hover:opacity-80 transition-opacity',
                  isOverdue ? 'border border-red-200' : isUrgent ? 'border border-orange-200' : 'border border-green-200',
                )}
                style={{ backgroundColor: isOverdue ? '#FFEBEE' : isUrgent ? '#FFF3E0' : '#E8F5E9' }}
              >
                <span className="font-semibold">{t.round_label}</span>
                <span className="text-xs text-gray-400">입금일: {formatDate(t.a1_payment_date)}</span>
                <span className={cn(
                  'font-bold text-sm',
                  isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-green-600',
                )}>
                  {ddayLabel}
                </span>
              </Link>
            )
          })}
        </CardContent>
      </Card>

      {/* 미완료 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 중간정산 미완료 */}
        <Card className="border-green-200">
          <CardHeader className="pb-2 border-l-4 pl-3" style={{ borderColor: '#4CAF50' }}>
            <CardTitle className="text-base" style={{ color: '#2E7D32' }}>중간정산 미완료</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <p className="text-3xl font-bold font-mono" style={{ color: '#2E7D32' }}>{interimPending.length}건</p>
            <p className="text-sm text-muted-foreground mt-1">
              ${Math.round(interimPendingUsd).toLocaleString('en-US')}
            </p>
            <div className="mt-3 space-y-1">
              {interimPending.slice(0, 4).map((t) => (
                <Link key={t.id} href={`/transactions/${t.id}/interim`}
                  className="text-sm font-medium hover:text-foreground flex justify-between py-2 text-muted-foreground">
                  <span>{t.round_label}</span>
                  <span className="font-semibold">${Number(t.import_amount_usd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </Link>
              ))}
              {interimPending.length > 4 && (
                <p className="text-sm text-muted-foreground">외 {interimPending.length - 4}건</p>
              )}
            </div>
            <Link
              href="/transactions"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3 w-full justify-center border-green-300')}
            >
              거래 목록 <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </CardContent>
        </Card>

        {/* 클로징 미완료 */}
        <Card className="border-green-200">
          <CardHeader className="pb-2 border-l-4 pl-3" style={{ borderColor: '#4CAF50' }}>
            <CardTitle className="text-base" style={{ color: '#2E7D32' }}>클로징 미완료</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <p className="text-3xl font-bold font-mono" style={{ color: '#2E7D32' }}>{closingPending?.length ?? 0}건</p>
            <p className="text-sm text-muted-foreground mt-1">
              ${Math.round(closingPendingUsd).toLocaleString('en-US')}
            </p>
            <div className="mt-3 space-y-1">
              {(closingPending ?? []).slice(0, 4).map((t) => (
                <Link key={t.id} href={`/transactions/${t.id}/closing`}
                  className="text-sm font-medium hover:text-foreground flex justify-between py-2 text-muted-foreground">
                  <span>{t.round_label}</span>
                  <span className="font-semibold">${Number(t.import_amount_usd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </Link>
              ))}
              {(closingPending?.length ?? 0) > 4 && (
                <p className="text-sm text-muted-foreground">외 {(closingPending?.length ?? 0) - 4}건</p>
              )}
            </div>
            <Link
              href="/transactions"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3 w-full justify-center border-green-300')}
            >
              거래 목록 <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 컨테이너 추적 현황 */}
      <Card className="border-green-200">
        <CardHeader className="pb-2 border-l-4 pl-3" style={{ borderColor: '#4CAF50' }}>
          <CardTitle className="text-base flex items-center gap-2" style={{ color: '#2E7D32' }}>
            <Ship className="h-4 w-4" />
            컨테이너 추적 현황
            <span className="text-xs font-normal text-muted-foreground ml-1">
              운송중 {inTransit}건 · ETA 7일 이내 {arrivingSoon}건
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {containers.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-3">운송 중인 컨테이너 없음</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#E8F5E9' }}>
                  <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>차수</th>
                  <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>제조사</th>
                  <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>제품</th>
                  <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>컨테이너</th>
                  <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>ETD</th>
                  <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>ETA</th>
                  <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((c, i) => {
                  const tx = Array.isArray(c.transactions) ? c.transactions[0] : c.transactions
                  const mfr = tx ? (Array.isArray(tx.manufacturers) ? tx.manufacturers[0] : tx.manufacturers) : null
                  const rawItems = tx?.transaction_items
                  const items: { spec: string | null }[] =
                    rawItems == null ? [] : Array.isArray(rawItems) ? rawItems : [rawItems]
                  const productSummary = [...new Set(items.map((it) => it.spec).filter(Boolean))].join(', ') || '-'
                  const isArrivingSoon = c.eta
                    ? Math.floor((new Date(c.eta).getTime() - today.getTime()) / 86400000) <= 7
                    : false
                  return (
                    <tr
                      key={c.id}
                      className="border-b last:border-0"
                      style={{ backgroundColor: i % 2 === 1 ? '#F1F8E9' : '#ffffff' }}
                    >
                      <td className="px-4 py-2 text-center font-semibold">
                        {tx ? (
                          <Link href={`/transactions/${tx.id}`} className="hover:underline" style={{ color: '#2E7D32' }}>
                            {tx.round_label}
                          </Link>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-2 text-center text-muted-foreground text-xs">
                        {(mfr as { name: string } | null)?.name ?? '-'}
                      </td>
                      <td className="px-4 py-2 text-center text-muted-foreground text-xs">
                        {productSummary}
                      </td>
                      <td className="px-4 py-2 text-center font-mono text-xs">
                        {c.container_no ?? '-'}
                      </td>
                      <td className="px-4 py-2 text-center text-gray-400 text-xs">
                        {c.etd ? formatDate(c.etd) : '-'}
                      </td>
                      <td className="px-4 py-2 text-center text-xs">
                        <span className={isArrivingSoon ? 'text-orange-400 font-semibold' : 'text-gray-400'}>
                          {c.eta ? formatDate(c.eta) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center text-xs text-muted-foreground">
                        {c.tracking_status ?? '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* 최근 거래 현황 */}
      <Card className="border-green-200">
        <CardHeader
          className="pb-2 flex flex-row items-center justify-between border-l-4 pl-3"
          style={{ borderColor: '#4CAF50' }}
        >
          <CardTitle className="text-base" style={{ color: '#2E7D32' }}>최근 거래 현황</CardTitle>
          <Link href="/transactions" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hover:bg-green-50')} style={{ color: '#4CAF50' }}>
            전체 보기 <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#E8F5E9' }}>
                <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>회차</th>
                <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>제조사</th>
                <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>수입금액</th>
                <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>ETD</th>
                <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>ETA</th>
                <th className="text-center px-4 py-2 font-medium text-xs" style={{ color: '#2E7D32' }}>정산상태</th>
              </tr>
            </thead>
            <tbody>
              {(recentTx ?? []).map((t, i) => {
                const mfr = Array.isArray(t.manufacturers) ? t.manufacturers[0] : t.manufacturers
                const ctrs = (Array.isArray(t.containers) ? t.containers : []) as { etd: string | null; eta: string | null }[]
                const etd = ctrs.map((c) => c.etd).filter(Boolean).sort()[0] ?? null
                const eta = ctrs.map((c) => c.eta).filter(Boolean).sort().at(-1) ?? null
                return (
                  <tr
                    key={t.id}
                    className="border-b last:border-0 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: i % 2 === 1 ? '#F1F8E9' : '#ffffff' }}
                  >
                    <td className="px-4 py-2.5 font-semibold text-center">
                      <Link href={`/transactions/${t.id}`} className="hover:underline" style={{ color: '#2E7D32' }}>
                        {t.round_label}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">
                      {(mfr as { name: string } | null)?.name ?? '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono">
                      ${Number(t.import_amount_usd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-400">
                      {etd ? formatDate(etd) : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-400">
                      {eta ? formatDate(eta) : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <StatusBadge status={t.settlement_status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 검증 이슈 */}
      <VerificationIssueCard rows={verRows} />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  if (status === 'closing_done') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: '#2E7D32' }}>
        {label}
      </span>
    )
  }
  if (status === 'interim_done') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#E8F5E9', color: '#2E7D32' }}>
        {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#FFF8E1', color: '#FF8F00' }}>
      {label}
    </span>
  )
}
