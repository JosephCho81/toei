'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/NumberInput'
import { formatKrw } from '@/lib/utils/format'
import { usdToKrw } from '@/lib/calculations/helpers'
import {
  hasAdvancePayment, advanceRateMissing, advanceExceedsTotal, type LcPaymentInput,
} from '@/lib/calculations/closing'

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

/** LC 결제비용 입력칸의 안내문 — 환율이 없으면 원화가 0으로 굳으므로 상태를 분명히 알린다. */
function paymentHint(p: {
  legacyLcPaymentKrw: number | null
  lcPayment: LcPaymentInput
  bokRate: number
  lcPaymentKrw: number
}): string {
  if (p.legacyLcPaymentKrw != null) {
    return `저장된 원화 ${formatKrw(p.legacyLcPaymentKrw)} (달러 입력 전에 저장된 정산 — 달러를 입력하면 환율로 다시 환산됩니다)`
  }
  if (p.lcPayment.totalUsd == null) return '달러로 입력하면 클로징 환율로 원화가 환산됩니다.'
  if (p.bokRate <= 0) return '클로징 환율을 먼저 입력해야 원화로 환산됩니다.'
  return hasAdvancePayment(p.lcPayment)
    ? `원화 환산 ${formatKrw(p.lcPaymentKrw)} (선지급분 별도 환율 적용)`
    : `원화 환산 ${formatKrw(p.lcPaymentKrw)} (× ${p.bokRate.toLocaleString('ko-KR')}원/$)`
}

function advanceHint(lcPayment: LcPaymentInput, bokRate: number): string {
  if (!hasAdvancePayment(lcPayment)) return '선지급금을 입력하면 활성화됩니다.'
  if (advanceExceedsTotal(lcPayment)) return '선지급금이 LC 결제비용 총액보다 큽니다.'
  if (advanceRateMissing(lcPayment)) return '선지급 환율을 입력해야 저장할 수 있습니다.'
  const advance = usdToKrw(lcPayment.advanceUsd, lcPayment.advanceRate)
  const rest = usdToKrw((lcPayment.totalUsd ?? 0) - (lcPayment.advanceUsd ?? 0), bokRate)
  return `선지급 ${formatKrw(advance)} + 잔액 ${formatKrw(rest)}`
}

export function ClosingBasicInfoCard(p: {
  closingDate: string
  onClosingDateChange: (v: string) => void
  bokRate: string
  onBokRateChange: (v: string) => void
  lcPaymentUsd: string
  onLcPaymentUsdChange: (v: string) => void
  advanceUsd: string
  onAdvanceUsdChange: (v: string) => void
  advanceRate: string
  onAdvanceRateChange: (v: string) => void
  lcPayment: LcPaymentInput
  lcPaymentKrw: number
  bokRateNum: number
  legacyLcPaymentKrw: number | null
  lcNo: string | null
  containerLcNumbers: string[]
  isLocked: boolean
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">클로징 기본 정보</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>클로징일</Label>
          <Input
            type="date" value={p.closingDate} disabled={p.isLocked}
            onChange={(e) => p.onClosingDateChange(e.target.value)}
          />
        </div>
        <Field label="클로징 환율 (원/$)" hint="클로징일 기준 한국은행 최초 고시 환율을 직접 입력합니다.">
          <NumberInput
            value={p.bokRate} onValueChange={p.onBokRateChange} disabled={p.isLocked}
            className="font-mono text-right" placeholder="1,391.5"
          />
        </Field>
        <Field
          label="LC 결제비용 ($)"
          hint={paymentHint({
            legacyLcPaymentKrw: p.legacyLcPaymentKrw, lcPayment: p.lcPayment,
            bokRate: p.bokRateNum, lcPaymentKrw: p.lcPaymentKrw,
          })}
        >
          <NumberInput
            value={p.lcPaymentUsd} onValueChange={p.onLcPaymentUsdChange} disabled={p.isLocked}
            className="font-mono text-right" placeholder="0.00"
          />
        </Field>
        <Field
          label="선지급금 ($) — 선택"
          hint="LC 결제비용 중 다른 환율로 먼저 결제한 금액. 없으면 비워 둡니다."
        >
          <NumberInput
            value={p.advanceUsd} onValueChange={p.onAdvanceUsdChange} disabled={p.isLocked}
            className="font-mono text-right" placeholder="0.00"
          />
        </Field>
        <Field label="선지급 환율 (원/$)" hint={advanceHint(p.lcPayment, p.bokRateNum)}>
          <NumberInput
            value={p.advanceRate} onValueChange={p.onAdvanceRateChange}
            disabled={p.isLocked || !hasAdvancePayment(p.lcPayment)}
            className="font-mono text-right" placeholder="1,156.4"
          />
        </Field>
        <div className="space-y-1">
          <Label>LC 번호</Label>
          <div className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm min-h-9">
            {p.lcNo || <span className="font-sans text-muted-foreground">거래 기본정보에 미입력</span>}
          </div>
          {p.containerLcNumbers.length > 0 && (
            <p className="text-xs text-muted-foreground">
              컨테이너 기재: {p.containerLcNumbers.join(', ')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
