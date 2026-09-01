import type { SupabaseClient } from '@supabase/supabase-js'
import { buildRows, summarizeRound, type NamedAmount, type RoundResult } from './compare'

interface SrcEntry {
  invoice: NamedAmount[]
  customs: NamedAmount[]
  customsParseFailed: boolean
}

/**
 * 차수별 「원본문서 vs DB」 대조 결과.
 * 대상 차수는 `source_documents` 에 원본이 적재된 차수뿐이다 —
 * 상한을 코드에 박아두면 차수가 늘어날 때 조용히 빠진다.
 */
export async function loadVerification(supabase: SupabaseClient): Promise<RoundResult[]> {
  const { data: txns } = await supabase
    .from('transactions').select('id, round_no').order('round_no')
  const txnByRound = new Map((txns ?? []).map((t) => [t.round_no as number, t.id as string]))
  const txnIds = (txns ?? []).map((t) => t.id as string)

  const srcByRound = await loadSourceDocs(supabase)

  const [fqByTxn, fqiByFq] = await loadInvoiceItems(supabase, txnIds)
  const [interimByTxn, iciByInterim] = await loadCustomsItems(supabase, txnIds)

  return [...srcByRound.keys()].sort((a, b) => a - b).flatMap((rn) => {
    const txnId = txnByRound.get(rn)
    if (!txnId) return []
    const src = srcByRound.get(rn)!
    const fqId = fqByTxn.get(txnId)
    const interimId = interimByTxn.get(txnId)
    return [summarizeRound({
      roundNo: rn,
      hasInvoice: src.invoice.length > 0,
      customsParseFailed: src.customsParseFailed,
      invoiceRows: buildRows(src.invoice, fqId ? (fqiByFq.get(fqId) ?? []) : []),
      customsRows: src.customsParseFailed
        ? []
        : buildRows(src.customs, interimId ? (iciByInterim.get(interimId) ?? []) : []),
    })]
  })
}

async function loadSourceDocs(supabase: SupabaseClient): Promise<Map<number, SrcEntry>> {
  const { data } = await supabase
    .from('source_documents')
    .select('round_no, source_type, item_name, amount_krw')
    .order('round_no')

  const byRound = new Map<number, SrcEntry>()
  for (const row of (data ?? []).filter((r) => r.item_name != null)) {
    const rn = row.round_no as number
    if (!byRound.has(rn)) byRound.set(rn, { invoice: [], customs: [], customsParseFailed: false })
    const entry = byRound.get(rn)!
    const itemName = row.item_name as string
    const parseFailed = itemName.includes('파싱불가')

    if (row.source_type === 'invoice') {
      if (!parseFailed) entry.invoice.push({ name: itemName, amountKrw: Number(row.amount_krw) })
    } else if (row.source_type === 'customs') {
      if (parseFailed) entry.customsParseFailed = true
      // 부가세는 통관 항목 대조 대상이 아니다 (공급가 기준으로 맞춘다)
      else if (itemName !== '부가세') entry.customs.push({ name: itemName, amountKrw: Number(row.amount_krw) })
    }
  }
  return byRound
}

async function loadInvoiceItems(supabase: SupabaseClient, txnIds: string[]) {
  const { data: fqs } = await supabase
    .from('forwarding_quotes').select('id, transaction_id').in('transaction_id', txnIds)
  const fqByTxn = new Map((fqs ?? []).map((fq) => [fq.transaction_id as string, fq.id as string]))
  const fqIds = (fqs ?? []).map((fq) => fq.id as string)

  const { data: rows } = fqIds.length
    ? await supabase.from('forwarding_quote_items')
        .select('forwarding_quote_id, item_name, amount_krw')
        .in('forwarding_quote_id', fqIds).order('sort_order')
    : { data: [] }

  return [fqByTxn, groupBy(rows ?? [], 'forwarding_quote_id')] as const
}

async function loadCustomsItems(supabase: SupabaseClient, txnIds: string[]) {
  const { data: interims } = await supabase
    .from('interim_settlements').select('id, transaction_id').in('transaction_id', txnIds)
  const byTxn = new Map((interims ?? []).map((i) => [i.transaction_id as string, i.id as string]))
  const ids = (interims ?? []).map((i) => i.id as string)

  const { data: rows } = ids.length
    ? await supabase.from('interim_cost_items')
        .select('interim_settlement_id, item_name, amount_krw, group_type')
        .in('interim_settlement_id', ids).eq('group_type', 'customs').order('sort_order')
    : { data: [] }

  return [byTxn, groupBy(rows ?? [], 'interim_settlement_id')] as const
}

function groupBy(rows: Record<string, unknown>[], key: string): Map<string, NamedAmount[]> {
  const map = new Map<string, NamedAmount[]>()
  for (const r of rows) {
    const k = String(r[key])
    const list = map.get(k) ?? []
    list.push({ name: String(r.item_name), amountKrw: Number(r.amount_krw) })
    map.set(k, list)
  }
  return map
}
