import type { SupabaseClient } from '@supabase/supabase-js'
import { buildVerificationRows, VERIFICATION_SELECT } from '@/lib/data/verificationRows'

export type ContainerRow = {
  id: string
  container_no: string | null
  etd: string | null
  eta: string | null
  actual_arrival: string | null
  tracking_status: string | null
  isArrivingSoon: boolean
  transactions: {
    id: string; round_label: string
    manufacturers: { name: string } | { name: string }[] | null
    transaction_items: { spec: string | null }[] | null
  } | {
    id: string; round_label: string
    manufacturers: { name: string } | { name: string }[] | null
    transaction_items: { spec: string | null }[] | null
  }[] | null
}

export async function loadDashboardData(supabase: SupabaseClient, year: string) {
  const yearFrom = `${year}-01-01`
  const yearTo = `${year}-12-31`

  const buildAllTxQ = () =>
    supabase.from('v_transaction_status').select('import_amount_usd, settlement_status')
      .gte('lc_open_date', yearFrom).lte('lc_open_date', yearTo)

  const buildInterimPendingQ = () =>
    supabase.from('transactions')
      .select('id, round_label, import_amount_usd, interim_settlements(id, confirmed_amount_krw, is_locked)')
      .eq('is_locked', false)
      .gte('lc_open_date', yearFrom).lte('lc_open_date', yearTo)

  const buildClosingPendingQ = () =>
    supabase.from('v_transaction_status')
      .select('id, round_label, import_amount_usd')
      .in('settlement_status', ['interim_done', 'closing_saved'])
      .gte('lc_open_date', yearFrom).lte('lc_open_date', yearTo)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const containerCutoffDate = new Date()
  containerCutoffDate.setDate(containerCutoffDate.getDate() - 7)
  const containerCutoffStr = containerCutoffDate.toISOString().slice(0, 10)

  const [
    { data: allTx },
    { data: ddayTx },
    { data: rawInterimData },
    { data: closingPending },
    { data: containerData },
    { data: recentTx },
    { data: verificationIssues },
  ] = await Promise.all([
    buildAllTxQ(),
    supabase.from('v_transaction_status')
      .select('id, round_label, a1_payment_date, settlement_status')
      .not('a1_payment_date', 'is', null)
      .neq('settlement_status', 'closing_done')
      .order('a1_payment_date'),
    buildInterimPendingQ(),
    buildClosingPendingQ(),
    supabase.from('containers')
      .select('id, container_no, etd, eta, actual_arrival, tracking_status, transactions(id, round_label, manufacturers(name), transaction_items(spec))')
      .is('actual_arrival', null)
      .gte('eta', containerCutoffStr)
      .order('eta', { ascending: true, nullsFirst: false })
      .limit(10),
    supabase.from('v_transaction_status')
      .select('id, round_label, round_no, import_amount_usd, settlement_status, manufacturers(name), containers(etd, eta)')
      .order('round_no', { ascending: false })
      .limit(5),
    supabase.from('interim_settlements')
      .select(VERIFICATION_SELECT)
      .like('notes', '%[검증]%')
      .not('notes', 'like', '%[확인완료]%')
      .order('created_at'),
  ])

  type RawInterimTx = {
    id: string; round_label: string; import_amount_usd: number | null
    interim_settlements: { id: string; confirmed_amount_krw: number | null; is_locked: boolean | null }[] | null
  }
  const rawInterimAll = (rawInterimData ?? []) as unknown as RawInterimTx[]
  const interimPending = rawInterimAll.filter((t) => {
    const raw = t.interim_settlements
    const settlements: { id: string; confirmed_amount_krw: number | null; is_locked: boolean | null }[] =
      raw == null ? [] : Array.isArray(raw) ? raw : [raw]
    if (settlements.length === 0) return true
    return settlements.some((s) => s.confirmed_amount_krw == null || s.is_locked === false)
  })

  const totalCount = allTx?.length ?? 0
  const totalUsd = allTx?.reduce((s, t) => s + Number(t.import_amount_usd ?? 0), 0) ?? 0
  const closingDone = allTx?.filter((t) => t.settlement_status === 'closing_done').length ?? 0

  const interimPendingUsd = interimPending.reduce((s, t) => s + Number(t.import_amount_usd ?? 0), 0)
  const closingPendingUsd = (closingPending ?? []).reduce((s, t) => s + Number(t.import_amount_usd ?? 0), 0)
  const totalPendingUsd = interimPendingUsd + closingPendingUsd
  const pendingCount = interimPending.length + (closingPending?.length ?? 0)

  const ddayList = (ddayTx ?? []).map((t) => {
    const payDate = new Date(t.a1_payment_date!)
    payDate.setHours(0, 0, 0, 0)
    const elapsed = Math.floor((today.getTime() - payDate.getTime()) / 86400000)
    return { ...t, dday: 55 - elapsed }
  }).sort((a, b) => a.dday - b.dday)

  type RawContainerRow = Omit<ContainerRow, 'isArrivingSoon'>
  const rawContainers = (containerData ?? []) as unknown as RawContainerRow[]
  const containers: ContainerRow[] = rawContainers.map((c) => ({
    ...c,
    isArrivingSoon: c.eta
      ? Math.floor((new Date(c.eta).getTime() - today.getTime()) / 86400000) <= 7
      : false,
  }))
  const inTransit = containers.length
  const arrivingSoon = containers.filter((c) => c.isArrivingSoon).length

  const verRows = buildVerificationRows(verificationIssues)

  return {
    totalCount,
    totalUsd,
    closingDone,
    interimPending,
    interimPendingUsd,
    closingPending: closingPending ?? [],
    closingPendingUsd,
    totalPendingUsd,
    pendingCount,
    ddayList,
    containers,
    inTransit,
    arrivingSoon,
    verRows,
    recentTx: recentTx ?? [],
  }
}
