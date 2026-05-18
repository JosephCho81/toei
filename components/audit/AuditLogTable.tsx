'use client'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AuditLogDiff, type AuditLogEntry } from './AuditLogDiff'

export type { AuditLogEntry as AuditLog }

function getChangedFields(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
): string[] {
  const allKeys = new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})])
  return [...allKeys].filter(
    (k) => JSON.stringify(oldData?.[k] ?? null) !== JSON.stringify(newData?.[k] ?? null),
  )
}

function ActionBadge({ action }: { action: string }) {
  if (action === 'INSERT')
    return <Badge className="text-xs bg-green-600 hover:bg-green-700">INSERT</Badge>
  if (action === 'DELETE')
    return <Badge variant="destructive" className="text-xs">DELETE</Badge>
  return <Badge variant="secondary" className="text-xs">UPDATE</Badge>
}

function formatAt(at: string): string {
  return new Date(at).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function AuditLogTable({
  logs,
  page,
  totalPages,
  total,
}: {
  logs: AuditLogEntry[]
  page: number
  totalPages: number
  total: number
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<AuditLogEntry | null>(null)

  function goPage(p: number) {
    const url = new URL(window.location.href)
    url.searchParams.set('page', String(p))
    router.push(url.pathname + '?' + url.searchParams.toString())
  }

  return (
    <>
      <p className="text-xs text-muted-foreground">전체 {total.toLocaleString('ko-KR')}건 · 행 클릭 시 diff 상세 확인</p>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground text-xs bg-muted/30">
              <th className="text-left px-4 py-2 font-medium whitespace-nowrap">일시</th>
              <th className="text-left px-4 py-2 font-medium">거래차수</th>
              <th className="text-left px-4 py-2 font-medium">테이블</th>
              <th className="text-center px-4 py-2 font-medium">작업</th>
              <th className="text-left px-4 py-2 font-medium">변경 필드</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground py-12">
                  조건에 맞는 로그가 없습니다.
                </td>
              </tr>
            )}
            {logs.map((log, i) => {
              const roundLabel = String(
                log.new_data?.round_label ?? log.old_data?.round_label ?? '-',
              )
              const changed = getChangedFields(log.old_data, log.new_data)
              return (
                <tr
                  key={log.id}
                  className={`border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors ${
                    i % 2 === 1 ? 'bg-muted/10' : ''
                  }`}
                  onClick={() => setSelected(log)}
                >
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {formatAt(log.changed_at)}
                  </td>
                  <td className="px-4 py-2.5 font-semibold">{roundLabel}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {log.table_name}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-4 py-2.5">
                    {changed.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {changed.slice(0, 5).map((f) => (
                          <span
                            key={f}
                            className="bg-amber-100 text-amber-800 rounded px-1 py-0.5 font-mono text-xs"
                          >
                            {f}
                          </span>
                        ))}
                        {changed.length > 5 && (
                          <span className="text-xs text-muted-foreground">
                            +{changed.length - 5}개
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {page} / {totalPages} 페이지
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goPage(page + 1)}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <AuditLogDiff
        open={!!selected}
        onClose={() => setSelected(null)}
        log={selected}
      />
    </>
  )
}
