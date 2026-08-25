'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { validateContainerNo } from '@/lib/tracking/detector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/NumberInput'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type C = {
  id?: string; container_no?: string; bl_no?: string | null; lc_number?: string | null
  container_size?: string | null; carrier?: string | null; vessel_name?: string | null
  voyage_no?: string | null; carton_count?: number | null; etd?: string | null
  eta?: string | null; actual_departure?: string | null; actual_arrival?: string | null
  manual_notes?: string | null
}
type FV = Record<'container_no'|'bl_no'|'lc_number'|'container_size'|'carrier'|'vessel_name'|'voyage_no'|'carton_count'|'etd'|'eta'|'actual_departure'|'actual_arrival'|'manual_notes', string>

function empty(d?: C | null, defaultLcNumber?: string | null): FV {
  return {
    container_no: d?.container_no ?? '', bl_no: d?.bl_no ?? '',
    // 새 컨테이너는 거래 기본정보의 LC 번호를 기본값으로 채운다 (수정 가능)
    lc_number: d?.lc_number ?? defaultLcNumber ?? '', container_size: d?.container_size ?? '',
    carrier: d?.carrier ?? '', vessel_name: d?.vessel_name ?? '',
    voyage_no: d?.voyage_no ?? '', carton_count: d?.carton_count?.toString() ?? '',
    etd: d?.etd ?? '', eta: d?.eta ?? '',
    actual_departure: d?.actual_departure ?? '', actual_arrival: d?.actual_arrival ?? '',
    manual_notes: d?.manual_notes ?? '',
  }
}
function F({ l, c }: { l: string; c: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{l}</Label>{c}</div>
}
interface Props {
  transactionId: string
  open: boolean
  onOpenChange: (v: boolean) => void
  initialData?: C | null
  onSaved: () => void
  /** 거래 기본정보의 LC 번호 — 신규 등록 시 자동 입력 */
  defaultLcNumber?: string | null
}

export function ContainerForm({ transactionId, open, onOpenChange, initialData, onSaved, defaultLcNumber }: Props) {
  const supabase = createClient()
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<FV>(() => empty(initialData, defaultLcNumber))
  const [tracking, setTracking] = useState<{apiSupported:boolean;carrier:string|null;trackingUrl:string|null}|null>(null)
  const [saving, setSaving] = useState(false)
  function set(k: keyof FV, v: string) { setForm(p => ({ ...p, [k]: v })) }

  // 다이얼로그가 열릴 때마다 폼을 초기화한다. effect 대신 렌더 중 조정 패턴을 써서 추가 렌더 없이 반영.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setForm(empty(initialData, defaultLcNumber)); setTracking(null) }
  }

  const fetchTracking = useCallback(async (no: string, signal: AbortSignal) => {
    try {
      const res = await fetch('/api/tracking', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerNo: no }),
        signal,
      })
      const data = await res.json()
      setTracking({ apiSupported: data.apiSupported, carrier: data.carrier ?? null, trackingUrl: data.trackingUrl ?? null })
      if (data.apiSupported) {
        setForm(p => ({
          ...p,
          eta: data.eta ? data.eta.slice(0, 10) : p.eta,
          etd: data.etd ? data.etd.slice(0, 10) : p.etd,
          vessel_name: data.vesselName ?? p.vessel_name,
          carrier: data.carrier ?? p.carrier,
        }))
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') throw e
    }
  }, [])

  useEffect(() => {
    const no = form.container_no.toUpperCase().replace(/\s/g, '')
    if (no.length < 4) return
    const controller = new AbortController()
    const t = setTimeout(() => fetchTracking(no, controller.signal), 500)
    return () => { clearTimeout(t); controller.abort() }
  }, [form.container_no, fetchTracking])

  async function handleSave() {
    const no = form.container_no.toUpperCase().replace(/\s/g, '')
    if (!no) return
    setSaving(true)
    if (!isEdit) {
      const { data: dup } = await supabase
        .from('containers').select('id')
        .eq('transaction_id', transactionId).eq('container_no', no).maybeSingle()
      if (dup) {
        setSaving(false)
        alert('이미 등록된 컨테이너 번호입니다.')
        return
      }
    }
    const payload = {
      transaction_id: transactionId, container_no: no,
      bl_no: form.bl_no || null, lc_number: form.lc_number || null,
      container_size: form.container_size || null, carrier: form.carrier || null,
      vessel_name: form.vessel_name || null, voyage_no: form.voyage_no || null,
      carton_count: form.carton_count ? parseInt(form.carton_count) : null,
      etd: form.etd || null, eta: form.eta || null,
      actual_departure: form.actual_departure || null, actual_arrival: form.actual_arrival || null,
      manual_notes: form.manual_notes || null,
      api_type: tracking?.apiSupported
        ? (tracking.carrier?.toLowerCase().includes('maersk') ? 'maersk_official' : 'hapag_official')
        : 'manual',
    }
    if (isEdit) await supabase.from('containers').update(payload).eq('id', initialData!.id!)
    else await supabase.from('containers').insert(payload)
    setSaving(false); onOpenChange(false); onSaved()
  }

  const isValid = validateContainerNo(form.container_no.toUpperCase().replace(/\s/g, ''))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>{isEdit ? '컨테이너 수정' : '컨테이너 추가'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto py-1">
          <div className="col-span-2">
            <F l="컨테이너 번호 *" c={
              <div className="flex gap-2 items-center">
                <Input className="font-mono" maxLength={11} value={form.container_no}
                  onChange={e => set('container_no', e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="MRKU1234567" />
                {form.container_no.length >= 4 && <Badge variant={isValid ? 'default' : 'destructive'}>{isValid ? '유효' : '형식오류'}</Badge>}
                {tracking?.apiSupported && <Badge variant="outline" className="text-green-700 border-green-400">자동조회됨</Badge>}
              </div>
            } />
          </div>
          {tracking && !tracking.apiSupported && tracking.trackingUrl && (
            <div className="col-span-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
              자동 추적 미지원 — <a href={tracking.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline">선사 사이트 확인하기 →</a>
            </div>
          )}
          <F l="B/L 번호" c={<Input value={form.bl_no} onChange={e => set('bl_no', e.target.value)} />} />
          <F l="LC 번호" c={<Input value={form.lc_number} onChange={e => set('lc_number', e.target.value)} />} />
          <F l="컨테이너 규격" c={
            <Select value={form.container_size} onValueChange={v => v && set('container_size', v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {[['20ft','20ft'],['40ft','40ft'],['40hc','40HC']].map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          } />
          <F l="선사" c={<Input value={form.carrier} onChange={e => set('carrier', e.target.value)} />} />
          <F l="선박명" c={<Input value={form.vessel_name} onChange={e => set('vessel_name', e.target.value)} />} />
          <F l="항차" c={<Input value={form.voyage_no} onChange={e => set('voyage_no', e.target.value)} />} />
          <F l="카톤수" c={<NumberInput className="text-right font-mono" value={form.carton_count} onValueChange={v => set('carton_count', v)} />} />
          <F l="ETD" c={<Input type="date" value={form.etd} onChange={e => set('etd', e.target.value)} />} />
          <F l="ETA" c={<Input type="date" value={form.eta} onChange={e => set('eta', e.target.value)} />} />
          <F l="실제 출발일" c={<Input type="date" value={form.actual_departure} onChange={e => set('actual_departure', e.target.value)} />} />
          <F l="실제 도착일" c={<Input type="date" value={form.actual_arrival} onChange={e => set('actual_arrival', e.target.value)} />} />
          <div className="col-span-2"><F l="메모" c={<Input value={form.manual_notes} onChange={e => set('manual_notes', e.target.value)} />} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSave} disabled={saving || !form.container_no}>{saving ? '저장 중...' : '저장'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
