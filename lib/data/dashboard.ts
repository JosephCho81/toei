import type { SupabaseClient } from '@supabase/supabase-js'
import { buildVerificationRows, VERIFICATION_SELECT } from '@/lib/data/verificationRows'
import { computeSettlementSchedule, scheduleState, type ScheduleState } from '@/lib/calculations/schedule'
import { normalizeOne } from '@/lib/utils/normalize'

/** LC 개설일이 이 해보다 이른 거래는 없다 — 기간 프리셋의 하한. */
export const EARLIEST_YEAR = 2021

export interface DashboardRow {
  id: string
  roundNo: number | null
  roundLabel: string
  manufacturer: string | null
  importAmountUsd: number
  lcOpenDate: string | null
  blNo: string | null
  mblNo: string | null
  /** containers.carrier 원문. 선사 판별은 이 이름으로 한다. */
  carrierName: string | null
  containerNo: string | null
  etd: string | null
  eta: string | null
  settlementStatus: SettlementStatus
  /** 중간정산: 예정일(휴일 보정 후) / 실제일 / 표시 상태 */
  interimDue: string | null
  interimActual: string | null
  interimState: ScheduleState
  /** 최종정산 */
  closingDue: string | null
  closingActual: string | null
  closingState: ScheduleState
  /** 2025-06-01 이전 개설분은 정산일 공식이 미확정이다 */
  scheduleApplicable: boolean
}

export type SettlementStatus =
  | 'pending' | 'interim_saved' | 'interim_done' | 'closing_saved' | 'closing_done'

type SettlementRow = { paid_date: string | null; is_locked: boolean | null } | null

/** v_transaction_status 의 CASE 와 같은 규칙. 뷰 대신 원본 테이블을 읽을 때 쓴다. */
function deriveStatus(interim: SettlementRow, closing: SettlementRow): SettlementStatus {
  if (closing?.is_locked === true) return 'closing_done'
  if (closing) return 'closing_saved'
  if (interim?.is_locked === true) return 'interim_done'
  if (interim) return 'interim_saved'
  return 'pending'
}

function firstDate(dates: (string | null)[]): string | null {
  const d = dates.filter(Boolean).sort() as string[]
  return d[0] ?? null
}
function lastDate(dates: (string | null)[]): string | null {
  const d = dates.filter(Boolean).sort() as string[]
  return d.at(-1) ?? null
}

type RawTx = {
  id: string
  round_no: number | null
  round_label: string
  lc_open_date: string | null
  import_amount_usd: number | null
  manufacturers: { name: string } | { name: string }[] | null
  containers: {
    bl_no: string | null; mbl_no: string | null; carrier: string | null; container_no: string | null
    etd: string | null; eta: string | null
  }[] | null
  interim_settlements: SettlementRow | SettlementRow[]
  closing_settlements: (SettlementRow & { closing_date?: string | null })
    | (SettlementRow & { closing_date?: string | null })[]
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export async function loadDashboardData(
  supabase: SupabaseClient,
  fromYear: string,
  toYear: string
) {
  const [{ data: rawTx }, { data: holidayRows }, { data: verificationIssues }] = await Promise.all([
    supabase
      .from('transactions')
      .select(`
        id, round_no, round_label, lc_open_date, import_amount_usd,
        manufacturers(name),
        containers(bl_no, mbl_no, carrier, container_no, etd, eta),
        interim_settlements(paid_date, is_locked),
        closing_settlements(paid_date, closing_date, is_locked)
      `)
      .gte('lc_open_date', `${fromYear}-01-01`)
      .lte('lc_open_date', `${toYear}-12-31`)
      .order('round_no', { ascending: false }),
    supabase.from('holidays').select('date'),
    supabase
      .from('interim_settlements')
      .select(VERIFICATION_SELECT)
      .like('notes', '%[검증]%')
      .not('notes', 'like', '%[확인완료]%')
      .order('created_at'),
  ])

  // holidays 테이블이 아직 없어도(마이그레이션 미적용) 주말 보정만으로 동작한다.
  const holidays = new Set((holidayRows ?? []).map((h: { date: string }) => h.date))
  const today = new Date().toISOString().slice(0, 10)

  const rows: DashboardRow[] = ((rawTx ?? []) as unknown as RawTx[]).map((t) => {
    const containers = t.containers ?? []
    const interim = one(t.interim_settlements)
    const closing = one(t.closing_settlements)
    const schedule = computeSettlementSchedule(t.lc_open_date, holidays)

    const interimActual = interim?.paid_date ?? null
    const closingActual = closing?.paid_date ?? closing?.closing_date ?? null

    // 정산에 쓰이는 B/L 은 한 차수에 여러 건일 수 있다 — 목록에서는 첫 건만 보여준다.
    const primary = containers.find((c) => c.bl_no) ?? containers[0] ?? null

    return {
      id: t.id,
      roundNo: t.round_no,
      roundLabel: t.round_label,
      manufacturer: (normalizeOne(t.manufacturers) as { name: string } | null)?.name ?? null,
      importAmountUsd: Number(t.import_amount_usd ?? 0),
      lcOpenDate: t.lc_open_date,
      blNo: primary?.bl_no ?? null,
      mblNo: primary?.mbl_no ?? null,
      carrierName: primary?.carrier ?? null,
      containerNo: primary?.container_no ?? null,
      etd: firstDate(containers.map((c) => c.etd)),
      eta: lastDate(containers.map((c) => c.eta)),
      settlementStatus: deriveStatus(interim, closing),
      interimDue: schedule.interimDue,
      interimActual,
      interimState: scheduleState(schedule.interimDue, interimActual, today),
      closingDue: schedule.closingDue,
      closingActual,
      closingState: scheduleState(schedule.closingDue, closingActual, today),
      scheduleApplicable: schedule.applicable,
    }
  })

  const totalCount = rows.length
  const totalUsd = rows.reduce((s, r) => s + r.importAmountUsd, 0)

  return {
    rows,
    totalCount,
    totalUsd,
    verRows: buildVerificationRows(verificationIssues),
  }
}
