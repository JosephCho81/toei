'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { type RoundingPolicy, type InterimCalculation } from '@/lib/calculations/interim'
import { formatKrw, formatNumberForInput, parseNumberInput } from '@/lib/utils/format'

const ROUNDING_LABELS: Record<RoundingPolicy, string> = {
  floor_100: '100원 단위 절사',
  floor_10: '10원 단위 절사',
  none: '절사 없음',
}

interface Props {
  calc: InterimCalculation | null
  systemAmount: number
  roundingPolicy: RoundingPolicy
  onRoundingChange: (v: RoundingPolicy) => void
  confirmedAmount: string
  onConfirmedChange: (v: string) => void
  isLocked: boolean
  shippingSubtotal: number
  customsSubtotal: number
}

export function InterimResultsCard({
  calc, systemAmount, roundingPolicy, onRoundingChange,
  confirmedAmount, onConfirmedChange, isLocked,
  shippingSubtotal, customsSubtotal,
}: Props) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">계산 결과</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {calc && (
          <div className="space-y-1 text-sm">
            <Row label="해상운임 소계" value={formatKrw(shippingSubtotal)} />
            <Row label="통관 소계" value={formatKrw(customsSubtotal)} />
            <Separator />
            <Row label="수입원가 (마진포함)" value={formatKrw(calc.importAmountKrw)} />
            <Row label="확정금액" value={formatKrw(calc.confirmedKrw)} bold />
          </div>
        )}
        <div className="flex items-end gap-6">
          <div className="space-y-1">
            <Label className="text-sm">절사 정책</Label>
            <Select value={roundingPolicy}
              onValueChange={(v) => v && onRoundingChange(v as RoundingPolicy)}
              disabled={isLocked}>
              <SelectTrigger className="w-36"><SelectValue>{(v: RoundingPolicy) => ROUNDING_LABELS[v]}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="floor_100">{ROUNDING_LABELS.floor_100}</SelectItem>
                <SelectItem value="floor_10">{ROUNDING_LABELS.floor_10}</SelectItem>
                <SelectItem value="none">{ROUNDING_LABELS.none}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {systemAmount > 0 && (
            <div className="space-y-1">
              <Label className="text-sm">시스템 계산값</Label>
              <p className="text-lg font-mono font-bold">{formatKrw(systemAmount)}</p>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <Label>확정 금액 (원)</Label>
          <Input inputMode="decimal" value={formatNumberForInput(confirmedAmount)}
            onChange={(e) => onConfirmedChange(parseNumberInput(e.target.value))}
            disabled={isLocked} className="font-mono text-lg max-w-xs" />
        </div>
      </CardContent>
    </Card>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}
