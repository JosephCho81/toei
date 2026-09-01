'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/NumberInput'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2 } from 'lucide-react'
import { parseKrwAmount } from '@/lib/utils/number'
import { Field } from './Field'
import {
  blankDetail, blankForwarding, type ForwardingDetailRow, type ForwardingRow,
} from '@/lib/transactions/newTransaction'

export function ForwardingRowsCard({ forwardings, onChange }: {
  forwardings: ForwardingRow[]
  onChange: (next: (prev: ForwardingRow[]) => ForwardingRow[]) => void
}) {
  const mapRow = (fKey: string, fn: (r: ForwardingRow) => ForwardingRow) =>
    onChange((p) => p.map((r) => r._key === fKey ? fn(r) : r))

  const setForwardingHeader = (fKey: string, field: 'forwarder_name' | 'quote_date', value: string) =>
    mapRow(fKey, (r) => ({ ...r, [field]: value }))

  const setForwardingDetail = (
    fKey: string, dKey: string,
    field: keyof Omit<ForwardingDetailRow, '_key'>, value: string | boolean,
  ) => mapRow(fKey, (r) => ({
    ...r, details: r.details.map((d) => d._key === dKey ? { ...d, [field]: value } : d),
  }))

  const addForwardingDetail = (fKey: string) =>
    mapRow(fKey, (r) => ({ ...r, details: [...r.details, blankDetail()] }))

  const removeForwardingDetail = (fKey: string, dKey: string) =>
    mapRow(fKey, (r) => ({ ...r, details: r.details.filter((d) => d._key !== dKey) }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">포워딩 견적</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange((p) => [...p, blankForwarding()])}>
          <Plus className="h-4 w-4 mr-1" />견적 추가
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {forwardings.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">포워딩 견적이 없습니다. 견적 추가 버튼을 눌러 추가하세요.</p>
        )}
        {forwardings.map((r) => {
          const quoteTotal = r.details.reduce((s, d) => s + parseKrwAmount(d.quote_amount_krw), 0)
          const actualTotal = r.details.reduce((s, d) => s + parseKrwAmount(d.actual_amount_krw), 0)
          return (
            <div key={r._key} className="border rounded-md p-3 space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Field label="포워더명">
                    <Input value={r.forwarder_name} onChange={(e) => setForwardingHeader(r._key, 'forwarder_name', e.target.value)} />
                  </Field>
                </div>
                <div className="w-36">
                  <Field label="견적일">
                    <Input type="date" value={r.quote_date} onChange={(e) => setForwardingHeader(r._key, 'quote_date', e.target.value)} />
                  </Field>
                </div>
                <Button type="button" variant="ghost" size="icon" className="text-destructive mb-0.5" onClick={() => onChange((p) => p.filter((x) => x._key !== r._key))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium py-1 pr-2">항목명</th>
                    <th className="text-right font-medium py-1 px-2">견적금액 (원)</th>
                    <th className="text-right font-medium py-1 px-2">실청구금액 (원)</th>
                    <th className="text-center font-medium py-1 px-2 whitespace-nowrap">부가세</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {r.details.map((d) => (
                    <tr key={d._key} className="border-b border-dashed">
                      <td className="py-1 pr-2">
                        <Input
                          value={d.item_name}
                          onChange={(e) => setForwardingDetail(r._key, d._key, 'item_name', e.target.value)}
                          className="h-7 text-sm"
                        />
                      </td>
                      <td className="py-1 px-2">
                        <NumberInput
                          value={d.quote_amount_krw}
                          onValueChange={(v) => setForwardingDetail(r._key, d._key, 'quote_amount_krw', v)}
                          className="h-7 text-sm text-right"
                        />
                      </td>
                      <td className="py-1 px-2">
                        <NumberInput
                          value={d.actual_amount_krw}
                          onValueChange={(v) => setForwardingDetail(r._key, d._key, 'actual_amount_krw', v)}
                          className="h-7 text-sm text-right"
                        />
                      </td>
                      <td className="py-1 px-2 text-center">
                        <Checkbox
                          checked={d.is_vat_taxable}
                          onCheckedChange={(v) => setForwardingDetail(r._key, d._key, 'is_vat_taxable', !!v)}
                        />
                      </td>
                      <td className="py-1 pl-1">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeForwardingDetail(r._key, d._key)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pt-2 text-muted-foreground text-xs">소계</td>
                    <td className="pt-2 px-2 text-right font-medium">{quoteTotal.toLocaleString()}</td>
                    <td className="pt-2 px-2 text-right font-medium">{actualTotal.toLocaleString()}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>

              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => addForwardingDetail(r._key)}>
                <Plus className="h-3 w-3 mr-1" />항목 추가
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
