import { createClient } from '@/lib/supabase/server'
import { AuditLogFilter } from '@/components/audit/AuditLogFilter'
import { AuditLogTable, type AuditLog } from '@/components/audit/AuditLogTable'

const LIMIT = 20

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1'))
  const table = params.table ?? ''
  const action = params.action ?? ''
  const from = params.from ?? ''
  const to = params.to ?? ''
  const round = params.round ?? ''

  const supabase = await createClient()

  const { data: txList } = await supabase
    .from('transactions')
    .select('round_label')
    .order('round_no', { ascending: false })

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('changed_at', { ascending: false })
    .range((page - 1) * LIMIT, page * LIMIT - 1)

  if (table) query = query.eq('table_name', table)
  if (action) query = query.eq('action', action)
  if (from) query = query.gte('changed_at', from)
  if (to) query = query.lte('changed_at', `${to}T23:59:59`)
  if (round) query = query.filter('new_data->>round_label', 'eq', round)

  const { data: logs, count } = await query
  const totalPages = Math.ceil((count ?? 0) / LIMIT)

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">감사 로그</h2>
      <AuditLogFilter
        roundLabels={(txList ?? []).map((t) => t.round_label)}
        initialValues={{ table, action, from, to, round }}
      />
      <AuditLogTable
        logs={(logs ?? []) as unknown as AuditLog[]}
        page={page}
        totalPages={totalPages}
        total={count ?? 0}
      />
    </div>
  )
}
