'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { validateContainerNo } from '@/lib/tracking/containerNo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/NumberInput'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BlTrackingField } from '@/components/tracking/BlTrackingField'
import { ChevronDown, ChevronRight } from 'lucide-react'

type C = {
  id?: string; container_no?: string; bl_no?: string | null; mbl_no?: string | null; lc_number?: string | null
  container_size?: string | null; carrier?: string | null
  vessel_name?: string | null
  voyage_no?: string | null; carton_count?: number | null; etd?: string | null
  eta?: string | null; actual_departure?: string | null; actual_arrival?: string | null
  manual_notes?: string | null
}
type FV = Record<'container_no'|'bl_no'|'mbl_no'|'lc_number'|'container_size'|'carrier'|'vessel_name'|'voyage_no'|'carton_count'|'etd'|'eta'|'actual_departure'|'actual_arrival'|'manual_notes', string>

function empty(d?: C | null, defaultLcNumber?: string | null): FV {
  return {
    container_no: d?.container_no ?? '', bl_no: d?.bl_no ?? '', mbl_no: d?.mbl_no ?? '',
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

/**
 * 정산에 실제로 쓰이는 값은 B/L·ETD·ETA·LC번호뿐이다.
 * 나머지(컨테이너 번호·선박명·항차·카톤수 등)는 기록용이라 '상세' 안으로 접어 둔다.
 */
export function ContainerForm({ transactionId, open, onOpenChange, initialData, onSaved, defaultLcNumber }: Props) {
  const supabase = createClient()
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<FV>(() => empty(initialData, defaultLcNumber))
  const [showDetail, setShowDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  function set(k: keyof FV, v: string) { setForm(p => ({ ...p, [k]: v })) }

  // 다이얼로그가 열릴 때마다 폼을 초기화한다. effect 대신 렌더 중 조정 패턴을 써서 추가 렌더 없이 반영.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setForm(empty(initialData, defaultLcNumber)); setShowDetail(false) }
  }

  const containerNo = form.container_no.toUpperCase().replace(/\s/g, '')
  const isValid = validateContainerNo(containerNo)
  const isEmpty = !form.bl_no && !containerNo && !form.etd && !form.eta
  // 유니패스는 B/L 연도로 화물을 구분한다. 입항 기준이므로 ETA 를 먼저 쓴다.
  const blYear = (form.eta || form.etd || '').slice(0, 4) || null

  async function handleSave() {
    if (isEmpty) return
    setSaving(true)
    if (!isEdit && containerNo) {
      const { data: dup } = await supabase
        .from('containers').select('id')
        .eq('transaction_id', transactionId).eq('container_no', containerNo).maybeSingle()
      if (dup) {
        setSaving(false)
        alert('이미 등록된 컨테이너 번호입니다.')
        return
      }
    }
    const payload = {
      transaction_id: transactionId, container_no: containerNo || null,
      bl_no: form.bl_no || null, mbl_no: form.mbl_no || null,
      lc_number: form.lc_number || null,
      container_size: form.container_size || null, carrier: form.carrier || null,
      vessel_name: form.vessel_name || null, voyage_no: form.voyage_no || null,
      carton_count: form.carton_count ? parseInt(form.carton_count) : null,
      etd: form.etd || null, eta: form.eta || null,
      actual_departure: form.actual_departure || null, actual_arrival: form.actual_arrival || null,
      manual_notes: form.manual_notes || null,
      api_type: 'manual' as const,
    }
    if (isEdit) await supabase.from('containers').update(payload).eq('id', initialData!.id!)
    else await supabase.from('containers').insert(payload)
    setSaving(false); onOpenChange(false); onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{isEdit ? '선적 정보 수정' : '선적 정보 추가'}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto py-1">
          <F l="B/L 번호" c={
            <BlTrackingField
              blNo={form.bl_no}
              onBlNoChange={(v) => set('bl_no', v)}
              mblNo={form.mbl_no}
              carrierName={form.carrier}
              onCarrierNameChange={(v) => set('carrier', v)}
              containerNo={containerNo}
              blYear={blYear}
              onUnipassResult={(fill) => setForm((p) => ({
                ...p,
                // 유니패스 입항일은 실적이므로 수기 ETA 보다 정확하다.
                eta: fill.eta ?? p.eta,
                mbl_no: fill.mblNo ?? p.mbl_no,
                carrier: fill.carrierName ?? p.carrier,
                vessel_name: fill.vesselName ?? p.vessel_name,
                voyage_no: fill.voyageNo ?? p.voyage_no,
                container_no: fill.containerNo ?? p.container_no,
              }))}
            />
          } />

          <div className="grid grid-cols-3 gap-3">
            <F l="ETD" c={<Input type="date" value={form.etd} onChange={e => set('etd', e.target.value)} />} />
            <F l="ETA" c={<Input type="date" value={form.eta} onChange={e => set('eta', e.target.value)} />} />
            <F l="LC 번호" c={<Input value={form.lc_number} onChange={e => set('lc_number', e.target.value)} />} />
          </div>

          <button
            type="button"
            onClick={() => setShowDetail(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showDetail ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            상세 정보 (컨테이너 번호·선박·카톤수)
          </button>

          {showDetail && (
            <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
              <div className="col-span-2">
                <F l="컨테이너 번호" c={
                  <div className="flex gap-2 items-center">
                    <Input className="font-mono" maxLength={11} value={form.container_no}
                      onChange={e => set('container_no', e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="KMTU1234567" />
                    {form.container_no.length >= 4 && <Badge variant={isValid ? 'default' : 'destructive'}>{isValid ? '유효' : '형식오류'}</Badge>}
                  </div>
                } />
              </div>
              <F l="컨테이너 규격" c={
                <Select value={form.container_size} onValueChange={v => v && set('container_size', v)}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {[['20ft','20ft'],['40ft','40ft'],['40hc','40HC']].map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              } />
              <F l="Master B/L (유니패스 조회 시 자동 입력)" c={<Input className="font-mono" value={form.mbl_no} onChange={e => set('mbl_no', e.target.value.toUpperCase().replace(/\s/g, ''))} />} />
              <F l="선사명 (원문)" c={<Input value={form.carrier} onChange={e => set('carrier', e.target.value)} placeholder="KMTC LINE (MALAYSIA) SDN BHD" />} />
              <F l="선박명" c={<Input value={form.vessel_name} onChange={e => set('vessel_name', e.target.value)} />} />
              <F l="항차" c={<Input value={form.voyage_no} onChange={e => set('voyage_no', e.target.value)} />} />
              <F l="카톤수" c={<NumberInput className="text-right font-mono" value={form.carton_count} onValueChange={v => set('carton_count', v)} />} />
              <F l="실제 출발일" c={<Input type="date" value={form.actual_departure} onChange={e => set('actual_departure', e.target.value)} />} />
              <F l="실제 도착일" c={<Input type="date" value={form.actual_arrival} onChange={e => set('actual_arrival', e.target.value)} />} />
              <div className="col-span-2"><F l="메모" c={<Input value={form.manual_notes} onChange={e => set('manual_notes', e.target.value)} />} /></div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSave} disabled={saving || isEmpty}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
