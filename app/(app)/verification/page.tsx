import { readFileSync, readdirSync, existsSync } from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import { calculateInterim, type RoundingPolicy } from '@/lib/calculations/interim'
import { cn } from '@/lib/utils'

// ─── CSV 파싱 ──────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  // BOM 제거
  const content = text.startsWith('﻿') ? text.slice(1) : text

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    const next = content[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(cell.trim())
        cell = ''
      } else if (ch === '\r' && next === '\n') {
        row.push(cell.trim())
        rows.push(row)
        row = []
        cell = ''
        i++
      } else if (ch === '\n') {
        row.push(cell.trim())
        rows.push(row)
        row = []
        cell = ''
      } else {
        cell += ch
      }
    }
  }

  if (cell || row.length > 0) {
    row.push(cell.trim())
    rows.push(row)
  }

  return rows
}

function parseKrwStr(s: string): number | null {
  if (!s) return null
  const cleaned = s.replace(/[₩\s,]/g, '').replace(/[^0-9\-]/g, '')
  if (!cleaned) return null
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? null : n
}

/** 중간정산.csv에서 차수별 ①엑셀 계산값(Col 11) 추출 */
function parseExcelValues(): Map<number, number> {
  const result = new Map<number, number>()
  const csvPath = path.join(process.cwd(), '_source_docs', '중간정산.csv')
  if (!existsSync(csvPath)) return result

  const text = readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(text)

  for (const row of rows) {
    if (row.length < 12) continue
    const col0 = row[0]
    const match = col0.match(/^(\d+)차/)
    if (!match) continue
    const roundNo = parseInt(match[1], 10)
    const value = parseKrwStr(row[11])
    if (value && value > 0) {
      result.set(roundNo, value)
    }
  }

  return result
}

// ─── 원본 문서 파싱 ────────────────────────────────────────────────────────

function extractSpacedNumber(content: string, charPattern: RegExp): number | null {
  const m = content.match(charPattern)
  if (!m) return null
  const raw = m[1].replace(/,/g, '')
  const n = parseInt(raw, 10)
  return isNaN(n) ? null : n
}

/** (N차) *.txt 파싱 → 운송비 + 통관보수료 + 검역수수료 합산 */
function parseSourceDoc(roundNo: number): number | 'no_invoice' | null {
  const sourceDir = path.join(process.cwd(), '_source_docs')
  if (!existsSync(sourceDir)) return null

  const files = readdirSync(sourceDir)
  const prefix = `(${String(roundNo).padStart(2, '0')}차)`
  const file = files.find(f => f.startsWith(prefix) && f.endsWith('.txt'))
  if (!file) return null

  const content = readFileSync(path.join(sourceDir, file), 'utf-8')
  const lines = content.split('\n').map(l => l.trim())

  let total = 0
  let foundInvoice = false

  // 구형 (1~8차 팩마린): "TOTAL AMOUNT : KRW {amount}"
  const oldRe = /TOTAL\s+AMOUNT\s*:\s*KRW\s+([\d,]+)/g
  let m: RegExpExecArray | null
  while ((m = oldRe.exec(content)) !== null) {
    total += parseInt(m[1].replace(/,/g, ''), 10)
    foundInvoice = true
  }

  // 신형 (13차+ 오션마스터): 라인 패턴 "{amount}" → "KRW" → "Total Amount"
  for (let i = 2; i < lines.length; i++) {
    if (lines[i] === 'Total Amount' && lines[i - 1] === 'KRW') {
      const amtStr = lines[i - 2].replace(/,/g, '')
      const amt = parseInt(amtStr, 10)
      if (!isNaN(amt) && amt > 0) {
        total += amt
        foundInvoice = true
      }
    }
  }

  if (!foundInvoice) return 'no_invoice'

  // 통관자금 정산서: 통관보수료 + 겸역수수료(검역수수료)
  const brokerage = extractSpacedNumber(
    content,
    /통[\s]*관[\s]*보[\s]*수[\s]*료[\s:]*([0-9][0-9,]*)/
  )
  const quarantine = extractSpacedNumber(
    content,
    /겸[\s]*역[\s]*수[\s]*수[\s]*료[\s:]*([0-9][0-9,]*)/
  ) ?? extractSpacedNumber(
    content,
    /검[\s]*역[\s]*수[\s]*수[\s]*료[\s:]*([0-9][0-9,]*)/
  )

  if (brokerage && brokerage > 0) total += brokerage
  if (quarantine && quarantine > 0) total += quarantine

  return total
}

