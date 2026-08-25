'use client'

import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKrw, formatUsd } from '@/lib/utils/format'
import type { ClosingCalculation } from '@/lib/calculations/closing'

function CalcRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">
        {value}
        {sub && <span className="ml-2 text-xs text-muted-foreground">{sub}</span>}
      </span>
    </div>
  )
}

interface Props {
  calc: ClosingCalculation | null
  customsExchangeRate: number
  /** 계산에 쓰인 LC 결제비용(원) */
  lcPaymentKrw: number
  /** 담당자가 입력한 LC 결제비용(달러). 없으면 원화만 표시. */
  lcPaymentUsd: number | null
  bokRate: number
}

export function ClosingFxCard({ calc, customsExchangeRate, lcPaymentKrw, lcPaymentUsd, bokRate }: Props) {
  if (!calc) return null
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">환차손익</CardTitle></CardHeader>
      <CardContent className="space-y-1 text-sm">
        <CalcRow
          label={`원금×통관환율 (${customsExchangeRate.toLocaleString('ko-KR')}원/$)`}
          value={formatKrw(calc.importAmountKrw)}
        />
        <CalcRow
          label={lcPaymentUsd != null && bokRate > 0
            ? `LC 결제비용 (클로징환율 ${bokRate.toLocaleString('ko-KR')}원/$)`
            : 'LC 결제비용'}
          value={lcPaymentUsd != null ? formatUsd(lcPaymentUsd) : formatKrw(lcPaymentKrw)}
          sub={lcPaymentUsd != null ? `= ${formatKrw(lcPaymentKrw)}` : undefined}
        />
        <Separator />
        <div className="flex justify-between font-semibold">
          <span>환차손익 <span className="text-xs font-normal text-muted-foreground">(원금×통관환율 − LC결제비용)</span></span>
          <span className={`font-mono ${calc.fxGainLossKrw >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {calc.fxGainLossKrw >= 0 ? '+' : ''}{formatKrw(calc.fxGainLossKrw)}
            <span className="text-xs ml-1">{calc.fxGainLossKrw >= 0 ? '(환차익)' : '(환차손)'}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
