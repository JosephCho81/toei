'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { formatNumberForInput, parseNumberInput } from '@/lib/utils/format'

type InputProps = React.ComponentProps<typeof Input>

interface Props extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  /** 원시 숫자 문자열(쉼표 없음). 화면에는 천단위 쉼표를 찍어 보여준다. */
  value: string | number | null | undefined
  /** 쉼표를 걷어낸 원시 문자열을 돌려준다. */
  onValueChange: (raw: string) => void
}

/**
 * 천단위 쉼표가 보이는 숫자 입력칸.
 * type="number" 를 쓰면 브라우저가 쉼표를 막으므로 text 로 두고 직접 포맷한다.
 * 상태에는 항상 쉼표 없는 원시 문자열만 들어간다.
 */
export function NumberInput({ value, onValueChange, ...rest }: Props) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={formatNumberForInput(value ?? '')}
      onChange={(e) => onValueChange(parseNumberInput(e.target.value))}
      {...rest}
    />
  )
}