// ─── 숫자 포맷 ─────────────────────────────────────────────────────────────

function fmtKrw(v: number): string {
  return v.toLocaleString('ko-KR') + '원'
}

function fmtDiff(v: number): string {
  const abs = Math.abs(v)
  const sign = v >= 0 ? '+' : '-'
  return `${sign}${abs.toLocaleString('ko-KR')}`
}

// ─── 상태 판정 ──────────────────────────────────────────────────────────────

type Status = '일치' | '반올림' | '불일치' | '미입력'

function getStatus(excel: number | null, system: number | null): Status {
  if (excel === null || system === null) return '미입력'
  const diff = Math.abs(excel - system)
  if (diff === 0) return '일치'
  if (diff <= 100) return '반올림'
  return '불일치'
}

// ─── 페이지 ────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

interface RoundRow {
  roundNo: number
  excelValue: number | null
  systemValue: number | null
  sourceDocValue: number | 'no_invoice' | null
  dbValue: number | null
}

export default async function VerificationPage() {
  const excelValues = parseExcelValues()

  const supabase = await createClient()

  const { data: txns } = await supabase
    .from('transactions')
    .select('id, round_no, import_amount_usd, margin_rate_pct')
    .order('round_no')

  const { data: interims } = await supabase
    .from('interim_settlements')
    .select('id, transaction_id, customs_exchange_rate, rounding_policy, confirmed_amount_krw')

  const interimByTxId = new Map(
    (interims ?? []).map(i => [i.transaction_id, i])
  )

  const interimIds = (interims ?? []).map(i => i.id)
  const { data: costItems } = interimIds.length > 0
    ? await supabase
        .from('interim_cost_items')
        .select('interim_settlement_id, amount_krw')
        .in('interim_settlement_id', interimIds)
    : { data: [] }

  const costSumByInterim = new Map<string, number>()
  for (const item of costItems ?? []) {
    const sid = (item as { interim_settlement_id: string; amount_krw: number }).interim_settlement_id
    const amt = (item as { interim_settlement_id: string; amount_krw: number }).amount_krw ?? 0
    costSumByInterim.set(sid, (costSumByInterim.get(sid) ?? 0) + amt)
  }

  // 전체 차수 목록: CSV + DB 합집합
  const allRounds = new Set<number>([
    ...excelValues.keys(),
    ...(txns ?? []).map(t => t.round_no),
  ])

  const rows: RoundRow[] = Array.from(allRounds)
    .sort((a, b) => a - b)
    .map(roundNo => {
      const tx = txns?.find(t => t.round_no === roundNo)
      const interim = tx ? interimByTxId.get(tx.id) : undefined

      let systemValue: number | null = null
      if (tx && interim && tx.import_amount_usd && interim.customs_exchange_rate) {
        const totalCostKrw = costSumByInterim.get(interim.id) ?? 0
        const calc = calculateInterim({
          importAmountUsd: tx.import_amount_usd,
          customsExchangeRate: interim.customs_exchange_rate,
          marginRatePct: tx.margin_rate_pct ?? 0,
          costItems: [{ amountKrw: totalCostKrw }],
          roundingPolicy: (interim.rounding_policy as RoundingPolicy) ?? 'floor_100',
        })
        systemValue = calc.confirmedKrw
      }

      return {
        roundNo,
        excelValue: excelValues.get(roundNo) ?? null,
        systemValue,
        sourceDocValue: parseSourceDoc(roundNo),
        dbValue: (interim as { confirmed_amount_krw?: number } | undefined)?.confirmed_amount_krw ?? null,
      }
    })

  // ─── 요약 집계 ──────────────────────────────────────────────────────────

  const total = rows.length
  const mismatch12 = rows.filter(r => {
    if (r.excelValue === null || r.systemValue === null) return false
    return Math.abs(r.excelValue - r.systemValue) > 100
  }).length
  const mismatch13 = rows.filter(r => {
    if (r.excelValue === null || typeof r.sourceDocValue !== 'number') return false
    return Math.abs(r.excelValue - r.sourceDocValue) > 100
  }).length
  const mismatch23 = rows.filter(r => {
    if (r.systemValue === null || typeof r.sourceDocValue !== 'number') return false
    return Math.abs(r.systemValue - r.sourceDocValue) > 100
  }).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold">검증 리포트</h2>
        <span className="text-xs text-orange-500 font-medium border border-orange-300 rounded px-1.5 py-0.5">
          임시
        </span>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '전체 차수', value: total, color: 'text-foreground' },
          { label: '①vs② 불일치', value: mismatch12, color: mismatch12 > 0 ? 'text-red-600' : 'text-green-600' },
          { label: '①vs③ 불일치', value: mismatch13, color: mismatch13 > 0 ? 'text-amber-600' : 'text-green-600' },
          { label: '②vs③ 불일치', value: mismatch23, color: mismatch23 > 0 ? 'text-amber-600' : 'text-green-600' },
        ].map(card => (
          <div key={card.label} className="rounded-lg border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={cn('text-2xl font-bold', card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* 설명 */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>① 엑셀 계산값: 중간정산.csv Col 11 (+ 부가세 제외 7%/5%)</p>
        <p>② 시스템 계산값: calculateInterim() 실시간 계산 (DB 데이터)</p>
        <p>③ 원본 문서값: _source_docs/(N차)*.txt 파싱 — 운송비 인보이스 합산 + 통관보수료 + 겸역수수료 (관세·부가세 제외, 9~12차는 인보이스 없음)</p>
        <p>④ DB 확정값: interim_settlements.confirmed_amount_krw (수기 입력)</p>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">차수</th>
              <th className="text-right px-3 py-2 font-medium whitespace-nowrap">①엑셀계산값</th>
              <th className="text-right px-3 py-2 font-medium whitespace-nowrap">②시스템계산값</th>
              <th className="text-right px-3 py-2 font-medium whitespace-nowrap">③원본문서값</th>
              <th className="text-right px-3 py-2 font-medium whitespace-nowrap">④DB확정값</th>
              <th className="text-right px-3 py-2 font-medium whitespace-nowrap">①-②차이</th>
              <th className="text-right px-3 py-2 font-medium whitespace-nowrap">①-③차이</th>
              <th className="text-right px-3 py-2 font-medium whitespace-nowrap">②-③차이</th>
              <th className="text-center px-3 py-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const status = getStatus(row.excelValue, row.systemValue)
              const diff12 = row.excelValue !== null && row.systemValue !== null
                ? row.excelValue - row.systemValue : null
              const diff13 = row.excelValue !== null && typeof row.sourceDocValue === 'number'
                ? row.excelValue - row.sourceDocValue : null
              const diff23 = row.systemValue !== null && typeof row.sourceDocValue === 'number'
                ? row.systemValue - row.sourceDocValue : null

              const statusCls = {
                '일치': 'bg-green-100 text-green-700',
                '반올림': 'bg-blue-100 text-blue-700',
                '불일치': 'bg-red-100 text-red-700',
                '미입력': 'bg-muted text-muted-foreground',
              }[status]

              const rowCls = status === '불일치' ? 'bg-red-50/40' : ''

              return (
                <tr key={row.roundNo} className={cn('border-b hover:bg-muted/30 transition-colors', rowCls)}>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{row.roundNo}차</td>
                  <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                    {row.excelValue !== null ? fmtKrw(row.excelValue) : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                    {row.systemValue !== null ? fmtKrw(row.systemValue) : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                    {row.sourceDocValue === 'no_invoice'
                      ? <span className="text-muted-foreground text-xs">인보이스 없음</span>
                      : row.sourceDocValue !== null
                        ? fmtKrw(row.sourceDocValue)
                        : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                    {row.dbValue !== null ? fmtKrw(row.dbValue) : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className={cn('px-3 py-2 text-right font-mono whitespace-nowrap text-xs', diff12 !== null && Math.abs(diff12) > 100 ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>
                    {diff12 !== null ? fmtDiff(diff12) : '-'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono whitespace-nowrap text-xs text-muted-foreground">
                    {diff13 !== null ? fmtDiff(diff13) : '-'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono whitespace-nowrap text-xs text-muted-foreground">
                    {diff23 !== null ? fmtDiff(diff23) : '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={cn('text-xs font-medium rounded px-1.5 py-0.5', statusCls)}>
                      {status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
