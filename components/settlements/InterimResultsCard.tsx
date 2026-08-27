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
import { OverrideMismatchNotice } from './OverrideMismatchNotice'

const ROUNDING_LABELS: Record<RoundingPolicy, string> = {
  floor_100: '100원 단위 절사',
  floor_10: '10원 단위 절사',
  none: '절사 없음',
}

interface Props {
  calc: InterimCalculation | null
  systemSupply: number
  roundingPolicy: RoundingPolicy
  onRoundingChange: (v: RoundingPolicy) => void
  /** 담당자가 확정하는 값은 공급가. 부가세와 합계는 여기서 파생시켜 세금계산서와 항상 맞춘다. */
  supplyAmount: string
  onSupplyChange: (v: string | null) => void
  confirmedVat: number
  confirmedTotal: number
  isLocked: boolean
  shippingSubtotal: number
  customsSubtotal: number
}

export function InterimResultsCard({
  calc, systemSupply, roundingPolicy, onRoundingChange,
  supplyAmount, onSupplyChange, confirmedVat, confirmedTotal, isLocked,
  shippingSubtotal, customsSubtotal,
}: Props) {
  const exclusive = calc?.vatMode !== 'inclusive'

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">계산 결과</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {calc && (
          <div className="space-y-1 text-sm">
            <Row label="수입원가 (마진포함)" value={formatKrw(calc.importAmountKrw)} />
            <Row label="해상운임 소계" value={formatKrw(shippingSubtotal)} />
            <Row label="통관 소계" value={formatKrw(customsSubtotal)} />
            {exclusive && calc.importVatKrw > 0 && (
              <Row label="수입부가세 (매입세액공제 — 청구 제외)" value={`− ${formatKrw(calc.importVatKrw)}`} muted />
            )}
            <Separator />
            <Row label={exclusive ? '공급가' : '청구액'} value={formatKrw(calc.supplyAmountKrw)} bold />
            {exclusive && (
              <>
                <Row label="부가세 (공급가 × 10%)" value={formatKrw(calc.vatKrw)} />
                <Row label="합계" value={formatKrw(calc.confirmedKrw)} bold />
              </>
            )}
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
            <p className="text-xs text-muted-foreground">공급가에 적용 — 합계는 공급가+부가세로 맞춘다</p>
          </div>
          {systemSupply > 0 && (
            <div className="space-y-1">
              <Label className="text-sm">시스템 계산 공급가</Label>
              <p className="text-lg font-mono font-bold">{formatKrw(systemSupply)}</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label>{exclusive ? '확정 공급가 (원)' : '확정 금액 (원)'}</Label>
            <Input inputMode="decimal" value={formatNumberForInput(supplyAmount)}
              onChange={(e) => onSupplyChange(parseNumberInput(e.target.value))}
              disabled={isLocked} className="font-mono text-lg max-w-xs" />
          </div>
          <OverrideMismatchNotice
            systemValue={systemSupply}
            currentValue={supplyAmount}
            onReset={() => onSupplyChange(null)}
            isLocked={isLocked}
            label={exclusive ? '확정 공급가' : '확정 금액'}
          />
          {exclusive && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-1">
              <Row label="확정 공급가" value={formatKrw(parseFloat(supplyAmount) || 0)} />
              <Row label="부가세 (10%)" value={formatKrw(confirmedVat)} />
              <Row label="청구 합계" value={formatKrw(confirmedTotal)} bold />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className={muted ? 'text-muted-foreground text-xs' : 'text-muted-foreground'}>{label}</span>
      <span className={`font-mono ${muted ? 'text-muted-foreground text-xs' : ''}`}>{value}</span>
    </div>
  )
}
