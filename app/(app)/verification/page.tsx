import { readFileSync, readdirSync } from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TxtItem { name: string; amountKrw: number }
interface DbItem { name: string; amountKrw: number }

interface CompRow {
  name: string
  txtAmt: number | null
  dbAmt: number | null
  diff: number | null
  status: 'ok' | 'minor' | 'bad' | 'txt_only' | 'db_only'
}

interface RoundResult {
  roundNo: number
  hasInvoice: boolean
  parseFailed: boolean
  rows: CompRow[]
  badCount: number
  minorCount: number
  txtOnlyCount: number
  dbOnlyCount: number
}

// ─── Name normalization ──────────────────────────────────────────────────────

function norm(s: string): string {
  return s
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .replace(/\bB\.?A\.?F\.?\b/g, 'BAF')
    .replace(/\bTRUCKING\s+FEE\b/g, 'TRUCKING')
    .replace(/겸역수수료/g, '검역수수료')
    .replace(/\s*\(VAT\)\s*/gi, '')
    .trim()
}

function namesMatch(a: string, b: string): boolean {
  const na = norm(a)
  const nb = norm(b)
  if (na === nb) return true
  // prefix match for PDF-truncated names (min 12 chars)
  if (na.length >= 12 && (nb.startsWith(na) || na.startsWith(nb))) return true
  return false
}

// ─── Old format parser (팩마린; 1~2차) ──────────────────────────────────────
// Line format: [USD_rate ] KRW_AMT [ VAT_AMT]ITEM_NAME ...rate.00exrate.00CURRNO

function parseOldInvoice(text: string): TxtItem[] {
  const items: TxtItem[] = []
  for (const raw of text.split('\n')) {
    const line = raw.replace(/ /g, ' ').trim()
    // Item lines end with CURRENCY + at least 1 digit
    if (!/(?:USD|KRW|EUR|CNY|SGD)\d+$/.test(line)) continue

    // [optional float rate] KRW_AMT [optional VAT] ITEM_NAME <lookahead: trailing decimal>
    const m = line.match(
      /^(?:[\d,]+\.\d+\s+)?(\d[\d,]+)(?:\s+\d[\d,]+)?([A-Z가-힣][A-Z가-힣\s./()&'\-]+?)(?=\s+[\d,]+\.)/
    )
    if (!m) continue

    const amt = parseInt(m[1].replace(/,/g, ''), 10)
    const name = m[2].replace(/\s*\(VAT\)\s*/gi, '').trim()
    if (amt > 0 && name) items.push({ name, amountKrw: amt })
  }
  return items
}

// ─── New format parser (오션마스터 vertical; 3~8차, 13~32차) ─────────────────
// Each item block (non-empty lines): VAT, KRW_AMT, AMT, UNIT_PRICE, QTY, UNIT,
//   [EX_RATE] (USD only), CURRENCY, ITEM_NAME
// KRW items: offset 6 back from name; USD/other: offset 7

const CURRENCIES = new Set(['USD', 'KRW', 'EUR', 'CNY', 'SGD', 'MYR'])
const SKIP_LINES = new Set([
  'S u b   T o t a l', 'T o t a l', 'Total Amount',
  'Freight', 'Amount(KRW)', 'Amount', 'Unit Price', 'QTY', 'Unit',
  'Ex-Rate', 'Curr', 'VAT',
])

function parseNewInvoice(text: string): TxtItem[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const items: TxtItem[] = []

  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1]
    if (!CURRENCIES.has(prev)) continue

    const name = lines[i]
    if (!name || SKIP_LINES.has(name)) continue
    if (/^[\d,.\s]+$/.test(name)) continue // numeric line
    if (/^\d{4}-\d{2}-\d{2}/.test(name)) continue // date
    if (/^(Print|Bank|Signed|Email|Tel|Fax|P\.I\.C|Address|Customer|Inv\.|B\/L|License|SISS|MRN)/i.test(name)) continue

    const offset = prev === 'KRW' ? 6 : 7
    if (i <= offset) continue

    const amtLine = lines[i - offset]
    const amt = parseInt(amtLine.replace(/,/g, ''), 10)
    if (!isNaN(amt) && amt > 0) {
      items.push({ name, amountKrw: amt })
    }
  }

  return items
}

