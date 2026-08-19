'use client'

import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKrw } from '@/lib/utils/format'
import type { ClosingCalculation } from '@/lib/calculations/closing'

function CalcRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

interface Props {
  calc: ClosingCalculation | null
  customsExchangeRate: number
  lcPayment: string
}

export function ClosingFxCard({ calc, customsExchangeRate, lcPayment }: Props) {
  if (!calc) return null
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">환차손익</CardTitle></CardHeader>
      <CardContent className="space-y-1 text-sm">
        <CalcRow
          label={`원금×통관환율 (${customsExchangeRate.toLocaleString('ko-KR')}원/$)`}
          value={formatKrw(calc.importAmountKrw)}
        />
        <CalcRow label="LC 결제비용" value={formatKrw(parseFloat(lcPayment) || 0)} />
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
