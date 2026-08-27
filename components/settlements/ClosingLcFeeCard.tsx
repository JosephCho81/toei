'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/NumberInput'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import { formatKrw } from '@/lib/utils/format'
import { usdToKrw } from '@/lib/calculations/helpers'
import type { ClosingCalculation } from '@/lib/calculations/closing'
import { DEFAULT_LC_FEE_ROWS, EMPTY_FEE_ROW, feeExchangeRate, feeRateMissing, type FeeRow } from './lcFeeDefaults'

function CalcRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

interface Props {
  lcFeeRows: FeeRow[]
  onLcFeeChange: (rows: FeeRow[]) => void
  isLocked: boolean
  calc: ClosingCalculation | null
  fxBurdenA1Pct: number
  onFxBurdenChange: (v: number) => void
  /** 클로징 환율 — USD 항목 환산에 쓴다. 없으면 환산 불가. */
  bokRate: number
}

export function ClosingLcFeeCard({
  lcFeeRows, onLcFeeChange, isLocked, calc, fxBurdenA1Pct, onFxBurdenChange, bokRate,
}: Props) {
  function patch(i: number, next: Partial<FeeRow>) {
    onLcFeeChange(lcFeeRows.map((r, j) => (j === i ? { ...r, ...next } : r)))
  }

  /** 원화로 되돌리면 별도 환율은 의미가 없으므로 같이 지운다. */
  function patchCurrency(i: number, currency: FeeRow['currency']) {
    patch(i, currency === 'KRW' ? { currency, use_custom_rate: false, exchange_rate: '' } : { currency })
  }

  const usdRowsNeedRate = bokRate <= 0 && lcFeeRows.some(
    (r) => r.currency === 'USD' && r.amount_usd !== '' && !r.use_custom_rate
  )

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">LC 수수료</CardTitle>
          {!isLocked && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onLcFeeChange([...lcFeeRows, { ...EMPTY_FEE_ROW }])}
            >
              <Plus className="h-4 w-4 mr-1" />항목 추가
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {usdRowsNeedRate && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              달러로 기재한 항목이 있습니다. 클로징 환율을 먼저 입력해야 원화로 환산됩니다.
            </p>
          )}
          {lcFeeRows.map((row, i) => {
            const isUsd = row.currency === 'USD'
            const rowRate = feeExchangeRate(row, bokRate)
            const rateMissing = feeRateMissing(row)
            const convertedKrw = isUsd ? usdToKrw(parseFloat(row.amount_usd) || 0, rowRate) : null
            return (
              <div key={i} className="space-y-1">
              <div className="flex gap-2 items-center">
                <Input
                  className="flex-1 text-sm"
                  value={row.item_name}
                  onChange={(e) => patch(i, { item_name: e.target.value })}
                  disabled={isLocked}
                />
                <select
                  className="h-9 rounded-md border bg-transparent px-2 text-xs disabled:opacity-50"
                  value={row.currency}
                  onChange={(e) => patchCurrency(i, e.target.value as FeeRow['currency'])}
                  disabled={isLocked}
                  aria-label="통화"
                >
                  <option value="KRW">원</option>
                  <option value="USD">$</option>
                </select>
                {isUsd ? (
                  <NumberInput
                    className="w-32 font-mono text-sm text-right"
                    value={row.amount_usd}
                    onValueChange={(v) => patch(i, { amount_usd: v })}
                    disabled={isLocked}
                    placeholder="0.00"
                  />
                ) : (
                  <NumberInput
                    className="w-32 font-mono text-sm text-right"
                    value={row.amount_krw}
                    onValueChange={(v) => patch(i, { amount_krw: v })}
                    disabled={isLocked}
                    placeholder="0"
                  />
                )}
                <span className="w-32 shrink-0 text-right font-mono text-xs text-muted-foreground">
                  {isUsd ? (rowRate > 0 ? formatKrw(convertedKrw ?? 0) : '환율 필요') : ''}
                </span>
                {!isLocked && i >= DEFAULT_LC_FEE_ROWS.length && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onLcFeeChange(lcFeeRows.filter((_, j) => j !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {isUsd && (
                <div className="flex items-center gap-2 pl-2 text-xs">
                  <label className="flex items-center gap-1.5 text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5"
                      checked={row.use_custom_rate}
                      onChange={(e) => patch(i, { use_custom_rate: e.target.checked, exchange_rate: e.target.checked ? row.exchange_rate : '' })}
                      disabled={isLocked}
                    />
                    별도 환율 적용
                  </label>
                  {row.use_custom_rate ? (
                    <>
                      <NumberInput
                        className="h-7 w-28 font-mono text-xs text-right"
                        value={row.exchange_rate}
                        onValueChange={(v) => patch(i, { exchange_rate: v })}
                        disabled={isLocked}
                        placeholder="0.00"
                        aria-label="별도 환율"
                      />
                      <span className={rateMissing ? 'text-destructive' : 'text-muted-foreground'}>
                        {rateMissing ? '원/$ — 환율을 입력해야 저장됩니다' : '원/$ 적용 (은행 매도환율 등)'}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      클로징 환율 {bokRate > 0 ? `${bokRate.toLocaleString('ko-KR')}원/$` : '(미입력)'} 적용
                    </span>
                  )}
                </div>
              )}
              </div>
            )
          })}
          {calc && (
            <div className="flex justify-between pt-2 text-sm font-semibold">
              <span>LC 수수료 합계</span>
              <span className="font-mono">{formatKrw(calc.lcFeeTotalKrw)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">환차손익 분담 비율</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>에이원 {fxBurdenA1Pct}%</span>
            <span>토에이 {100 - fxBurdenA1Pct}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={fxBurdenA1Pct}
            onChange={(e) => onFxBurdenChange(parseInt(e.target.value))}
            disabled={isLocked}
            className="w-full"
          />
          {calc && (
            <div className="space-y-1 text-sm">
              <CalcRow label="추가비용 합계 (LC부대비용 − 환차익)" value={`${calc.additionalCostKrw >= 0 ? '+' : ''}${formatKrw(calc.additionalCostKrw)}`} />
              <CalcRow
                label={`에이원 부담분 (${fxBurdenA1Pct}%)`}
                value={`${calc.a1BurdenKrw >= 0 ? '+' : ''}${formatKrw(calc.a1BurdenKrw)}`}
                bold={calc.vatMode === 'exclusive'}
              />
              {calc.vatMode === 'exclusive'
                ? <p className="pt-1 text-xs text-muted-foreground">부가세는 클로징 추가비용까지 더한 공급가에 한 번에 적용된다</p>
                : <CalcRow label="에이원 부담분 + VAT" value={`${calc.a1BurdenWithVatKrw >= 0 ? '+' : ''}${formatKrw(calc.a1BurdenWithVatKrw)}`} bold />}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
