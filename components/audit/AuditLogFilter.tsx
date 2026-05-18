'use client'
import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type FilterValues = { table: string; action: string; from: string; to: string; round: string }

export function AuditLogFilter({
  roundLabels,
  initialValues,
}: {
  roundLabels: string[]
  initialValues: FilterValues
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    const params = new URLSearchParams()
    for (const [k, v] of fd.entries()) {
      const s = v as string
      if (s && s !== '__all__') params.set(k, s)
    }
    params.set('page', '1')
    router.push('/audit-logs?' + params.toString())
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-wrap gap-3 items-end p-4 bg-muted/30 rounded-lg border"
    >
      <div className="space-y-1">
        <Label className="text-xs">거래 차수</Label>
        <Select name="round" defaultValue={initialValues.round || '__all__'}>
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">전체</SelectItem>
            {roundLabels.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">변경 유형</Label>
        <Select name="action" defaultValue={initialValues.action || '__all__'}>
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">전체</SelectItem>
            <SelectItem value="INSERT">INSERT</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">테이블명</Label>
        <Input
          name="table"
          className="w-44 h-8 text-sm"
          placeholder="예: transactions"
          defaultValue={initialValues.table}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">시작일</Label>
        <Input name="from" type="date" className="w-36 h-8 text-sm" defaultValue={initialValues.from} />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">종료일</Label>
        <Input name="to" type="date" className="w-36 h-8 text-sm" defaultValue={initialValues.to} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-8">검색</Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => router.push('/audit-logs')}
        >
          초기화
        </Button>
      </div>
    </form>
  )
}
