'use client'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const OPTS = {
  lc: [
    ['pending', '대기'], ['opened', '개설'], ['amended', '수정'],
    ['expired', '만기'], ['utilized', '이용완료'],
  ],
  logistics: [
    ['pending', '대기'], ['shipped', '선적'],
    ['arrived', '입항'], ['customs_cleared', '통관완료'],
  ],
  document: [
    ['pending', '대기'], ['received', '수령'],
    ['submitted', '제출'], ['approved', '승인'],
  ],
} as const

type StatusKey = 'lc_status' | 'logistics_status' | 'document_status'

interface Props {
  values: Record<StatusKey, string>
  onChange: (key: StatusKey, value: string) => void
}

function S({ label, value, opts, onChg }: {
  label: string
  value: string
  opts: readonly (readonly [string, string])[]
  onChg: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Select value={value || ''} onValueChange={(v) => { if (v != null) onChg(v) }}>
        <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
        <SelectContent>
          {opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>

    </div>
  )
}

export function StatusFields({ values, onChange }: Props) {
  return (
    <div className="col-span-2 grid grid-cols-3 gap-3">
      <S label="LC 상태" value={values.lc_status} opts={OPTS.lc}
        onChg={(v) => onChange('lc_status', v)} />
      <S label="물류 상태" value={values.logistics_status} opts={OPTS.logistics}
        onChg={(v) => onChange('logistics_status', v)} />
      <S label="서류 상태" value={values.document_status} opts={OPTS.document}
        onChg={(v) => onChange('document_status', v)} />
    </div>
  )
}
