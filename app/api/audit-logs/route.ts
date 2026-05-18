import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'))
  const table = searchParams.get('table') ?? ''
  const action = searchParams.get('action') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const round = searchParams.get('round') ?? ''

  const supabase = await createClient()

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('changed_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (table) query = query.eq('table_name', table)
  if (action) query = query.eq('action', action)
  if (from) query = query.gte('changed_at', from)
  if (to) query = query.lte('changed_at', `${to}T23:59:59`)
  if (round) query = query.filter('new_data->>round_label', 'eq', round)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    count,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  })
}
