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
