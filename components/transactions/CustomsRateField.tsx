'use client'

import { useState } from 'react'
import { Download, Loader2, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NumberInput } from '@/components/ui/NumberInput'
import type { CustomsRateResult } from '@/lib/tracking/customsRate'

/**
 * 통관환율 입력 + 관세청 고시환율 대조.
 *
 * 이 값이 중간정산 금액을 그대로 결정하므로 수기 입력만 믿지 않는다.
 * 통관일(수입신고일)이 있으면 관세청 고시환율을 불러와 자동으로 채우고,
 * 이미 입력된 값이 있으면 대조해 다르면 경고한다.
 *
 * 과세환율은 주 단위 고시이며 수입신고일이 속한 주의 값이 적용된다.
 * 통관일이 한 주만 어긋나도 환율이 달라지므로 적용개시일을 함께 보여준다.
 */
export function CustomsRateField({ customsDate, value, onValueChange }: {
  customsDate: string | null | undefined
  value: string
  onValueChange: (v: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [official, setOfficial] = useState<{ rate: number; from: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchRate() {
    setLoading(true)
    setError(null)
    setOfficial(null)
    try {
      const res = await fetch('/api/customs-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customsDate, currency: 'USD' }),
      })
      const data: CustomsRateResult = await res.json()
      if (!data.ok) {
        setError(data.reason === 'no_key'
          ? '관세환율 인증키가 등록되지 않았습니다 (UNIPASS_API_KEY_FXRATE).'
          : data.message)
        return
      }
      setOfficial({ rate: data.rate.rate, from: data.rate.appliedFrom })
      if (!value.trim()) onValueChange(String(data.rate.rate))
    } catch (e) {
      setError(`조회 실패: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const entered = Number(String(value).replace(/,/g, ''))
  const mismatch = official != null && Number.isFinite(entered) && entered > 0
    && Math.abs(entered - official.rate) > 0.0001

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2 items-center">
        <NumberInput className="font-mono text-right flex-1" value={value} onValueChange={onValueChange} />
        <Button
          type="button" variant="outline" size="sm" className="shrink-0"
          disabled={!customsDate || loading}
          onClick={fetchRate}
          title={customsDate ? '관세청 고시 통관환율을 불러온다' : '통관일을 먼저 입력하세요'}
        >
          {loading
            ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />조회 중</>
            : <><Download className="h-3.5 w-3.5 mr-1" />관세청 대조</>}
        </Button>
      </div>

      {error && <p className="text-xs text-amber-700">{error}</p>}

      {official && (
        mismatch ? (
          <div className="text-xs rounded border border-red-300 bg-red-50 px-2 py-1.5 text-red-800 space-y-1">
            <p className="flex items-center gap-1 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              입력값 {entered.toLocaleString('ko-KR')} ≠ 관세청 고시 {official.rate.toLocaleString('ko-KR')}
            </p>
            <p>
              {official.from && `${official.from} 적용개시 주 기준. `}
              통관일이 맞는지 먼저 확인하세요 — 신고일이 한 주만 밀려도 환율이 달라집니다.
            </p>
            <button
              type="button"
              className="underline font-medium"
              onClick={() => onValueChange(String(official.rate))}
            >
              관세청 값으로 바꾸기
            </button>
          </div>
        ) : (
          <p className="text-xs rounded border border-green-200 bg-green-50 px-2 py-1.5 text-green-800 flex items-center gap-1">
            <Check className="h-3.5 w-3.5" />
            관세청 고시환율과 일치{official.from && ` (${official.from} 적용개시)`}
          </p>
        )
      )}
    </div>
  )
}