// ─── Customs parser (통관보수료·검역수수료·관세) ─────────────────────────────

function parseCustoms(text: string): {
  brokerage: number | null
  quarantine: number | null
  duty: number | null
} {
  const t = text.replace(/ /g, ' ')

  const extractNum = (re: RegExp): number | null => {
    const m = t.match(re)
    if (!m) return null
    const n = parseInt(m[1].replace(/,/g, ''), 10)
    return isNaN(n) || n <= 0 ? null : n
  }

  return {
    brokerage: extractNum(/통[\s]*관[\s]*보[\s]*수[\s]*료[\s:]*([0-9][0-9,]*)/),
    quarantine:
      extractNum(/겸[\s]*역[\s]*수[\s]*수[\s]*료[\s:]*([0-9][0-9,]*)/) ??
      extractNum(/검[\s]*역[\s]*수[\s]*수[\s]*료[\s:]*([0-9][0-9,]*)/),
    duty: extractNum(/관[\s]*세(?!법)[\s:]*([0-9][0-9,]*)/),
  }
}

// ─── TXT file parser ─────────────────────────────────────────────────────────

// 9~12차: no shipping invoice by design
const KNOWN_NO_INVOICE = new Set([9, 10, 11, 12])

function parseTxt(
  roundNo: number,
  sourceDir: string,
  allFiles: string[]
): {
  shippingItems: TxtItem[]
  customsItems: TxtItem[]
  hasInvoice: boolean
  parseFailed: boolean
} {
  const prefix = `(${String(roundNo).padStart(2, '0')}차)`
  const file = allFiles.find(f => f.startsWith(prefix) && f.endsWith('.txt'))
  if (!file) return { shippingItems: [], customsItems: [], hasInvoice: false, parseFailed: false }

  let content: string
  try {
    content = readFileSync(path.join(sourceDir, file), 'utf-8')
  } catch {
    return { shippingItems: [], customsItems: [], hasInvoice: false, parseFailed: true }
  }

  // Split file into PDF sections
  const parts = content.split(/={5,}[^\n]*\n/g)

  const shipping: TxtItem[] = []
  let hasInvoice = false
  let brokerage: number | null = null
  let quarantine: number | null = null
  let duty: number | null = null

  for (const part of parts) {
    if (!part.trim()) continue

    // Detect invoice format
    const normalizedPart = part.replace(/ /g, ' ')
    const isNew =
      part.includes('Amount(KRW)') &&
      (part.includes('Total Amount') || part.includes('S u b   T o t a l'))
    const isOld =
      !isNew && /(?:USD|KRW|EUR|CNY|SGD)\d+\s*$/m.test(normalizedPart)

    if (isNew) {
      const items = parseNewInvoice(part)
      if (items.length > 0) { shipping.push(...items); hasInvoice = true }
    } else if (isOld) {
      const items = parseOldInvoice(part)
      if (items.length > 0) { shipping.push(...items); hasInvoice = true }
    }

    // Customs parsing runs on every section
    const c = parseCustoms(part)
    if (c.brokerage !== null && brokerage === null) brokerage = c.brokerage
    if (c.quarantine !== null && quarantine === null) quarantine = c.quarantine
    if (c.duty !== null && duty === null) duty = c.duty
  }

  const parseFailed = !hasInvoice && !KNOWN_NO_INVOICE.has(roundNo)

  const customsItems: TxtItem[] = [
    ...(brokerage ? [{ name: '통관보수료', amountKrw: brokerage }] : []),
    ...(quarantine ? [{ name: '검역수수료', amountKrw: quarantine }] : []),
    ...(duty ? [{ name: '관세', amountKrw: duty }] : []),
  ]

  return { shippingItems: shipping, customsItems, hasInvoice, parseFailed }
}

// ─── Comparison builder ──────────────────────────────────────────────────────

