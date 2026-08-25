'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/NumberInput'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type ItemType = 'quote' | 'invoice'

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  quote: '견적',
  invoice: '실청구',
}

const DEFAULT_ITEM_NAMES = ['해상운임', '터미널 처리비(THC)', '서류발급비(D/O Fee)', '내륙운송비', '기타운임']

type ItemRow = {
  _key: string
  id?: string
  item_type: ItemType
  item_name: string
  amount_krw: string
  is_vat_taxable: boolean
  // PDF 파싱으로 들어온 외화 정보 — 화면에서는 읽기 전용으로만 노출
  currency: string | null
  amount_cur: number | null
}

type Row = {
  _key: string
  id?: string
  forwarder_name: string; quote_date: string
  notes: string
  items: ItemRow[]
}

function blankItem(item_name = '', item_type: ItemType = 'quote'): ItemRow {
  return {
    _key: crypto.randomUUID(),
    item_type, item_name, amount_krw: '', is_vat_taxable: false,
    currency: null, amount_cur: null,
  }
}

function blank(): Row {
  return {
    _key: crypto.randomUUID(),
    forwarder_name: '오션마스터',
    quote_date: '',
    notes: '',
    items: DEFAULT_ITEM_NAMES.map((n) => blankItem(n)),
  }
}

function formatKrw(v: number) {
  return v.toLocaleString('ko-KR') + '원'
}

const SELECT_QUERY = 'id,forwarder_name,quote_date,notes,sort_order,forwarding_quote_items(id,item_type,item_name,currency,exchange_rate,rate,amount_cur,amount_krw,vat_amount_krw,is_vat_taxable,sort_order)'

type DbItem = {
  id: string
  item_type: string | null
  item_name: string | null
  currency: string | null
  amount_cur: number | null
  amount_krw: number | null
  is_vat_taxable: boolean | null
  sort_order: number | null
}

function mapRow(d: Record<string, unknown>): Row {
  return {
    _key: crypto.randomUUID(),
    id: d.id as string,
    forwarder_name: (d.forwarder_name as string) ?? '',
    quote_date: (d.quote_date as string) ?? '',
    notes: (d.notes as string) ?? '',
    items: ((d.forwarding_quote_items as DbItem[]) ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i) => ({
        _key: crypto.randomUUID(),
        id: i.id,
        item_type: i.item_type === 'quote' ? 'quote' : 'invoice',
        item_name: i.item_name ?? '',
        amount_krw: i.amount_krw != null ? String(i.amount_krw) : '',
        is_vat_taxable: i.is_vat_taxable ?? false,
        currency: i.currency,
        amount_cur: i.amount_cur,
      })),
  }
}

