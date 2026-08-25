import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { fetchInterimSettlement, fetchClosingSettlement } from '@/lib/data/queries'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatDate, formatUsd, formatExchangeRate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ContainerList } from './container-list'
import { SettlementPdfButton } from '@/components/settlements/SettlementPdfButton'
import { ItemsEditTable } from '@/components/transactions/ItemsEditTable'
import { ForwardingQuoteSection } from '@/components/transactions/ForwardingQuoteSection'
import { TransactionNotesCard } from '@/components/transactions/TransactionNotesCard'

const STATUS_LABELS: Record<string, string> = {
  pending: '미진행',
  interim_saved: '중간정산(임시)',
  interim_done: '중간정산 완료',
  closing_saved: '클로징(임시)',
  closing_done: '클로징 완료',
}

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: t } = await supabase
    .from('v_transaction_status')
    .select('*, manufacturers(name)')
    .eq('id', id)
    .single()
  const [interim, closing, { data: containerRows }] = await Promise.all([
    fetchInterimSettlement(supabase, id),
    fetchClosingSettlement(supabase, id),
    supabase.from('containers').select('lc_number').eq('transaction_id', id),
  ])

  if (!t) notFound()

  const mfr = t.manufacturers as { name: string } | null
  // 한 차수에 LC가 여러 건인 경우가 있어(예: 37차) 컨테이너에 기록된 LC 번호를 우선 표시한다.
  const containerLcNumbers = [...new Set(
    (containerRows ?? []).map((c) => String(c.lc_number ?? '').trim()).filter(Boolean)
  )]
  const lcNoDisplay = containerLcNumbers.length > 0 ? containerLcNumbers.join(', ') : (t.lc_no ?? '-')
  const displayCustomsRate = interim?.customs_exchange_rate
    ? Number(interim.customs_exchange_rate)
    : (t.customs_exchange_rate ? Number(t.customs_exchange_rate) : null)
  const bokRate = closing?.bok_exchange_rate ? Number(closing.bok_exchange_rate) : null

  const ROUNDING_LABELS: Record<string, string> = {
    floor_100: '100원 미만 버림',
    floor_10: '10원 미만 버림',
    none: '버림 없음',
  }
  const roundingLabel = interim?.rounding_policy ? (ROUNDING_LABELS[interim.rounding_policy] ?? interim.rounding_policy) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t.round_label}</h2>
          {t.order_no && <p className="text-muted-foreground text-sm">{t.order_no}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge>{STATUS_LABELS[t.settlement_status] ?? t.settlement_status}</Badge>
          {t.is_locked && <Badge variant="outline">🔒 잠금</Badge>}
          <Link
            href={`/transactions/${id}/report`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            정산 리포트
          </Link>
          {!t.is_locked && (
            <Link href={`/transactions/${id}/edit`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>수정</Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="제조사" value={mfr?.name ?? '-'} />
            <Row label="수입금액(USD)" value={t.import_amount_usd ? formatUsd(Number(t.import_amount_usd)) : '-'} />
            <Row label={containerLcNumbers.length > 1 ? `LC 번호 (${containerLcNumbers.length}건)` : 'LC 번호'} value={lcNoDisplay} />
            <Row label="LC개설일" value={formatDate(t.lc_open_date)} />
            <Row label="통관일" value={formatDate(t.customs_date)} />
            <Row label="통관환율" value={displayCustomsRate != null ? `${formatExchangeRate(displayCustomsRate)} (입고시 세관 신고 환율)` : '-'} />
            {bokRate != null && (
              <Row
                label="클로징환율"
                value={`${formatExchangeRate(bokRate)} (한국은행 최초 고시 환율${closing?.closing_date ? `, ${closing.closing_date} 기준` : ''})`}
              />
            )}
            <Row label="마진율" value={t.margin_rate_pct ? `${t.margin_rate_pct}%` : '-'} />
            {roundingLabel && <Row label="절사 정책" value={roundingLabel} />}
            {(() => {
              const entries = Array.isArray(t.delivery_dates) ? t.delivery_dates as Array<{seq: number; date: string}> : []
              if (entries.length === 0) return null
              return <Row label="납기일" value={entries.map(d => `${d.seq}차: ${d.date}`).join(' / ')} />
            })()}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <SettlementCard
            label="중간정산"
            href={`/transactions/${id}/interim`}
            amount={interim?.confirmed_amount_krw ?? null}
            date={interim?.updated_at ?? null}
            isLocked={interim?.is_locked ?? false}
            settlementId={interim?.id ?? null}
            pdfType="interim"
            txLocked={t.is_locked}
          />
          <SettlementCard
            label="클로징정산"
            href={`/transactions/${id}/closing`}
            amount={closing?.confirmed_amount_krw ?? null}
            date={closing?.closing_date ?? null}
            isLocked={closing?.is_locked ?? false}
            settlementId={closing?.id ?? null}
            pdfType="closing"
            txLocked={t.is_locked}
            interimConfirmedKrw={interim?.confirmed_amount_krw ?? null}
          />
        </div>
      </div>

      <ItemsEditTable transactionId={id} isLocked={t.is_locked} />

      <ContainerList transactionId={id} isLocked={t.is_locked} defaultLcNumber={t.lc_no} />

      <ForwardingQuoteSection transactionId={id} isLocked={t.is_locked} />

      <TransactionNotesCard transactionId={id} initialNotes={t.notes ?? null} />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function SettlementCard({
  label, href, amount, date, isLocked, settlementId, pdfType, txLocked, interimConfirmedKrw,
}: {
  label: string; href: string; amount: number | null; date: string | null
  isLocked: boolean; settlementId: string | null; pdfType: 'interim' | 'closing'; txLocked: boolean
  interimConfirmedKrw?: number | null
}) {
  const grandTotal = (interimConfirmedKrw != null && amount != null)
    ? interimConfirmedKrw + amount
    : null

  const closingDirection = amount != null && amount !== 0
    ? amount >= 0 ? '한국에이원 → 토에이산교 지급' : '토에이산교 → 한국에이원 지급'
    : null

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{label}</p>
          {isLocked
            ? <Badge variant="default" className="text-xs">완료</Badge>
            : <Badge variant="secondary" className="text-xs">미정산</Badge>}
        </div>

        {grandTotal != null ? (
          <>
            <div>
              <p className="text-xs text-muted-foreground">종합정산액</p>
              <p className="text-xl font-bold font-mono">{grandTotal.toLocaleString('ko-KR')}원</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                (중간 {interimConfirmedKrw!.toLocaleString('ko-KR')} + 클로징 {amount!.toLocaleString('ko-KR')})
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">클로징 정산금액</p>
              <p className={`text-base font-bold font-mono ${amount! < 0 ? 'text-red-600' : ''}`}>
                {amount!.toLocaleString('ko-KR')}원
              </p>
              {closingDirection && (
                <p className="text-xs text-muted-foreground mt-0.5">{closingDirection}</p>
              )}
            </div>
          </>
        ) : amount != null ? (
          <p className="text-xl font-bold font-mono">{amount.toLocaleString('ko-KR')}원</p>
        ) : null}

        {date && <p className="text-xs text-muted-foreground">{formatDate(date)}</p>}
        <div className="flex gap-2 pt-1">
          <SettlementPdfButton type={pdfType} settlementId={settlementId} isLocked={isLocked} />
          {!txLocked && (
            <Link href={href} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              {amount == null ? '정산 시작' : '상세보기'}
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
