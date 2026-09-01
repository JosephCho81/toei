/**
 * 원본문서 항목과 DB 항목의 이름·금액 대조.
 * 문서마다 표기가 흔들려서(오타·약어·VAT 표기) 이름을 정규화한 뒤 짝을 맞춘다.
 */

export interface NamedAmount {
  name: string
  amountKrw: number
}

export type CompStatus = 'ok' | 'minor' | 'bad' | 'src_only' | 'db_only'

export interface CompRow {
  name: string
  srcAmt: number | null
  dbAmt: number | null
  diff: number | null
  status: CompStatus
}

/** 소액차이로 볼 상한. 이 위는 불일치로 본다. */
const MINOR_LIMIT_KRW = 100

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

/** 12자 이상이면 접두 일치도 같은 항목으로 본다 — 문서마다 뒤가 잘려 있는 경우가 있다. */
function namesMatch(a: string, b: string): boolean {
  const na = norm(a)
  const nb = norm(b)
  if (na === nb) return true
  return na.length >= 12 && (nb.startsWith(na) || na.startsWith(nb))
}

export function buildRows(srcItems: NamedAmount[], dbItems: NamedAmount[]): CompRow[] {
  const rows: CompRow[] = []
  const usedDb = new Set<number>()

  for (const src of srcItems) {
    const idx = dbItems.findIndex((db, i) => !usedDb.has(i) && namesMatch(src.name, db.name))
    if (idx < 0) {
      rows.push({ name: src.name, srcAmt: src.amountKrw, dbAmt: null, diff: null, status: 'src_only' })
      continue
    }
    usedDb.add(idx)
    const diff = src.amountKrw - dbItems[idx].amountKrw
    const abs = Math.abs(diff)
    rows.push({
      name: src.name,
      srcAmt: src.amountKrw,
      dbAmt: dbItems[idx].amountKrw,
      diff,
      status: abs === 0 ? 'ok' : abs <= MINOR_LIMIT_KRW ? 'minor' : 'bad',
    })
  }

  dbItems.forEach((db, i) => {
    if (!usedDb.has(i)) {
      rows.push({ name: db.name, srcAmt: null, dbAmt: db.amountKrw, diff: null, status: 'db_only' })
    }
  })

  return rows
}

export interface RoundResult {
  roundNo: number
  hasInvoice: boolean
  customsParseFailed: boolean
  invoiceRows: CompRow[]
  customsRows: CompRow[]
  badCount: number
  minorCount: number
  srcOnlyCount: number
  dbOnlyCount: number
}

export function summarizeRound(input: {
  roundNo: number
  hasInvoice: boolean
  customsParseFailed: boolean
  invoiceRows: CompRow[]
  customsRows: CompRow[]
}): RoundResult {
  const all = [...input.invoiceRows, ...input.customsRows]
  const count = (s: CompStatus) => all.filter((r) => r.status === s).length
  return {
    ...input,
    badCount: count('bad'),
    minorCount: count('minor'),
    srcOnlyCount: count('src_only'),
    dbOnlyCount: count('db_only'),
  }
}
