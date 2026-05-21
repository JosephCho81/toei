import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { formatKrw, formatDiff } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

// ─── Types ──────────────────────────────────────────────────────────────────

interface SrcItem { name: string; amountKrw: number }
interface DbItem  { name: string; amountKrw: number }

interface CompRow {
  name: string
  srcAmt: number | null
  dbAmt:  number | null
  diff:   number | null
  status: 'ok' | 'minor' | 'bad' | 'src_only' | 'db_only'
}

interface RoundResult {
  roundNo: number
  hasInvoice: boolean
  customsParseFailed: boolean
  invoiceRows: CompRow[]
  customsRows: CompRow[]
  badCount:    number
  minorCount:  number
  srcOnlyCount: number
  dbOnlyCount:  number
}

// ─── Name normalization ──────────────────────────────────────────────────────

function norm(s: string): string {
  return s
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .replace(/\bB\.?A\.?F\.?\b/g, 'BAF')
    .replace(/\bTRUCKING\s+FEE\b/g, 'TRUCKING')
    .replace(/겸역수수료/g, '검역수수료')
    .replace(/\bINSUARANCE\s+CHARGE\b/g, 'INSURANCE FEE')
    .replace(/\bCNTR\s+CLEANING\s+FEE\b/g, 'CLEANING FEE')
    .replace(/\s*\(VAT\)\s*/gi, '')
    .trim()
}

function namesMatch(a: string, b: string): boolean {
  const na = norm(a)
  const nb = norm(b)
  if (na === nb) return true
  if (na.length >= 12 && (nb.startsWith(na) || na.startsWith(nb))) return true
  return false
}

// ─── Comparison builder ──────────────────────────────────────────────────────

function buildRows(srcItems: SrcItem[], dbItems: DbItem[]): CompRow[] {
  const rows: CompRow[] = []
  const usedDb = new Set<number>()

  for (const src of srcItems) {
    const idx = dbItems.findIndex((db, i) => !usedDb.has(i) && namesMatch(src.name, db.name))
    if (idx >= 0) {
      usedDb.add(idx)
      const diff = src.amountKrw - dbItems[idx].amountKrw
      const abs = Math.abs(diff)
      rows.push({
        name: src.name,
        srcAmt: src.amountKrw,
        dbAmt: dbItems[idx].amountKrw,
        diff,
        status: abs === 0 ? 'ok' : abs <= 100 ? 'minor' : 'bad',
      })
    } else {
      rows.push({ name: src.name, srcAmt: src.amountKrw, dbAmt: null, diff: null, status: 'src_only' })
    }
  }

  dbItems.forEach((db, i) => {
    if (!usedDb.has(i)) {
      rows.push({ name: db.name, srcAmt: null, dbAmt: db.amountKrw, diff: null, status: 'db_only' })
    }
  })

  return rows
}

// ─── Row renderer ────────────────────────────────────────────────────────────

