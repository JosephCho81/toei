'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { validateContainerNo } from '@/lib/tracking/detector'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TrackingData {
  apiSupported: boolean
  carrier: string | null
  trackingUrl: string | null
  eta: string | null
  etd: string | null
  currentLocation: string | null
  vesselName: string | null
  status: string | null
  error?: string
}

interface Props {
  transactionId: string
  onSaved: () => void
  onCancel: () => void
}

export function ContainerForm({ transactionId, onSaved, onCancel }: Props) {
  const [containerNo, setContainerNo] = useState('')
  const [tracking, setTracking] = useState<TrackingData | null>(null)
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [eta, setEta] = useState('')
  const [etd, setEtd] = useState('')
  const [vesselName, setVesselName] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const fetchTracking = useCallback(async (no: string) => {
    if (no.length < 4) return
    setTrackingLoading(true)
    try {
      const res = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerNo: no }),
      })
      const data: TrackingData = await res.json()
      setTracking(data)
      if (data.apiSupported) {
        if (data.eta) setEta(data.eta.slice(0, 10))
        if (data.etd) setEtd(data.etd.slice(0, 10))
        if (data.vesselName) setVesselName(data.vesselName)
        if (data.currentLocation) setLocation(data.currentLocation)
      }
    } finally {
      setTrackingLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      const normalized = containerNo.toUpperCase().replace(/\s/g, '')
      if (normalized.length >= 4) fetchTracking(normalized)
    }, 500)
    return () => clearTimeout(timer)
  }, [containerNo, fetchTracking])

  async function handleSave() {
    const normalized = containerNo.toUpperCase().replace(/\s/g, '')
    if (!normalized) return
    setSaving(true)
    await supabase.from('containers').insert({
      transaction_id: transactionId,
      container_no: normalized,
      carrier: tracking?.carrier ?? null,
      api_type: tracking?.apiSupported
        ? (tracking.carrier?.toLowerCase().includes('maersk') ? 'maersk_official' : 'hapag_official')
        : 'manual',
      eta: eta || null,
      etd: etd || null,
      vessel_name: vesselName || null,
      current_location: location || null,
      tracking_status: tracking?.status ?? null,
      last_tracked_at: tracking?.apiSupported ? new Date().toISOString() : null,
    })
    setSaving(false)
    onSaved()
  }

  const isValid = validateContainerNo(containerNo.toUpperCase().replace(/\s/g, ''))

  return (
    <div className="border rounded-lg p-4 space-y-4 mb-4 bg-muted/20">
      <div className="space-y-2">
        <Label htmlFor="containerNo">컨테이너 번호</Label>
        <div className="flex gap-2">
          <Input
            id="containerNo"
            value={containerNo}
            onChange={(e) => setContainerNo(e.target.value.toUpperCase().replace(/\s/g, ''))}
            placeholder="MRKU1234567"
            className="font-mono"
            maxLength={11}
          />
          {containerNo.length >= 4 && (
            <Badge variant={isValid ? 'default' : 'destructive'} className="shrink-0 self-center">
              {isValid ? '유효' : '형식오류'}
            </Badge>
          )}
        </div>
      </div>

      {trackingLoading && <p className="text-sm text-muted-foreground">조회 중...</p>}

      {tracking && !tracking.apiSupported && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
          <p className="font-medium text-amber-800">
            {tracking.carrier ? `${tracking.carrier}은(는)` : '해당 선사는'} 자동 추적이 지원되지 않습니다.
          </p>
          {tracking.trackingUrl && (
            <a
              href={tracking.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 underline text-xs mt-1 block"
            >
              선사 공식 사이트에서 확인하기 →
            </a>
          )}
        </div>
      )}

      {tracking?.apiSupported && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          자동 조회 완료 ({tracking.carrier})
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">ETD</Label>
          <Input type="date" value={etd} onChange={(e) => setEtd(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">ETA</Label>
          <Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">선박명</Label>
          <Input value={vesselName} onChange={(e) => setVesselName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">현재 위치</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>취소</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !containerNo}>
          {saving ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  )
}
