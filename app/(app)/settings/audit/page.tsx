import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const PAGE_SIZE = 20
const TABLE_OPTS = ['transactions', 'interim_settlements', 'closing_settlements']
const ACTION_OPTS = ['INSERT', 'UPDATE', 'DELETE']

function diffRows(old: Record<string, unknown> | null, next: Record<string, unknown> | null) {
  if (!old || !next) return []
  const keys = [...new Set([...Object.keys(old), ...Object.keys(next)])]
    .filter(k => k !== 'updated_at' && JSON.stringify(old[k] ?? null) !== JSON.stringify(next[k] ?? null))
  return keys.map(k => ({ k, old: old[k] ?? null, new: next[k] ?? null }))
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams
  const page = Math.max(0, parseInt(sp.page ?? '1') - 1)
  const tableFilter = sp.table ?? ''
  const actionFilter = sp.action ?? ''
  const supabase = await createClient()

  let q = supabase.from('audit_logs').select('*', { count: 'exact' })
    .order('changed_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  if (tableFilter) q = q.eq('table_name', tableFilter)
  if (actionFilter) q = q.eq('action', actionFilter)

  const { data: logs, count } = await q
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function buildHref(patch: Record<string, string>) {
    const p = new URLSearchParams({ ...(tableFilter && { table: tableFilter }), ...(actionFilter && { action: actionFilter }), page: '1', ...patch })
    return `/settings/audit?${p}`
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">감사 로그</h2>
        <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← 설정으로</Link>
      </div>

      <div className="flex gap-3 flex-wrap text-sm">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">테이블:</span>
          {['', ...TABLE_OPTS].map(t => (
            <Link key={t} href={buildHref({ table: t })} className={`px-2 py-1 rounded border ${tableFilter === t ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
              {t || '전체'}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">액션:</span>
          {['', ...ACTION_OPTS].map(a => (
            <Link key={a} href={buildHref({ action: a })} className={`px-2 py-1 rounded border ${actionFilter === a ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
              {a || '전체'}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {!logs || logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">로그가 없습니다.</p>
        ) : logs.map((log) => {
          const diffs = diffRows(log.old_data as Record<string, unknown> | null, log.new_data as Record<string, unknown> | null)
          const actionColor = log.action === 'DELETE' ? 'destructive' : log.action === 'INSERT' ? 'default' : 'secondary'
          return (
            <Card key={log.id}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={actionColor}>{log.action}</Badge>
                  <span className="font-mono text-sm font-medium">{log.table_name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{String(log.record_id).slice(0, 8)}…</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(log.changed_at).toLocaleString('ko-KR')}
                  </span>
                </div>
              </CardHeader>
              {diffs.length > 0 && (
                <CardContent className="pt-0 px-4 pb-3">
                  <div className="space-y-1">
                    {diffs.map(({ k, old: o, new: n }) => (
                      <div key={k} className="text-xs font-mono flex gap-2">
                        <span className="text-muted-foreground w-40 shrink-0">{k}</span>
                        <span className="text-red-600 line-through">{JSON.stringify(o)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-green-700">{JSON.stringify(n)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
              {log.action === 'INSERT' && log.new_data && (
                <CardContent className="pt-0 px-4 pb-3">
                  <p className="text-xs text-muted-foreground font-mono">신규 레코드 생성됨</p>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex gap-2 justify-center text-sm">
          {page > 0 && <Link href={buildHref({ page: String(page) })} className="px-3 py-1 border rounded hover:bg-accent">이전</Link>}
          <span className="px-3 py-1">{page + 1} / {totalPages}</span>
          {page + 1 < totalPages && <Link href={buildHref({ page: String(page + 2) })} className="px-3 py-1 border rounded hover:bg-accent">다음</Link>}
        </div>
      )}
    </div>
  )
}
