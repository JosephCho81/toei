'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContainerForm } from '@/components/containers/ContainerForm'
import { MemoField } from '@/components/ui/MemoField'
import { formatDate } from '@/lib/utils/format'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface Container {
  id: string; container_no: string; bl_no: string | null; lc_number: string | null
  container_size: string | null; carrier: string | null; eta: string | null; etd: string | null
  actual_departure: string | null; actual_arrival: string | null; vessel_name: string | null
  voyage_no: string | null; carton_count: number | null; manual_notes: string | null
  tracking_status: string | null
}

export function ContainerList({ transactionId, isLocked }: { transactionId: string; isLocked: boolean }) {
  const supabase = createClient()
  const [containers, setContainers] = useState<Container[]>([])
  const [dialog, setDialog] = useState<{ open: boolean; editing: Container | null }>({ open: false, editing: null })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('containers')
      .select('id,container_no,bl_no,lc_number,container_size,carrier,eta,etd,actual_departure,actual_arrival,vessel_name,voyage_no,carton_count,manual_notes,tracking_status')
      .eq('transaction_id', transactionId).order('created_at')
    setContainers(data ?? [])
  }

  useEffect(() => { load() }, [transactionId])

  async function handleDelete(id: string) {
    await supabase.from('containers').delete().eq('id', id)
    setDeleteId(null); load()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">컨테이너 ({containers.length})</CardTitle>
        {!isLocked && (
          <Button size="sm" variant="outline" onClick={() => setDialog({ open: true, editing: null })}>
            <Plus className="h-4 w-4 mr-1" />추가
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {containers.length === 0 && (
          <p className="text-sm text-muted-foreground">등록된 컨테이너가 없습니다.</p>
        )}
        {containers.map((c) => (
          <div key={c.id} className="border rounded-lg p-3 text-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-semibold">{c.container_no}</span>
                {c.container_size && <Badge variant="outline" className="text-xs">{c.container_size}</Badge>}
                {c.carrier && <Badge variant="outline" className="text-xs">{c.carrier}</Badge>}
                {c.tracking_status && (
                  <Badge variant="secondary" className="text-xs">{c.tracking_status}</Badge>
                )}
              </div>
              {!isLocked && (
                <div className="flex gap-1 shrink-0 ml-2">
                  {deleteId === c.id ? (
                    <>
                      <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={() => handleDelete(c.id)}>삭제 확인</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setDeleteId(null)}>취소</Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setDialog({ open: true, editing: c })}><Pencil className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3 w-3" /></Button>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span><span className="font-medium text-foreground/70">ETD:</span> {formatDate(c.etd) ?? '-'}</span>
              <span><span className="font-medium text-foreground/70">ETA:</span> {formatDate(c.eta) ?? '-'}</span>
              <span><span className="font-medium text-foreground/70">실착:</span> {c.actual_arrival ? formatDate(c.actual_arrival) : '-'}</span>
              <span><span className="font-medium text-foreground/70">B/L:</span> {c.bl_no ?? '-'}</span>
              <span><span className="font-medium text-foreground/70">선박:</span> {c.vessel_name ?? '-'}</span>
              <span><span className="font-medium text-foreground/70">카톤:</span> {c.carton_count != null ? c.carton_count.toLocaleString() : '-'}</span>
            </div>
            <div className="mt-2 border-t pt-2">
              <MemoField
                notes={c.manual_notes}
                disabled={isLocked}
                onSave={async (newNotes) => {
                  const { error } = await supabase.from('containers').update({ manual_notes: newNotes }).eq('id', c.id)
                  if (error) throw error
                  setContainers(prev => prev.map(cnt => cnt.id === c.id ? { ...cnt, manual_notes: newNotes } : cnt))
                }}
              />
            </div>
          </div>
        ))}
        <ContainerForm
          transactionId={transactionId}
          open={dialog.open}
          onOpenChange={(v) => setDialog(d => ({ ...d, open: v }))}
          initialData={dialog.editing}
          onSaved={() => { setDialog({ open: false, editing: null }); load() }}
        />
      </CardContent>
    </Card>
  )
}
