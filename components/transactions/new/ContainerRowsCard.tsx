'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { Field } from './Field'
import { blankContainer, type ContainerRow } from '@/lib/transactions/newTransaction'

export function ContainerRowsCard({ containers, onChange }: {
  containers: ContainerRow[]
  onChange: (next: (prev: ContainerRow[]) => ContainerRow[]) => void
}) {
  const setContainer = (key: string, field: keyof Omit<ContainerRow, '_key'>, value: string) =>
    onChange((p) => p.map((r) => r._key === key ? { ...r, [field]: value } : r))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">컨테이너</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange((p) => [...p, blankContainer()])}>
          <Plus className="h-4 w-4 mr-1" />행 추가
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {containers.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">컨테이너 정보가 없습니다. 행 추가 버튼을 눌러 추가하세요.</p>
        )}
        {containers.map((r) => (
          <div key={r._key} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
            <Field label="ETD">
              <Input type="date" value={r.etd} onChange={(e) => setContainer(r._key, 'etd', e.target.value)} />
            </Field>
            <Field label="ETA">
              <Input type="date" value={r.eta} onChange={(e) => setContainer(r._key, 'eta', e.target.value)} />
            </Field>
            <Field label="컨테이너 번호">
              <Input value={r.container_no} onChange={(e) => setContainer(r._key, 'container_no', e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="MRKU1234567" className="font-mono" />
            </Field>
            <Field label="선사">
              <Input value={r.carrier} onChange={(e) => setContainer(r._key, 'carrier', e.target.value)} placeholder="Maersk" />
            </Field>
            <Button type="button" variant="ghost" size="icon" className="text-destructive mb-0.5" onClick={() => onChange((p) => p.filter((x) => x._key !== r._key))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
