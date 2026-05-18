'use client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export type AuditLogEntry = {
  id: string
  table_name: string
  record_id: string
  action: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_by: string | null
  changed_at: string
}

type DiffRow = { key: string; old: unknown; new: unknown; changed: boolean }

function computeDiff(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
): DiffRow[] {
  const allKeys = new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})])
  return [...allKeys].sort().map((key) => ({
    key,
    old: oldData?.[key] ?? null,
    new: newData?.[key] ?? null,
    changed:
      JSON.stringify(oldData?.[key] ?? null) !== JSON.stringify(newData?.[key] ?? null),
  }))
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string') return v
  return JSON.stringify(v, null, 0)
}

export function AuditLogDiff({
  open,
  onClose,
  log,
}: {
  open: boolean
  onClose: () => void
  log: AuditLogEntry | null
}) {
  if (!log) return null

  const diffs = computeDiff(log.old_data, log.new_data)
  const changed = diffs.filter((d) => d.changed)
  const unchanged = diffs.filter((d) => !d.changed)

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            변경 상세 &mdash; <span className="font-mono">{log.table_name}</span> / {log.action}
          </DialogTitle>
        </DialogHeader>

        {changed.length > 0 ? (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              변경된 필드 ({changed.length}개)
            </p>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-amber-50 border-b">
                    <th className="text-left px-3 py-1.5 font-medium w-1/4">필드</th>
                    <th className="text-left px-3 py-1.5 font-medium w-[37.5%] text-red-700">변경 전</th>
                    <th className="text-left px-3 py-1.5 font-medium w-[37.5%] text-green-700">변경 후</th>
                  </tr>
                </thead>
                <tbody>
                  {changed.map((d, i) => (
                    <tr key={d.key} className={i % 2 === 0 ? 'bg-amber-50/60' : 'bg-amber-50/30'}>
                      <td className="px-3 py-1.5 font-mono font-semibold text-amber-800 break-all">
                        {d.key}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-red-700 break-all whitespace-pre-wrap">
                        {fmt(d.old)}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-green-700 break-all whitespace-pre-wrap">
                        {fmt(d.new)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">변경된 필드 없음</p>
        )}

        {unchanged.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground py-1 select-none hover:text-foreground">
              변경 없는 필드 ({unchanged.length}개) 펼치기
            </summary>
            <div className="rounded-md border overflow-hidden mt-2">
              <table className="w-full text-xs">
                <tbody>
                  {unchanged.map((d, i) => (
                    <tr key={d.key} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                      <td className="px-3 py-1 font-mono text-muted-foreground w-1/4">{d.key}</td>
                      <td className="px-3 py-1 font-mono text-muted-foreground break-all">{fmt(d.old)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </DialogContent>
    </Dialog>
  )
}