function CompRows({ rows }: { rows: CompRow[] }) {
  return (
    <>
      {rows.map((row, i) => {
        const rowIcon =
          row.status === 'ok'       ? '✅'
          : row.status === 'minor'  ? '⚠️'
          : row.status === 'bad'    ? '🔴'
          : row.status === 'src_only' ? '←'
          : '→'

        const rowBg =
          row.status === 'bad'      ? 'bg-red-50/70 dark:bg-red-950/20'
          : row.status === 'minor'  ? 'bg-amber-50/60 dark:bg-amber-950/20'
          : row.status === 'src_only' ? 'bg-sky-50/50 dark:bg-sky-950/20'
          : row.status === 'db_only'  ? 'bg-muted/30'
          : ''

        const diffCls =
          row.status === 'bad'     ? 'text-red-600 font-semibold'
          : row.status === 'minor' ? 'text-amber-600'
          : 'text-muted-foreground'

        return (
          <tr key={i} className={cn('border-t', rowBg)}>
            <td className="px-3 py-1.5 font-mono whitespace-nowrap">{row.name}</td>
            <td className="px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap">
              {row.srcAmt !== null
                ? formatKrw(row.srcAmt)
                : <span className="text-muted-foreground">-</span>}
            </td>
            <td className="px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap">
              {row.dbAmt !== null
                ? formatKrw(row.dbAmt)
                : <span className="text-muted-foreground">-</span>}
            </td>
            <td className={cn(
              'px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap',
              diffCls
            )}>
              {row.diff !== null ? formatDiff(row.diff) : '-'}
            </td>
            <td className="px-3 py-1.5 text-center">{rowIcon}</td>
          </tr>
        )
      })}
    </>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function VerificationPage() {
  const supabase = await createClient()

  // ── DB: transactions
  const { data: txns } = await supabase
    .from('transactions')
    .select('id, round_no')
    .order('round_no')

  const txnByRound = new Map((txns ?? []).map(t => [t.round_no as number, t.id as string]))
  const txnIds = (txns ?? []).map(t => t.id as string)

  // ── DB: source_documents
  const { data: srcDocs } = await supabase
    .from('source_documents')
    .select('round_no, source_type, item_name, amount_krw')
    .order('round_no')

  type SrcEntry = { invoice: SrcItem[]; customs: SrcItem[]; customsParseFailed: boolean }
  const srcByRound = new Map<number, SrcEntry>()

  for (const row of (srcDocs ?? []).filter(r => r.item_name != null)) {
    const rn = row.round_no as number
    if (!srcByRound.has(rn)) {
      srcByRound.set(rn, { invoice: [], customs: [], customsParseFailed: false })
    }
    const entry = srcByRound.get(rn)!
    const itemName = row.item_name as string

    if (row.source_type === 'invoice') {
      if (!itemName.includes('파싱불가')) {
        entry.invoice.push({ name: itemName, amountKrw: Number(row.amount_krw) })
      }
    } else if (row.source_type === 'customs') {
      if (itemName.includes('파싱불가')) {
        entry.customsParseFailed = true
      } else if (itemName !== '부가세') {
        entry.customs.push({ name: itemName, amountKrw: Number(row.amount_krw) })
      }
    }
  }

  // ── DB: forwarding quotes + items (인보이스)
  const { data: fqs } = await supabase
    .from('forwarding_quotes')
    .select('id, transaction_id')
    .in('transaction_id', txnIds)

  const fqByTxn = new Map((fqs ?? []).map(fq => [fq.transaction_id as string, fq.id as string]))
  const fqIds = (fqs ?? []).map(fq => fq.id as string)

  const { data: fqiRows } = fqIds.length
    ? await supabase
        .from('forwarding_quote_items')
        .select('forwarding_quote_id, item_name, amount_krw')
        .in('forwarding_quote_id', fqIds)
        .order('sort_order')
    : { data: [] }

  const fqiByFq = new Map<string, DbItem[]>()
  for (const r of fqiRows ?? []) {
    const list = fqiByFq.get(r.forwarding_quote_id) ?? []
    list.push({ name: r.item_name, amountKrw: Number(r.amount_krw) })
    fqiByFq.set(r.forwarding_quote_id, list)
  }

  // ── DB: interim settlements + customs cost items (통관)
  const { data: interims } = await supabase
    .from('interim_settlements')
    .select('id, transaction_id')
    .in('transaction_id', txnIds)

  const interimByTxn = new Map(
    (interims ?? []).map(i => [i.transaction_id as string, i.id as string])
  )
  const interimIds = (interims ?? []).map(i => i.id as string)

  const { data: iciRows } = interimIds.length
    ? await supabase
        .from('interim_cost_items')
        .select('interim_settlement_id, item_name, amount_krw, group_type')
        .in('interim_settlement_id', interimIds)
        .eq('group_type', 'customs')
        .order('sort_order')
    : { data: [] }

  const iciByInterim = new Map<string, DbItem[]>()
  for (const r of iciRows ?? []) {
    const list = iciByInterim.get(r.interim_settlement_id) ?? []
    list.push({ name: r.item_name, amountKrw: Number(r.amount_krw) })
    iciByInterim.set(r.interim_settlement_id, list)
  }

  // ── Build per-round results
  const rounds: RoundResult[] = []

  for (let rn = 1; rn <= 33; rn++) {
    const txnId = txnByRound.get(rn)
    if (!txnId) continue

    const src = srcByRound.get(rn) ?? { invoice: [], customs: [], customsParseFailed: false }

    const fqId = fqByTxn.get(txnId)
    const interimId = interimByTxn.get(txnId)

    const dbInvoice: DbItem[] = fqId      ? (fqiByFq.get(fqId)           ?? []) : []
    const dbCustoms: DbItem[] = interimId ? (iciByInterim.get(interimId)  ?? []) : []

    const invoiceRows = buildRows(src.invoice, dbInvoice)
    const customsRows = src.customsParseFailed ? [] : buildRows(src.customs, dbCustoms)
    const allRows     = [...invoiceRows, ...customsRows]

    rounds.push({
      roundNo: rn,
      hasInvoice: src.invoice.length > 0,
      customsParseFailed: src.customsParseFailed,
      invoiceRows,
      customsRows,
      badCount:     allRows.filter(r => r.status === 'bad').length,
      minorCount:   allRows.filter(r => r.status === 'minor').length,
      srcOnlyCount: allRows.filter(r => r.status === 'src_only').length,
      dbOnlyCount:  allRows.filter(r => r.status === 'db_only').length,
    })
  }

  // ── Summary stats
  const totalMismatchRounds = rounds.filter(r => r.badCount > 0).length
  const totalBadItems       = rounds.reduce((s, r) => s + r.badCount, 0)
  const totalDbMissing      = rounds.reduce((s, r) => s + r.srcOnlyCount, 0)

  return (
    <div className="space-y-5 max-w-5xl">
      <h2 className="text-2xl font-bold">원본문서 vs DB 항목별 검증</h2>

      {/* Summary */}
      <div className="flex gap-3">
        {([
          { label: '불일치 차수', value: totalMismatchRounds },
          { label: '불일치 항목', value: totalBadItems },
          { label: 'DB 미입력',   value: totalDbMissing },
        ] as const).map(card => (
          <div key={card.label} className="rounded-lg border bg-card px-5 py-3 min-w-28">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={cn('text-2xl font-bold tabular-nums',
              card.value > 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Accordion per round */}
      <div className="space-y-1">
        {rounds.map(round => {
          const icon =
            round.badCount > 0 || round.srcOnlyCount > 0 ? '🔴'
            : round.minorCount > 0 || round.customsParseFailed ? '⚠️'
            : '✅'

          const label =
            round.badCount > 0    ? `${round.badCount}개 불일치`
            : round.srcOnlyCount > 0 ? `DB미입력 ${round.srcOnlyCount}개`
            : round.minorCount > 0   ? `${round.minorCount}개 소액차이`
            : !round.hasInvoice      ? '인보이스 없음'
            : round.customsParseFailed ? '전체 일치 (통관서파싱불가)'
            : '전체 일치'

          return (
            <details key={round.roundNo} className="group border rounded-lg overflow-hidden">
              <summary className={cn(
                'flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-muted/40',
                'select-none list-none [&::-webkit-details-marker]:hidden',
              )}>
                <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">
                  {round.roundNo}차
                </span>
                <span className="text-sm font-medium">{icon} {label}</span>
                {round.dbOnlyCount > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    DB전용 {round.dbOnlyCount}개
                  </span>
                )}
              </summary>

              <div className="overflow-x-auto border-t">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/30 text-left">
                      <th className="px-3 py-1.5 font-medium whitespace-nowrap">항목명</th>
                      <th className="px-3 py-1.5 font-medium text-right whitespace-nowrap">원본문서값</th>
                      <th className="px-3 py-1.5 font-medium text-right whitespace-nowrap">DB 입력값</th>
                      <th className="px-3 py-1.5 font-medium text-right whitespace-nowrap">차이</th>
                      <th className="px-3 py-1.5 font-medium text-center w-10">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 인보이스 항목 */}
                    <tr>
                      <td colSpan={5} className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/20 border-t">
                        [인보이스 항목]
                      </td>
                    </tr>
                    {round.invoiceRows.length > 0
                      ? <CompRows rows={round.invoiceRows} />
                      : (
                        <tr className="border-t">
                          <td colSpan={5} className="px-3 py-1.5 text-muted-foreground">
                            {round.hasInvoice ? '항목 없음' : '인보이스 없음'}
                          </td>
                        </tr>
                      )
                    }

                    {/* 통관 항목 */}
                    <tr>
                      <td colSpan={5} className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/20 border-t">
                        [통관 항목]
                      </td>
                    </tr>
                    {round.customsParseFailed
                      ? (
                        <tr className="border-t">
                          <td colSpan={5} className="px-3 py-1.5 text-amber-600 font-medium">
                            통관서 파싱불가
                          </td>
                        </tr>
                      )
                      : round.customsRows.length > 0
                      ? <CompRows rows={round.customsRows} />
                      : (
                        <tr className="border-t">
                          <td colSpan={5} className="px-3 py-1.5 text-muted-foreground">
                            항목 없음
                          </td>
                        </tr>
                      )
                    }
                  </tbody>
                </table>
              </div>
            </details>
          )
        })}
      </div>

      {/* Legend */}
      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t">
        <span>✅ 일치</span>
        <span>⚠️ 소액차이 (≤100원)</span>
        <span>🔴 불일치 (&gt;100원)</span>
        <span>← DB미입력 (원본만 존재)</span>
        <span>→ DB전용 (DB만 존재)</span>
      </div>
    </div>
  )
}