function buildRows(txtItems: TxtItem[], dbItems: DbItem[]): CompRow[] {
  const rows: CompRow[] = []
  const usedDb = new Set<number>()

  for (const txt of txtItems) {
    const idx = dbItems.findIndex((db, i) => !usedDb.has(i) && namesMatch(txt.name, db.name))
    if (idx >= 0) {
      usedDb.add(idx)
      const diff = txt.amountKrw - dbItems[idx].amountKrw
      const abs = Math.abs(diff)
      rows.push({
        name: txt.name,
        txtAmt: txt.amountKrw,
        dbAmt: dbItems[idx].amountKrw,
        diff,
        status: abs === 0 ? 'ok' : abs <= 100 ? 'minor' : 'bad',
      })
    } else {
      rows.push({ name: txt.name, txtAmt: txt.amountKrw, dbAmt: null, diff: null, status: 'txt_only' })
    }
  }

  dbItems.forEach((db, i) => {
    if (!usedDb.has(i)) {
      rows.push({ name: db.name, txtAmt: null, dbAmt: db.amountKrw, diff: null, status: 'db_only' })
    }
  })

  return rows
}

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtKrw(v: number): string {
  return v.toLocaleString('ko-KR')
}

function fmtDiff(v: number): string {
  return (v >= 0 ? '+' : '') + v.toLocaleString('ko-KR')
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function VerificationPage() {
  const supabase = await createClient()
  const sourceDir = path.join(process.cwd(), '_source_docs')
  const allFiles = readdirSync(sourceDir)

  // ── DB: transactions
  const { data: txns } = await supabase
    .from('transactions')
    .select('id, round_no')
    .order('round_no')

  const txnByRound = new Map((txns ?? []).map(t => [t.round_no as number, t.id as string]))
  const txnIds = (txns ?? []).map(t => t.id as string)

  // ── DB: forwarding quotes + items
  const { data: fqs } = await supabase
    .from('forwarding_quotes')
    .select('id, transaction_id')
    .in('transaction_id', txnIds)

  const fqByTxn = new Map((fqs ?? []).map(fq => [fq.transaction_id as string, fq.id as string]))
  const fqIds = (fqs ?? []).map(fq => fq.id as string)

  const { data: fqiRows } = await supabase
    .from('forwarding_quote_items')
    .select('forwarding_quote_id, item_name, amount_krw')
    .in('forwarding_quote_id', fqIds)
    .order('sort_order')

  const fqiByFq = new Map<string, DbItem[]>()
  for (const r of fqiRows ?? []) {
    const list = fqiByFq.get(r.forwarding_quote_id) ?? []
    list.push({ name: r.item_name, amountKrw: Number(r.amount_krw) })
    fqiByFq.set(r.forwarding_quote_id, list)
  }

  // ── DB: interim settlements + customs cost items
  const { data: interims } = await supabase
    .from('interim_settlements')
    .select('id, transaction_id')
    .in('transaction_id', txnIds)

  const interimByTxn = new Map(
    (interims ?? []).map(i => [i.transaction_id as string, i.id as string])
  )
  const interimIds = (interims ?? []).map(i => i.id as string)

  const { data: iciRows } = await supabase
    .from('interim_cost_items')
    .select('interim_settlement_id, item_name, amount_krw, group_type')
    .in('interim_settlement_id', interimIds)
    .eq('group_type', 'customs')
    .order('sort_order')

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

    const txt = parseTxt(rn, sourceDir, allFiles)

    const fqId = fqByTxn.get(txnId)
    const interimId = interimByTxn.get(txnId)

    const dbShipping: DbItem[] = fqId ? (fqiByFq.get(fqId) ?? []) : []
    const dbCustoms: DbItem[] = interimId ? (iciByInterim.get(interimId) ?? []) : []

    const rows = [
      ...buildRows(txt.shippingItems, dbShipping),
      ...buildRows(txt.customsItems, dbCustoms),
    ]

    rounds.push({
      roundNo: rn,
      hasInvoice: txt.hasInvoice,
      parseFailed: txt.parseFailed,
      rows,
      badCount: rows.filter(r => r.status === 'bad').length,
      minorCount: rows.filter(r => r.status === 'minor').length,
      txtOnlyCount: rows.filter(r => r.status === 'txt_only').length,
      dbOnlyCount: rows.filter(r => r.status === 'db_only').length,
    })
  }

  // ── Summary stats
  const totalMismatchRounds = rounds.filter(r => r.badCount > 0).length
  const totalBadItems = rounds.reduce((s, r) => s + r.badCount, 0)
  const totalDbMissing = rounds.reduce((s, r) => s + r.txtOnlyCount, 0)

  return (
    <div className="space-y-5 max-w-5xl">
      <h2 className="text-2xl font-bold">txt vs DB 항목별 검증</h2>

      {/* Summary */}
      <div className="flex gap-3">
        {([
          { label: '불일치 차수', value: totalMismatchRounds },
          { label: '불일치 항목', value: totalBadItems },
          { label: 'DB 미입력', value: totalDbMissing },
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
            round.parseFailed || round.badCount > 0 || round.txtOnlyCount > 0 ? '🔴'
            : round.minorCount > 0 ? '⚠️'
            : '✅'

          const label = round.parseFailed
            ? '파싱불가'
            : !round.hasInvoice
            ? '인보이스 없음'
            : round.badCount > 0
            ? `${round.badCount}개 불일치`
            : round.txtOnlyCount > 0
            ? `DB미입력 ${round.txtOnlyCount}개`
            : round.minorCount > 0
            ? `${round.minorCount}개 소액차이`
            : '전체 일치'

          const hasDbOnly = round.dbOnlyCount > 0

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
                {hasDbOnly && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    DB전용 {round.dbOnlyCount}개
                  </span>
                )}
              </summary>

              {round.rows.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground border-t">
                  {round.parseFailed
                    ? '파싱 실패 — 지원되지 않는 형식 (SY Logistics 등)'
                    : '비교 가능한 항목 없음'}
                </p>
              ) : (
                <div className="overflow-x-auto border-t">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 text-left">
                        <th className="px-3 py-1.5 font-medium whitespace-nowrap">항목명</th>
                        <th className="px-3 py-1.5 font-medium text-right whitespace-nowrap">txt 원본값</th>
                        <th className="px-3 py-1.5 font-medium text-right whitespace-nowrap">DB 입력값</th>
                        <th className="px-3 py-1.5 font-medium text-right whitespace-nowrap">차이</th>
                        <th className="px-3 py-1.5 font-medium text-center w-10">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {round.rows.map((row, i) => {
                        const rowIcon =
                          row.status === 'ok' ? '✅'
                          : row.status === 'minor' ? '⚠️'
                          : row.status === 'bad' ? '🔴'
                          : row.status === 'txt_only' ? '←'
                          : '→'

                        const rowBg =
                          row.status === 'bad' ? 'bg-red-50/70 dark:bg-red-950/20'
                          : row.status === 'minor' ? 'bg-amber-50/60 dark:bg-amber-950/20'
                          : row.status === 'txt_only' ? 'bg-sky-50/50 dark:bg-sky-950/20'
                          : row.status === 'db_only' ? 'bg-muted/30'
                          : ''

                        const diffCls =
                          row.status === 'bad' ? 'text-red-600 font-semibold'
                          : row.status === 'minor' ? 'text-amber-600'
                          : 'text-muted-foreground'

                        return (
                          <tr key={i} className={cn('border-t', rowBg)}>
                            <td className="px-3 py-1.5 font-mono whitespace-nowrap">{row.name}</td>
                            <td className="px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap">
                              {row.txtAmt !== null
                                ? fmtKrw(row.txtAmt)
                                : <span className="text-muted-foreground">-</span>}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap">
                              {row.dbAmt !== null
                                ? fmtKrw(row.dbAmt)
                                : <span className="text-muted-foreground">-</span>}
                            </td>
                            <td className={cn(
                              'px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap',
                              diffCls
                            )}>
                              {row.diff !== null ? fmtDiff(row.diff) : '-'}
                            </td>
                            <td className="px-3 py-1.5 text-center">{rowIcon}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </details>
          )
        })}
      </div>

      {/* Legend */}
      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t">
        <span>✅ 일치</span>
        <span>⚠️ 소액차이 (≤100원)</span>
        <span>🔴 불일치 (&gt;100원)</span>
        <span>← DB미입력 (txt만 존재)</span>
        <span>→ DB전용 (DB만 존재)</span>
      </div>
    </div>
  )
}
