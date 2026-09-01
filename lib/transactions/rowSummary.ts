import { formatDate } from '@/lib/utils/format'
import { DEFAULT_UNIT } from '@/lib/constants/units'
import type { TxRow } from '@/types/transaction'

type Item = {
  spec: string | null; glove_type: string | null; color: string | null
  size: string | null; quantity: number | null; unit: string | null; sort_order: number
}

export function getMfr(raw: TxRow['manufacturers']): string {
  if (!raw) return '-'
  if (Array.isArray(raw)) return raw[0]?.name ?? '-'
  return (raw as { name: string }).name ?? '-'
}

export function summarizeItems(items: Item[]): string {
  if (!items.length) return '-'
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order)
  const first = sorted[0]
  const label = [first.glove_type, first.color].filter(Boolean).join(' ')
  const sizes = [...new Set(sorted.map((i) => i.size).filter(Boolean as unknown as (v: string | null) => v is string))].join('/')
  const total = sorted.reduce((s, i) => s + (i.quantity ?? 0), 0)
  const unit = first.unit ?? DEFAULT_UNIT
  const parts = [label || first.spec, sizes, total > 0 ? `${total.toLocaleString('ko-KR')} ${unit}` : '']
  return parts.filter(Boolean).join(' · ')
}

export function getEtd(containers: { etd: string | null }[]): string | null {
  const dates = containers.map((c) => c.etd).filter(Boolean) as string[]
  return dates.sort()[0] ?? null
}

export function getEta(containers: { eta: string | null }[]): string | null {
  const dates = containers.map((c) => c.eta).filter(Boolean) as string[]
  return dates.sort().at(-1) ?? null
}

export function getEtaDisplay(eta: string | null, deliveryDates: Array<{ seq: number; date: string }> | null): string {
  if (eta) return formatDate(eta) ?? '-'
  if (deliveryDates && deliveryDates.length > 0) return deliveryDates.map((d) => `${d.seq}차: ${d.date}`).join(' / ')
  return '-'
}
