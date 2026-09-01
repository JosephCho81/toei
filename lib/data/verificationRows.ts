import type { CostItem, RoundingPolicy, VatMode } from '@/lib/calculations/interim'
import { interimDiffKrw } from '@/lib/calculations/settlementDiff'
import { normalizeOne } from '@/lib/utils/normalize'
import type { VerRow } from '@/components/dashboard/VerificationIssueCard'

/** `[검증]` 메모가 달린 중간정산을 재계산해 확정금액과의 차이를 낸다. */
export const VERIFICATION_SELECT =
  'id, notes, confirmed_amount_krw, rounding_policy, vat_mode, customs_exchange_rate,'
  + ' transactions(id, round_no, round_label, import_amount_usd, margin_rate_pct),'
  + ' interim_cost_items(amount_krw, is_import_vat, is_vat_taxable, vat_amount_krw)'

type RawTx = {
  id: string; round_no: number; round_label: string
  import_amount_usd: number | null; margin_rate_pct: number | null
}

type RawRow = {
  id: string
  notes: string | null
  confirmed_amount_krw: number | null
  rounding_policy: string | null
  vat_mode: string | null
  customs_exchange_rate: number | null
  transactions: RawTx | RawTx[] | null
  interim_cost_items: {
    amount_krw: number | null
    is_import_vat: boolean | null
    is_vat_taxable: boolean | null
    vat_amount_krw: number | null
  }[] | null
}

export function buildVerificationRows(rows: unknown): VerRow[] {
  return ((rows ?? []) as RawRow[]).map((row) => {
    const tx = normalizeOne(row.transactions)
    return {
      id: row.id,
      notes: row.notes,
      confirmed_amount_krw: row.confirmed_amount_krw,
      round_label: tx?.round_label ?? '-',
      transaction_id: tx?.id ?? '',
      diff: diffKrw(row, tx),
    }
  })
}

function diffKrw(row: RawRow, tx: RawTx | null): number | null {
  if (!tx) return null
  const costItems: CostItem[] = (row.interim_cost_items ?? []).map((c) => ({
    amountKrw: Number(c.amount_krw) || 0,
    isImportVat: Boolean(c.is_import_vat),
    isVatTaxable: Boolean(c.is_vat_taxable),
    vatAmountKrw: Number(c.vat_amount_krw) || 0,
  }))
  return interimDiffKrw({
    confirmedKrw: row.confirmed_amount_krw != null ? Number(row.confirmed_amount_krw) : null,
    importAmountUsd: tx.import_amount_usd != null ? Number(tx.import_amount_usd) : null,
    customsExchangeRate: row.customs_exchange_rate != null ? Number(row.customs_exchange_rate) : null,
    marginRatePct: tx.margin_rate_pct != null ? Number(tx.margin_rate_pct) : null,
    costItems,
    roundingPolicy: (row.rounding_policy as RoundingPolicy) ?? 'none',
    vatMode: row.vat_mode === 'inclusive' ? 'inclusive' : ('exclusive' as VatMode),
  })
}
