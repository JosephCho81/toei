import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
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
    .from('transactions')
    .select(`
      *,
      manufacturers(name),
      interim_settlements(id, confirmed_amount_krw, is_locked, is_paid),
      closing_settlements(id, confirmed_amount_krw, is_locked, is_paid)
    `)
    .eq('id', id)
    .single()

  if (!t) notFound()

  const mfr = t.manufacturers as { name: string } | null
  const interim = (t.interim_settlements as { id: string; confirmed_amount_krw: number | null; is_locked: boolean; is_paid: boolean }[] | null)?.[0]
  const closing = (t.closing_settlements as { id: string; confirmed_amount_krw: number | null; is_locked: boolean; is_paid: boolean }[] | null)?.[0]

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
            <Row label="LC번호" value={t.lc_no ?? '-'} />
            <Row label="LC개설일" value={formatDate(t.lc_open_date)} />
            <Row label="통관일" value={formatDate(t.customs_date)} />
            <Row label="통관환율" value={formatExchangeRate(t.customs_exchange_rate ? Number(t.customs_exchange_rate) : null)} />
            <Row label="마진율" value={t.margin_rate_pct ? `${t.margin_rate_pct}%` : '-'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">정산 현황</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <SettlementRow
              label="중간정산"
              href={`/transactions/${id}/interim`}
              amount={interim?.confirmed_amount_krw ?? null}
              isLocked={interim?.is_locked ?? false}
              isPaid={interim?.is_paid ?? false}
              settlementId={interim?.id ?? null}
              pdfType="interim"
            />
            <Separator />
            <SettlementRow
              label="클로징정산"
              href={`/transactions/${id}/closing`}
              amount={closing?.confirmed_amount_krw ?? null}
              isLocked={closing?.is_locked ?? false}
              isPaid={closing?.is_paid ?? false}
              settlementId={closing?.id ?? null}
              pdfType="closing"
            />
          </CardContent>
        </Card>
      </div>

      <ItemsEditTable transactionId={id} isLocked={t.is_locked} />

      <ContainerList transactionId={id} isLocked={t.is_locked} />

      <ForwardingQuoteSection transactionId={id} isLocked={t.is_locked} />

      {t.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">메모</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{t.notes}</p></CardContent>
        </Card>
      )}
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

function SettlementRow({
  label, href, amount, isLocked, isPaid, settlementId, pdfType,
}: {
  label: string
  href: string
  amount: number | null
  isLocked: boolean
  isPaid: boolean
  settlementId: string | null
  pdfType: 'interim' | 'closing'
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {amount != null && (
          <p className="text-lg font-bold">{amount.toLocaleString('ko-KR')}원</p>
        )}
        <div className="flex gap-1 mt-1">
          {isLocked && <Badge variant="outline" className="text-xs">확정</Badge>}
          {isPaid && <Badge variant="default" className="text-xs">지불완료</Badge>}
        </div>
      </div>
      <div className="flex gap-2">
        <SettlementPdfButton type={pdfType} settlementId={settlementId} isLocked={isLocked} />
        <Link href={href} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>{amount == null ? '입력' : '보기/수정'}</Link>
      </div>
    </div>
  )
}
