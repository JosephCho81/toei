'use client'

import { Button } from '@/components/ui/button'
import { formatKrw } from '@/lib/utils/format'

interface Props {
  /** 지금 입력값으로 계산한 값 */
  systemValue: number
  /** 화면의 확정금액 입력값 (문자열 — 비어 있으면 시스템값을 따라간다) */
  currentValue: string
  /** 시스템 계산값을 따라가도록 되돌린다 (빈 문자열을 넘겨 override 를 푼다) */
  onReset: () => void
  isLocked: boolean
  label?: string
}

/**
 * 확정금액은 한 번 저장되면 화면에 그대로 남는다. 뒤늦게 LC 결제비용·수수료를 고쳐도
 * 확정금액은 갱신되지 않아 23차처럼 옛 값이 그대로 굳는 사고가 났다.
 * 계산값과 어긋나면 눈에 띄게 알리고, 되돌릴 수단을 같이 준다.
 */
export function OverrideMismatchNotice({
  systemValue, currentValue, onReset, isLocked, label = '확정금액',
}: Props) {
  const entered = parseFloat(currentValue)
  if (!Number.isFinite(entered)) return null
  const diff = entered - systemValue
  if (Math.abs(diff) < 1) return null

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm space-y-2">
      <p className="font-semibold text-amber-900">
        ⚠ {label}이 시스템 계산값과 다릅니다 — 차이 {diff >= 0 ? '+' : ''}{formatKrw(diff)}
      </p>
      <p className="text-xs text-amber-800">
        입력 항목을 고친 뒤 {label}을 갱신하지 않으면 옛 값이 그대로 저장됩니다.
        의도한 수동 조정이 아니라면 되돌리세요.
      </p>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onReset} disabled={isLocked}>
          시스템 계산값 {formatKrw(systemValue)}으로 되돌리기
        </Button>
        {isLocked && <span className="text-xs text-amber-700">잠금 해제 후 수정할 수 있습니다.</span>}
      </div>
    </div>
  )
}
