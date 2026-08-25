export function formatKrw(amount: number): string {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatRate(rate: number | null | undefined): string {
  if (rate == null) return '-'
  return `${rate.toFixed(2)}%`
}

export function formatExchangeRate(rate: number | null | undefined): string {
  if (rate == null) return '-'
  return `${rate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}원/$`
}

export function formatDiff(value: number): string {
  const abs = Math.abs(value).toLocaleString('ko-KR')
  return value >= 0 ? `+${abs}원` : `-${abs}원`
}

export function formatNumberForInput(value: string | number): string {
  const s = String(value ?? '').replace(/,/g, '')
  if (s === '' || s === '-') return s
  const [intPart, decPart] = s.split('.')
  if (intPart === '' || isNaN(Number(intPart))) return s
  const sign = intPart.startsWith('-') ? '-' : ''
  const digits = sign ? intPart.slice(1) : intPart
  const formattedInt = digits === '' ? '' : Number(digits).toLocaleString('en-US')
  return decPart !== undefined ? `${sign}${formattedInt}.${decPart}` : `${sign}${formattedInt}`
}

/**
 * 화면 입력값 → 저장/계산용 원시 숫자 문자열.
 * 쉼표·공백 등 표시용 문자를 걷어내고, 부호는 맨 앞 하나, 소수점도 하나만 남긴다.
 * (금액 입력이므로 '1.2.3' 같은 값이 parseFloat 로 조용히 잘리는 일이 없어야 한다)
 */
export function parseNumberInput(value: string): string {
  const cleaned = String(value ?? '').replace(/[^\d.-]/g, '')
  const negative = cleaned.startsWith('-')
  const [intPart, ...rest] = cleaned.replace(/-/g, '').split('.')
  const decPart = rest.length > 0 ? `.${rest.join('')}` : ''
  return `${negative ? '-' : ''}${intPart}${decPart}`
}

export function formatYearMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}
