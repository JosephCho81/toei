import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_UNIT } from '@/lib/constants/units'
import { parseIntegerStrict } from '@/lib/utils/number'
import { syncRows } from './syncRows'

export interface ItemEditRow {
  _key: string
  id?: string
  spec: string
  glove_type: string
  color: string
  size: string
  unit_price_usd: string
  quantity: string
  unit: string
}

/** 토에이 측 자료 금액 대조행 */
export interface CheckRow {
  _key: string
  id?: string
  label: string
  amount_usd: string
  note: string
}

export function blankItemRow(): ItemEditRow {
  return {
    _key: crypto.randomUUID(),
    spec: '', glove_type: '', color: '', size: '',
    unit_price_usd: '', quantity: '', unit: DEFAULT_UNIT,
  }
}

export function blankCheckRow(): CheckRow {
  return { _key: crypto.randomUUID(), label: '토에이 입력금액', amount_usd: '', note: '' }
}

const str = (v: unknown, fallback = '') => (v != null ? String(v) : fallback)

export async function loadTransactionItems(supabase: SupabaseClient, transactionId: string) {
  const [items, checks] = await Promise.all([
    supabase.from('transaction_items')
      .select('id,spec,glove_type,color,size,unit_price_usd,quantity,unit,sort_order')
      .eq('transaction_id', transactionId).order('sort_order'),
    supabase.from('transaction_amount_checks')
      .select('id,label,amount_usd,note,sort_order')
      .eq('transaction_id', transactionId).order('sort_order'),
  ])

  return {
    rows: (items.data ?? []).map((d): ItemEditRow => ({
      _key: crypto.randomUUID(),
      id: d.id as string,
      spec: str(d.spec), glove_type: str(d.glove_type),
      color: str(d.color), size: str(d.size),
      unit_price_usd: str(d.unit_price_usd), quantity: str(d.quantity),
      unit: str(d.unit, DEFAULT_UNIT) || DEFAULT_UNIT,
    })),
    checks: (checks.data ?? []).map((d): CheckRow => ({
      _key: crypto.randomUUID(),
      id: d.id as string,
      label: str(d.label, '토에이 입력금액'),
      amount_usd: str(d.amount_usd),
      note: str(d.note),
    })),
  }
}

/** 수량이 소수·음수인 행. parseInt 가 조용히 잘라 저장하므로 저장 전에 막는다. */
export function findBadQuantity(rows: ItemEditRow[]): ItemEditRow | undefined {
  return rows.find((r) => r.quantity.trim() !== '' && parseIntegerStrict(r.quantity) == null)
}

export async function saveTransactionItems(
  supabase: SupabaseClient,
  transactionId: string,
  rows: ItemEditRow[],
  checks: CheckRow[],
): Promise<string[]> {
  const itemErrors = await syncRows(supabase, {
    table: 'transaction_items',
    parentColumn: 'transaction_id',
    parentId: transactionId,
    rows: rows.filter((r) => r.spec || r.quantity || r.unit_price_usd),
    toPayload: (r, i) => ({
      spec: r.spec || null, glove_type: r.glove_type || null,
      color: r.color || null, size: r.size || null,
      unit_price_usd: r.unit_price_usd ? parseFloat(r.unit_price_usd) : null,
      quantity: r.quantity.trim() ? parseIntegerStrict(r.quantity) : null,
      unit: r.unit || DEFAULT_UNIT,
      sort_order: i,
    }),
  })

  const checkErrors = await syncRows(supabase, {
    table: 'transaction_amount_checks',
    parentColumn: 'transaction_id',
    parentId: transactionId,
    rows: checks.filter((c) => c.label.trim() || c.amount_usd || c.note.trim()),
    toPayload: (c, i) => ({
      label: c.label.trim() || '토에이 입력금액',
      amount_usd: c.amount_usd ? parseFloat(c.amount_usd) : null,
      note: c.note.trim() || null,
      sort_order: i,
    }),
  })

  return [...itemErrors, ...checkErrors]
}
