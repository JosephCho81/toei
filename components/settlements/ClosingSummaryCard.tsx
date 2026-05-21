'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatKrw } from '@/lib/utils/format'
import type { ClosingCalculation, RoundingPolicy } from '@/lib/calculations/closing'

interface Props {
  calc: ClosingCalculation | null
  roundingPolicy: RoundingPolicy
  onRoundingChange: (v: RoundingPolicy) => void
  confirmedAmount: string
  onConfirmedChange: (v: string) => void
  isLocked: boolean
  interimIsLocked: boolean
}

export function ClosingSummaryCard({
  calc, roundingPolicy, onRoundingChange, confirmedAmount, onConfirmedChange, isLocked, interimIsLocked,
}: Props) {
  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base">최종 정산액</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <Label>절사 정책</Label>
              <Select value={roundingPolicy} onValueChange={(v) => onRoundingChange(v as RoundingPolicy)} disabled={isLocked}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="floor_100">100원 미만 버림</SelectItem>
                  <SelectItem value="floor_10">10원 미만 버림</SelectItem>
                  <SelectItem value="none">버림 없음</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {calc && (
              <div className="space-y-1">
                <Label>시스템 계산값</Label>
                <p className={`text-xl font-mono font-bold ${calc.roundedFinalKrw >= 0 ? '' : 'text-red-600'}`}>
                  {formatKrw(calc.roundedFinalKrw)}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label>확정 금액 (원) — 음수: 토에이→에이원 환급</Label>
            <Input
              type="number"
              value={confirmedAmount}
              onChange={(e) => onConfirmedChange(e.target.value)}
              disabled={isLocked}
              className="font-mono text-lg max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {calc && interimIsLocked && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-bold text-blue-800">최종 종합 정산 (중간 + 클로징)</p>
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">중간정산 확정금액</span>
            <span className="font-mono text-blue-700">{formatKrw(calc.interimConfirmedKrw)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">클로징 정산액</span>
            <span className="font-mono text-blue-700">{calc.roundedFinalKrw >= 0 ? '+' : ''}{formatKrw(calc.roundedFinalKrw)}</span>
          </div>
          <Separator className="border-blue-200" />
          <div className="flex justify-between font-bold">
            <span className="text-blue-900">최종 합계</span>
            <span className="font-mono text-blue-900 text-lg">{formatKrw(calc.grandTotalKrw)}</span>
          </div>
          <p className="text-xs text-blue-600">
            {calc.grandTotalKrw >= 0 ? '한국에이원 → 토에이산교 지급' : '토에이산교 → 한국에이원 지급'}
          </p>
        </div>
      )}
    </>
  )
}
