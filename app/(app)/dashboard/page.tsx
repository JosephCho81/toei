import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/format'
import {
  Package, TrendingUp, CheckCircle2, AlertTriangle, Ship, ArrowRight,
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pending: '미진행',
  interim_saved: '중간정산(임시)',
  interim_done: '중간정산 완료',
  closing_saved: '클로징(임시)',
  closing_done: '클로징 완료',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: allTx },
    { data: ddayTx },
    { data: interimPending },
    { data: closingPending },
    { data: inTransitContainers },
    { data: recentTx },
    { data: verificationIssues },
  ] = await Promise.all([
    supabase.from('transactions').select('import_amount_usd, settlement_status'),
    supabase.from('transactions')
      .select('id, round_label, a1_payment_date, settlement_status')
      .not('a1_payment_date', 'is', null)
      .neq('settlement_status', 'closing_done')
      .order('a1_payment_date'),
    supabase.from('transactions')
      .select('id, round_label, import_amount_usd')
      .in('settlement_status', ['pending', 'interim_saved']),
    supabase.from('transactions')
      .select('id, round_label, import_amount_usd')
      .in('settlement_status', ['interim_done', 'closing_saved']),
    supabase.from('containers')
      .select('id, eta, actual_arrival')
      .is('actual_arrival', null)
      .not('eta', 'is', null),
    supabase.from('transactions')
      .select('id, round_label, round_no, import_amount_usd, settlement_status, manufacturers(name), containers(etd, eta)')
      .order('round_no', { ascending: false })
      .limit(5),
    supabase.from('interim_settlements')
      .select('notes, confirmed_amount_krw, transactions(round_no, round_label, manufacturers(name))')
      .like('notes', '%[검증]%')
      .order('created_at'),
  ])

  const totalCount = allTx?.length ?? 0
  const totalUsd = allTx?.reduce((s, t) => s + Number(t.import_amount_usd ?? 0), 0) ?? 0
  const closingDone = allTx?.filter((t) => t.settlement_status === 'closing_done').length ?? 0

  const interimPendingUsd = (interimPending ?? []).reduce((s, t) => s + Number(t.import_amount_usd ?? 0), 0)
  const closingPendingUsd = (closingPending ?? []).reduce((s, t) => s + Number(t.import_amount_usd ?? 0), 0)
  const totalPendingUsd = interimPendingUsd + closingPendingUsd
  const pendingCount = (interimPending?.length ?? 0) + (closingPending?.length ?? 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const ddayList = (ddayTx ?? []).map((t) => {
    const payDate = new Date(t.a1_payment_date!)
    payDate.setHours(0, 0, 0, 0)
    const elapsed = Math.floor((today.getTime() - payDate.getTime()) / 86400000)
    return { ...t, dday: 55 - elapsed }
  }).sort((a, b) => a.dday - b.dday)

  const inTransit = inTransitContainers?.length ?? 0
  const arrivingSoon = (inTransitContainers ?? []).filter((c) => {
    const eta = new Date(c.eta!)
    eta.setHours(0, 0, 0, 0)
    return Math.floor((eta.getTime() - today.getTime()) / 86400000) <= 7
  }).length

  type VerificationRow = {
    notes: string | null
    confirmed_amount_krw: unknown
    transactions: { round_no: number; round_label: string; manufacturers: { name: string } | { name: string }[] | null } | { round_no: number; round_label: string; manufacturers: { name: string } | { name: string }[] | null }[] | null
  }
  const verRows = (verificationIssues ?? []) as unknown as VerificationRow[]

  function extractVerNote(notes: string | null): string {
    if (!notes) return ''
    const idx = notes.indexOf('[검증]')
    if (idx < 0) return ''
    const after = notes.slice(idx + 4).trim()
    return after.split(/[.\n]/)[0].trim()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: '#1B5E20' }}>대시보드</h2>

      {/* 요약 통계 카드 4개 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 전체 거래수 */}
        <Card className="border-green-200">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: '#2E7D32' }}>전체 거래</p>
              <Package className="h-4 w-4" style={{ color: '#4CAF50' }} />
            </div>
            <p className="text-2xl font-bold font-mono" style={{ color: '#2E7D32' }}>{totalCount}건</p>
            <p className="text-xs mt-1" style={{ color: '#4CAF50' }}>클로징 완료 {closingDone}건</p>
          </CardContent>
        </Card>

        {/* 총 수입금액 */}
        <Card style={{ backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: '#2E7D32' }}>총 수입금액</p>
              <TrendingUp className="h-4 w-4" style={{ color: '#2E7D32' }} />
            </div>
            <p className="text-2xl font-bold font-mono" style={{ color: '#2E7D32' }}>
              ${Math.round(totalUsd).toLocaleString('en-US')}
            </p>
            <p className="text-xs mt-1" style={{ color: '#388E3C' }}>누적 수입 합계</p>
          </CardContent>
        </Card>

        {/* 클로징 완료 */}
        <Card style={{ backgroundColor: '#2E7D32', borderColor: '#1B5E20' }}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-white/80">클로징 완료</p>
              <CheckCircle2 className="h-4 w-4 text-white/80" />
            </div>
            <p className="text-2xl font-bold font-mono text-white">{closingDone}건</p>
            <p className="text-xs mt-1 text-white/70">
              완료율 {totalCount > 0 ? Math.round((closingDone / totalCount) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        {/* 미정산 합계 */}
        <Card style={{ backgroundColor: '#FFF8E1', borderColor: '#FFE082' }}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: '#F57F17' }}>미정산 합계</p>
              <AlertTriangle className="h-4 w-4" style={{ color: '#F57F17' }} />
            </div>
            <p className="text-2xl font-bold font-mono" style={{ color: '#F57F17' }}>{pendingCount}건</p>
            <p className="text-xs mt-1" style={{ color: '#FF8F00' }}>
              ${Math.round(totalPendingUsd).toLocaleString('en-US')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* D-Day 알림 */}
      <Card className="border-green-200">
        <CardHeader className="pb-2" style={{ backgroundColor: '#2E7D32', borderRadius: '0.5rem 0.5rem 0 0' }}>
          <CardTitle className="text-base flex items-center gap-2 text-white">
            ⏰ D-Day 알림
            <span className="text-xs font-normal text-white/70">(입금일 기준 55일 마감)</span>
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
                  isOverdue
                    ? 'border border-red-200'
                    : isUrgent
                    ? 'border border-orange-200'
                    : 'border border-green-200',
                )}
                style={{
                  backgroundColor: isOverdue ? '#FFEBEE' : isUrgent ? '#FFF3E0' : '#E8F5E9',
                }}
              >
                <span className="font-semibold">{t.round_label}</span>
                <span className="text-xs text-muted-foreground">입금일: {formatDate(t.a1_payment_date)}</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 미정산 현황 — 중간 */}
        <Card className="border-green-200">
          <CardHeader className="pb-2" style={{ backgroundColor: '#E8F5E9', borderRadius: '0.5rem 0.5rem 0 0' }}>
            <CardTitle className="text-base" style={{ color: '#2E7D32' }}>중간정산 미완료</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <p className="text-3xl font-bold font-mono" style={{ color: '#2E7D32' }}>{interimPending?.length ?? 0}건</p>
            <p className="text-sm text-muted-foreground mt-1">
              ${Math.round(interimPendingUsd).toLocaleString('en-US')}
            </p>
            <div className="mt-3 space-y-1">
              {(interimPending ?? []).slice(0, 4).map((t) => (
                <Link key={t.id} href={`/transactions/${t.id}/interim`}
                  className="text-xs text-muted-foreground hover:text-foreground flex justify-between">
                  <span>{t.round_label}</span>
                  <span>${Number(t.import_amount_usd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </Link>
              ))}
              {(interimPending?.length ?? 0) > 4 && (
                <p className="text-xs text-muted-foreground">외 {(interimPending?.length ?? 0) - 4}건</p>
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

        {/* 미정산 현황 — 클로징 */}
        <Card className="border-green-200">
          <CardHeader className="pb-2" style={{ backgroundColor: '#E8F5E9', borderRadius: '0.5rem 0.5rem 0 0' }}>
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
                  className="text-xs text-muted-foreground hover:text-foreground flex justify-between">
                  <span>{t.round_label}</span>
                  <span>${Number(t.import_amount_usd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </Link>
              ))}
              {(closingPending?.length ?? 0) > 4 && (
                <p className="text-xs text-muted-foreground">외 {(closingPending?.length ?? 0) - 4}건</p>
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
        <CardHeader className="pb-2" style={{ backgroundColor: '#2E7D32', borderRadius: '0.5rem 0.5rem 0 0' }}>
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <Ship className="h-4 w-4" />
            컨테이너 추적 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-10 pt-4">
          <div>
            <p className="text-3xl font-bold font-mono" style={{ color: '#2E7D32' }}>{inTransit}</p>
            <p className="text-sm text-muted-foreground">운송 중</p>
          </div>
          <div>
            <p className={cn('text-3xl font-bold font-mono', arrivingSoon > 0 ? 'text-orange-600' : '')}
              style={arrivingSoon === 0 ? { color: '#2E7D32' } : {}}>
              {arrivingSoon}
            </p>
            <p className="text-sm text-muted-foreground">ETA 7일 이내</p>
          </div>
        </CardContent>
      </Card>

      {/* 검증 이슈 카드 */}
      {verRows.length > 0 && (
        <Card style={{ borderColor: '#FFB74D' }}>
          <CardHeader className="pb-2" style={{ backgroundColor: '#FFF3E0', borderRadius: '0.5rem 0.5rem 0 0' }}>
            <CardTitle className="text-base flex items-center gap-2" style={{ color: '#E65100' }}>
              ⚠️ 검증 이슈 차수
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#FFE0B2' }}>
                  <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: '#E65100' }}>차수</th>
                  <th className="text-right px-4 py-2 text-xs font-medium" style={{ color: '#E65100' }}>확정금액</th>
                  <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: '#E65100' }}>이슈 내용</th>
                </tr>
              </thead>
              <tbody>
                {verRows.map((row, i) => {
                  const tx = Array.isArray(row.transactions) ? row.transactions[0] : row.transactions
                  const issueNote = extractVerNote(row.notes)
                  return (
                    <tr key={i} className="border-t" style={{ borderColor: '#FFE0B2' }}>
                      <td className="px-4 py-2 font-semibold" style={{ color: '#BF360C' }}>
                        {tx?.round_label ?? '-'}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs">
                        {row.confirmed_amount_krw != null
                          ? `${Number(row.confirmed_amount_krw as number).toLocaleString('ko-KR')}원`
                          : '-'}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{issueNote || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 최근 5차 거래 */}
      <Card className="border-green-200">
        <CardHeader
          className="pb-2 flex flex-row items-center justify-between"
          style={{ backgroundColor: '#1B5E20', borderRadius: '0.5rem 0.5rem 0 0' }}
        >
          <CardTitle className="text-base text-white">최근 거래 현황</CardTitle>
          <Link href="/transactions" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-white/80 hover:text-white hover:bg-white/10')}>
            전체 보기 <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#2E7D32' }}>
                <th className="text-left px-4 py-2 font-medium text-white text-xs">회차</th>
                <th className="text-left px-4 py-2 font-medium text-white text-xs">제조사</th>
                <th className="text-right px-4 py-2 font-medium text-white text-xs">수입금액</th>
                <th className="text-center px-4 py-2 font-medium text-white text-xs">ETD</th>
                <th className="text-center px-4 py-2 font-medium text-white text-xs">ETA</th>
                <th className="text-center px-4 py-2 font-medium text-white text-xs">정산상태</th>
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
                    <td className="px-4 py-2.5 font-semibold">
                      <Link href={`/transactions/${t.id}`} className="hover:underline" style={{ color: '#2E7D32' }}>
                        {t.round_label}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {(mfr as { name: string } | null)?.name ?? '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      ${Number(t.import_amount_usd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">
                      {etd ? formatDate(etd) : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">
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