export function ForwardingQuoteSection({ transactionId, isLocked }: { transactionId: string; isLocked: boolean }) {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('forwarding_quotes')
      .select(SELECT_QUERY)
      .eq('transaction_id', transactionId).order('sort_order')
    setRows(data?.length ? data.map(d => mapRow(d as Record<string, unknown>)) : [])
    setLoaded(true)
  }, [supabase, transactionId])

  useEffect(() => {
    async function run() { await load() }
    run()
  }, [load])

  function upd(key: string, field: keyof Omit<Row, '_key' | 'id' | 'items'>, value: string) {
    setRows(p => p.map(r => r._key === key ? { ...r, [field]: value } : r))
    setSaved(false)
  }

  function updItem(rowKey: string, itemKey: string, field: keyof Omit<ItemRow, '_key' | 'id'>, value: string | boolean) {
    setRows(p => p.map(r => r._key !== rowKey ? r : {
      ...r,
      items: r.items.map(i => i._key === itemKey ? { ...i, [field]: value } : i),
    }))
    setSaved(false)
  }

  function addItem(rowKey: string) {
    setRows(p => p.map(r => r._key !== rowKey ? r : { ...r, items: [...r.items, blankItem()] }))
    setSaved(false)
  }

  function removeItem(rowKey: string, itemKey: string) {
    setRows(p => p.map(r => r._key !== rowKey ? r : { ...r, items: r.items.filter(i => i._key !== itemKey) }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    const errors: string[] = []
    const check = (err: { message: string } | null) => { if (err) errors.push(err.message) }

    const validRows = rows.filter(r => r.forwarder_name)
    const currentIds = new Set(validRows.filter(r => r.id).map(r => r.id!))

    const { data: dbQuotes } = await supabase.from('forwarding_quotes')
      .select('id').eq('transaction_id', transactionId)
    const toDelete = (dbQuotes ?? []).map(q => q.id).filter((id: string) => !currentIds.has(id))
    if (toDelete.length) {
      const { error } = await supabase.from('forwarding_quotes').delete().in('id', toDelete)
      check(error)
    }

    for (const [i, r] of validRows.entries()) {
      const payload = {
        transaction_id: transactionId,
        forwarder_name: r.forwarder_name,
        quote_date: r.quote_date || null,
        notes: r.notes || null,
        sort_order: i,
      }
      let quoteId = r.id
      if (quoteId) {
        const { error } = await supabase.from('forwarding_quotes').update(payload).eq('id', quoteId)
        check(error)
      } else {
        const { data: inserted, error } = await supabase.from('forwarding_quotes')
          .insert(payload).select('id').single()
        check(error)
        quoteId = inserted?.id
      }
      if (!quoteId) continue

      const validItems = r.items.filter(it => it.item_name.trim() || it.amount_krw)
      const keptIds = new Set(validItems.filter(it => it.id).map(it => it.id!))
      const { data: dbItems } = await supabase.from('forwarding_quote_items')
        .select('id').eq('forwarding_quote_id', quoteId)
      const itemsToDelete = (dbItems ?? []).map(it => it.id).filter((id: string) => !keptIds.has(id))
      if (itemsToDelete.length) {
        const { error } = await supabase.from('forwarding_quote_items').delete().in('id', itemsToDelete)
        check(error)
      }

      const toInsert: Record<string, unknown>[] = []
      for (const [j, it] of validItems.entries()) {
        // 외화 컬럼(currency/exchange_rate/amount_cur)은 편집 대상이 아니므로 건드리지 않는다
        const itemPayload = {
          item_type: it.item_type,
          item_name: it.item_name.trim() || null,
          amount_krw: it.amount_krw ? Number(it.amount_krw) : null,
          is_vat_taxable: it.is_vat_taxable,
          sort_order: j,
        }
        if (it.id) {
          const { error } = await supabase.from('forwarding_quote_items').update(itemPayload).eq('id', it.id)
          check(error)
        } else {
          toInsert.push({ ...itemPayload, forwarding_quote_id: quoteId })
        }
      }
      if (toInsert.length) {
        const { error } = await supabase.from('forwarding_quote_items').insert(toInsert)
        check(error)
      }
    }

    await load()
    setSaving(false)
    if (errors.length) {
      toast.error(`저장 실패: ${errors[0]}`)
      return
    }
    setSaved(true)
    toast.success('저장했습니다')
  }

  if (!loaded) return null

  // 잠금(조회) 모드 컬럼: 포워더 | 항목 | 금액(KRW)
  const lockedColSpan = 3

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">포워딩 견적</CardTitle>
        {!isLocked && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setRows(p => [...p, blank()]); setSaved(false) }}>
              <Plus className="h-4 w-4 mr-1" />견적 추가
            </Button>
            <Button size="sm" onClick={save} disabled={saving || saved}>
              {saved ? '저장됨' : saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        )}
      </CardHeader>

      {isLocked ? (
        <CardContent className="p-0">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">포워더</TableHead>
                <TableHead>항목</TableHead>
                <TableHead className="text-right w-36">금액(KRW)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const quoteTotal = r.items.filter(i => i.item_type === 'quote')
                  .reduce((s, i) => s + (Number(i.amount_krw) || 0), 0)
                const actualTotal = r.items.filter(i => i.item_type === 'invoice')
                  .reduce((s, i) => s + (Number(i.amount_krw) || 0), 0)
                const rowCount = r.items.length + 1  // 세부항목 + 합계행

                return (
                  <React.Fragment key={r._key}>
                    {r.items.map((item, idx) => (
                      <TableRow key={item._key}>
                        {idx === 0 && (
                          <TableCell rowSpan={rowCount} className="align-top text-sm px-3 py-2 border-r">
                            <div className="font-medium">{r.forwarder_name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{r.quote_date || '-'}</div>
                          </TableCell>
                        )}
                        <TableCell className="px-3 py-1 text-xs text-left">
                          <span className="text-muted-foreground mr-1.5">[{ITEM_TYPE_LABELS[item.item_type]}]</span>
                          <span className="font-medium">{item.item_name || '-'}</span>
                          {item.currency && item.currency !== 'KRW' && item.amount_cur != null && (
                            <span className="text-muted-foreground ml-1.5 text-[10px]">
                              {item.currency} {item.amount_cur.toLocaleString('ko-KR')}
                            </span>
                          )}
                          {item.is_vat_taxable && (
                            <span className="text-blue-500 text-[10px] ml-1">VAT</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono px-3 py-1">
                          {item.amount_krw ? formatKrw(Number(item.amount_krw)) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30">
                      {r.items.length === 0 && (
                        <TableCell className="align-top text-sm px-3 py-2 border-r">
                          <div className="font-medium">{r.forwarder_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{r.quote_date || '-'}</div>
                        </TableCell>
                      )}
                      <TableCell className="px-3 py-1.5 text-xs text-muted-foreground">
                        합계 (견적 {formatKrw(quoteTotal)} / 실청구 {formatKrw(actualTotal)})
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold font-mono px-3 py-1.5">
                        {formatKrw(actualTotal || quoteTotal)}
                      </TableCell>
                    </TableRow>
                    {r.notes && (
                      <TableRow className="border-t-0">
                        <TableCell colSpan={lockedColSpan} className="px-3 pb-2 pt-0">
                          <p className="text-xs text-muted-foreground">메모: {r.notes}</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={lockedColSpan} className="text-center text-muted-foreground py-4 text-sm">
                    견적 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      ) : (
        <CardContent className="space-y-4">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">견적 데이터가 없습니다. 견적 추가 버튼을 눌러 추가하세요.</p>
          )}
          {rows.map((r) => {
            const quoteTotal = r.items.filter(i => i.item_type === 'quote')
              .reduce((s, i) => s + (Number(i.amount_krw) || 0), 0)
            const actualTotal = r.items.filter(i => i.item_type === 'invoice')
              .reduce((s, i) => s + (Number(i.amount_krw) || 0), 0)

            return (
              <div key={r._key} className="border rounded-md p-3 space-y-3">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">포워더명</Label>
                    <Input className="h-8 text-sm" value={r.forwarder_name}
                      onChange={e => upd(r._key, 'forwarder_name', e.target.value)} />
                  </div>
                  <div className="w-40 space-y-1">
                    <Label className="text-xs text-muted-foreground">견적일</Label>
                    <Input type="date" className="h-8 text-sm" value={r.quote_date}
                      onChange={e => upd(r._key, 'quote_date', e.target.value)} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => { setRows(p => p.filter(x => x._key !== r._key)); setSaved(false) }}>
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
                    {r.items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-2 text-xs text-muted-foreground">
                          항목이 없습니다. 아래 &lsquo;항목 추가&rsquo; 버튼을 누르세요.
                        </td>
                      </tr>
                    )}
                    {r.items.map((it) => (
                      <tr key={it._key} className="border-b border-dashed">
                        <td className="py-1 pr-2">
                          <Select value={it.item_type}
                            onValueChange={v => updItem(r._key, it._key, 'item_type', (v as ItemType) ?? 'quote')}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.keys(ITEM_TYPE_LABELS) as ItemType[]).map(t => (
                                <SelectItem key={t} value={t}>{ITEM_TYPE_LABELS[t]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-1 pr-2">
                          <Input className="h-7 text-sm" value={it.item_name} placeholder="항목명 입력"
                            onChange={e => updItem(r._key, it._key, 'item_name', e.target.value)} />
                          {it.currency && it.currency !== 'KRW' && it.amount_cur != null && (
                            <span className="text-[10px] text-muted-foreground">
                              {it.currency} {it.amount_cur.toLocaleString('ko-KR')}
                            </span>
                          )}
                        </td>
                        <td className="py-1 px-2">
                          <NumberInput className="h-7 text-sm text-right font-mono" value={it.amount_krw}
                            onValueChange={v => updItem(r._key, it._key, 'amount_krw', v)} />
                        </td>
                        <td className="py-1 px-2 text-center">
                          <Checkbox checked={it.is_vat_taxable}
                            onCheckedChange={v => updItem(r._key, it._key, 'is_vat_taxable', !!v)} />
                        </td>
                        <td className="py-1 pl-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={() => removeItem(r._key, it._key)}>
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
                        견적 {quoteTotal.toLocaleString('ko-KR')} / 실청구 {actualTotal.toLocaleString('ko-KR')}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>

                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => addItem(r._key)}>
                    <Plus className="h-3 w-3 mr-1" />항목 추가
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">메모</span>
                  <Input className="h-7 text-xs" value={r.notes} placeholder="메모 입력"
                    onChange={e => upd(r._key, 'notes', e.target.value)} />
                </div>
              </div>
            )
          })}
        </CardContent>
      )}
    </Card>
  )
}
