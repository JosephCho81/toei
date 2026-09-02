'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { Field } from './Field'
import { BlTrackingField } from '@/components/tracking/BlTrackingField'
import { blankContainer, type ContainerRow } from '@/lib/transactions/newTransaction'

/**
 * 선적 정보 입력. 정산에 쓰이는 값은 B/L·ETD·ETA뿐이라 그 셋만 받는다.
 * 컨테이너 번호 등 나머지는 등록 후 거래 상세에서 채운다.
 */
export function ContainerRowsCard({ containers, onChange }: {
  containers: ContainerRow[]
  onChange: (next: (prev: ContainerRow[]) => ContainerRow[]) => void
}) {
  const setContainer = (key: string, field: keyof Omit<ContainerRow, '_key'>, value: string) =>
    onChange((p) => p.map((r) => r._key === key ? { ...r, [field]: value } : r))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">선적 정보</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange((p) => [...p, blankContainer()])}>
          <Plus className="h-4 w-4 mr-1" />행 추가
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {containers.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">선적 정보가 없습니다. 행 추가 버튼을 눌러 추가하세요.</p>
        )}
        {containers.map((r) => (
          <div key={r._key} className="space-y-2 rounded-md border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <Field label="B/L 번호">
                  <BlTrackingField
                    blNo={r.bl_no}
                    onBlNoChange={(v) => setContainer(r._key, 'bl_no', v)}
                    mblNo={r.mbl_no}
                    blYear={(r.eta || r.etd || '').slice(0, 4) || null}
                    onUnipassResult={(fill) => onChange((p) => p.map((x) => x._key === r._key ? {
                      ...x,
                      eta: fill.eta ?? x.eta,
                      mbl_no: fill.mblNo ?? x.mbl_no,
                      carrier: fill.carrierName ?? x.carrier,
                      container_no: fill.containerNo ?? x.container_no,
                    } : x))}
                    carrierName={r.carrier}
                    onCarrierNameChange={(v) => setContainer(r._key, 'carrier', v)}
                  />
                </Field>
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-destructive mt-5" onClick={() => onChange((p) => p.filter((x) => x._key !== r._key))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="ETD">
                <Input type="date" value={r.etd} onChange={(e) => setContainer(r._key, 'etd', e.target.value)} />
              </Field>
              <Field label="ETA">
                <Input type="date" value={r.eta} onChange={(e) => setContainer(r._key, 'eta', e.target.value)} />
              </Field>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
