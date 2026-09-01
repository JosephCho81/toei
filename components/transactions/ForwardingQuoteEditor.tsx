'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/NumberInput'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import {
  ITEM_TYPE_LABELS, blankQuoteItem, quoteTotals,
  type ItemType, type QuoteItemRow, type QuoteRow,
} from '@/lib/data/forwardingQuotes'

type ItemField = keyof Omit<QuoteItemRow, '_key' | 'id'>

/** 견적 1건(포워더 1곳)의 편집 카드. */
export function ForwardingQuoteEditor({ row, onChange, onRemove }: {
  row: QuoteRow
  onChange: (next: QuoteRow) => void
  onRemove: () => void
}) {
  const { quote, actual } = quoteTotals(row)

  const setField = (field: 'forwarder_name' | 'quote_date' | 'notes', value: string) =>
    onChange({ ...row, [field]: value })

  const setItem = (key: string, field: ItemField, value: string | boolean) =>
    onChange({ ...row, items: row.items.map((i) => i._key === key ? { ...i, [field]: value } : i) })

  return (
    <div className="border rounded-md p-3 space-y-3">
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">포워더명</Label>
          <Input className="h-8 text-sm" value={row.forwarder_name}
            onChange={(e) => setField('forwarder_name', e.target.value)} />
        </div>
        <div className="w-40 space-y-1">
          <Label className="text-xs text-muted-foreground">견적일</Label>
          <Input type="date" className="h-8 text-sm" value={row.quote_date}
            onChange={(e) => setField('quote_date', e.target.value)} />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left font-medium py-1 pr-2 w-24">구분</th>
            <th className="text-left font-medium py-1 pr-2">항목명</th>
            <th className="text-right font-medium py-1 px-2 w-36">금액 (원)</th>
            <th className="text-center font-medium py-1 px-2 whitespace-nowrap w-16">부가세</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {row.items.length === 0 && (
            <tr>
              <td colSpan={5} className="py-2 text-xs text-muted-foreground">
                항목이 없습니다. 아래 &lsquo;항목 추가&rsquo; 버튼을 누르세요.
              </td>
            </tr>
          )}
          {row.items.map((it) => (
            <tr key={it._key} className="border-b border-dashed">
              <td className="py-1 pr-2">
                <Select value={it.item_type}
                  onValueChange={(v) => setItem(it._key, 'item_type', (v as ItemType) ?? 'quote')}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ITEM_TYPE_LABELS) as ItemType[]).map((t) => (
                      <SelectItem key={t} value={t}>{ITEM_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="py-1 pr-2">
                <Input className="h-7 text-sm" value={it.item_name} placeholder="항목명 입력"
                  onChange={(e) => setItem(it._key, 'item_name', e.target.value)} />
                {it.currency && it.currency !== 'KRW' && it.amount_cur != null && (
                  <span className="text-[10px] text-muted-foreground">
                    {it.currency} {it.amount_cur.toLocaleString('ko-KR')}
                  </span>
                )}
              </td>
              <td className="py-1 px-2">
                <NumberInput className="h-7 text-sm text-right font-mono" value={it.amount_krw}
                  onValueChange={(v) => setItem(it._key, 'amount_krw', v)} />
              </td>
              <td className="py-1 px-2 text-center">
                <Checkbox checked={it.is_vat_taxable}
                  onCheckedChange={(v) => setItem(it._key, 'is_vat_taxable', !!v)} />
              </td>
              <td className="py-1 pl-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                  onClick={() => onChange({ ...row, items: row.items.filter((i) => i._key !== it._key) })}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="pt-2 text-muted-foreground text-xs">소계</td>
            <td className="pt-2 px-2 text-right font-medium text-xs">
              견적 {quote.toLocaleString('ko-KR')} / 실청구 {actual.toLocaleString('ko-KR')}
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>

      <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
        onClick={() => onChange({ ...row, items: [...row.items, blankQuoteItem()] })}>
        <Plus className="h-3 w-3 mr-1" />항목 추가
      </Button>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground shrink-0">메모</span>
        <Input className="h-7 text-xs" value={row.notes} placeholder="메모 입력"
          onChange={(e) => setField('notes', e.target.value)} />
      </div>
    </div>
  )
}
