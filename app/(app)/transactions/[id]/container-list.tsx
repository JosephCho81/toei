'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContainerForm } from './container-form'
import { formatDate } from '@/lib/utils/format'
import { Plus } from 'lucide-react'

interface Container {
  id: string
  container_no: string
  carrier: string | null
  eta: string | null
  etd: string | null
  actual_arrival: string | null
  vessel_name: string | null
  tracking_status: string | null
  last_tracked_at: string | null
}

export function ContainerList({ transactionId, isLocked }: { transactionId: string; isLocked: boolean }) {
  const [containers, setContainers] = useState<Container[]>([])
  const [showForm, setShowForm] = useState(false)
  const supabase = createClient()

  async function load() {
    const { data } = await supabase
      .from('containers')
      .select('id,container_no,carrier,eta,etd,actual_arrival,vessel_name,tracking_status,last_tracked_at')
      .eq('transaction_id', transactionId)
      .order('created_at')
    setContainers(data ?? [])
  }

  useEffect(() => { load() }, [transactionId])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">컨테이너 ({containers.length})</CardTitle>
        {!isLocked && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            추가
          </Button>
        )}
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
                <div className="flex gap-2">
                  {c.carrier && <Badge variant="outline" className="text-xs">{c.carrier}</Badge>}
                  {c.tracking_status && <span className="text-xs text-muted-foreground">{c.tracking_status}</span>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                <span>ETD: {formatDate(c.etd)}</span>
                <span>ETA: {formatDate(c.eta)}</span>
                <span>실착: {formatDate(c.actual_arrival)}</span>
              </div>
              {c.vessel_name && <p className="mt-1 text-xs text-muted-foreground">선박: {c.vessel_name}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
