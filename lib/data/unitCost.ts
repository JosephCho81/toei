import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeOne } from '@/lib/utils/normalize'
import {
  buildRoundUnitCost, type AllocationBasis, type RoundUnitCost, type UnitCostItemInput,
} from '@/lib/calculations/unitCost'

const SELECT = `
  id, round_no, round_label, lc_open_date, customs_date,
  manufacturers(name),
  transaction_items(spec,glove_type,color,size,unit,unit_price_usd,quantity,sort_order),
  interim_settlements(confirmed_amount_krw,system_amount_krw),
  closing_settlements(confirmed_amount_krw,system_amount_krw)
`

interface SettlementAmounts {
  confirmed_amount_krw: number | string | null
  system_amount_krw: number | string | null
}

/** 확정금액 우선, 없으면 시스템 계산값. 둘 다 없으면 정산이 없는 것으로 본다. */
function settledKrw(row: unknown): number | null {
  const s = normalizeOne(row) as SettlementAmounts | null
  if (!s) return null
  const raw = s.confirmed_amount_krw ?? s.system_amount_krw
  if (raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export const DEFAULT_ROUND_FROM = 23
export const DEFAULT_ROUND_TO = 39

/** 차수 범위의 제품별 원가. 품목이 하나도 없는 차수는 제외한다. */
export async function loadUnitCosts(
  supabase: SupabaseClient,
  opts: { from: number; to: number; basis: AllocationBasis }
): Promise<RoundUnitCost[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(SELECT)
    .gte('round_no', opts.from)
    .lte('round_no', opts.to)
    .order('round_no')

  if (error) throw new Error(`제품별 원가 조회 실패: ${error.message}`)

  return ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .map((t) => {
      const mfr = normalizeOne(t.manufacturers) as { name: string } | null
      return buildRoundUnitCost({
        transactionId: String(t.id),
        roundNo: Number(t.round_no),
        roundLabel: String(t.round_label ?? ''),
        manufacturer: mfr?.name ?? '',
        lcOpenDate: (t.lc_open_date as string | null) ?? null,
        customsDate: (t.customs_date as string | null) ?? null,
        interimKrw: settledKrw(t.interim_settlements),
        closingKrw: settledKrw(t.closing_settlements),
        items: (t.transaction_items as UnitCostItemInput[] | null) ?? [],
      }, opts.basis)
    })
    .filter((r) => r.items.length > 0)
}

/** ?from=&to=&basis= 파싱. 잘못된 값은 기본값으로 되돌린다. */
export function parseUnitCostParams(sp: {
  from?: string; to?: string; basis?: string
}): { from: number; to: number; basis: AllocationBasis } {
  const from = Number.parseInt(sp.from ?? '', 10)
  const to = Number.parseInt(sp.to ?? '', 10)
  const validFrom = Number.isInteger(from) && from > 0 ? from : DEFAULT_ROUND_FROM
  const validTo = Number.isInteger(to) && to > 0 ? to : DEFAULT_ROUND_TO
  return {
    from: Math.min(validFrom, validTo),
    to: Math.max(validFrom, validTo),
    basis: sp.basis === 'quantity' ? 'quantity' : 'amount',
  }
}
