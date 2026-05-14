'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ContainerForm } from './ContainerForm'
import { formatDate } from '@/lib/utils/format'
import { Plus, Trash2 } from 'lucide-react'

interface Container {
  id: string
  container_no: string
  carrier: string | null
  eta: string | null
  etd: string | null
  actual_arrival: string | null
  vessel_name: string | null
  tracking_status: string | null
}

export function ShipmentsEditSection({ transactionId }: { transactionId: string }) {
  const [containers, setContainers] = useState<Container[]>([])
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  async function load() {
    const { data } = await supabase
      .from('containers')
      .select('id,container_no,carrier,eta,etd,actual_arrival,vessel_name,tracking_status')
      .eq('transaction_id', transactionId)
      .order('created_at')
    setContainers(data ?? [])
  }

  useEffect(() => { load() }, [transactionId])

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    await supabase.from('containers').delete().eq('id', deleteId)
    setDeleting(false)
    setDeleteId(null)
    load()
  }

  const containerToDelete = containers.find((c) => c.id === deleteId)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">컨테이너 ({containers.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            추가
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <ContainerForm
              transactionId={transactionId}
              onSaved={() => { setShowForm(false); load() }}
              onCancel={() => setShowForm(false)}
            />
          )}
          {containers.length === 0 && !showForm && (
            <p className="text-sm text-muted-foreground">등록된 컨테이너가 없습니다.</p>
          )}
          <div className="space-y-2 mt-2">
            {containers.map((c) => (
              <div key={c.id} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-semibold">{c.container_no}</span>
                  <div className="flex gap-2 items-center">
                    {c.carrier && <Badge variant="outline" className="text-xs">{c.carrier}</Badge>}
                    {c.tracking_status && (
                      <span className="text-xs text-muted-foreground">{c.tracking_status}</span>
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                  <span>ETD: {formatDate(c.etd)}</span>
                  <span>ETA: {formatDate(c.eta)}</span>
                  <span>실착: {formatDate(c.actual_arrival)}</span>
                </div>
                {c.vessel_name && (
                  <p className="mt-1 text-xs text-muted-foreground">선박: {c.vessel_name}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>컨테이너 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            <span className="font-mono font-semibold">{containerToDelete?.container_no}</span>을(를) 삭제하시겠습니까?
            이 작업은 되돌릴 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>취소</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
