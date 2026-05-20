'use client'
import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Trash2 } from 'lucide-react'

type QuoteItem = {
  id: string
  item_type: string | null
  item_name: string | null
  currency: string | null
  exchange_rate: number | null
  rate: number | null
  amount_cur: number | null
  amount_krw: number | null
  vat_amount_krw: number | null
  is_vat_taxable: boolean | null
  sort_order: number | null
}

type Row = {
  _key: string
  id?: string
  forwarder_name: string; quote_date: string
  notes: string
  items: QuoteItem[]
}

function blank(): Row {
  return { _key: crypto.randomUUID(), forwarder_name: '오션마스터', quote_date: '', notes: '', items: [] }
}

function formatKrw(v: number) {
  return v.toLocaleString('ko-KR') + '원'
}

const SELECT_QUERY = 'id,forwarder_name,quote_date,notes,sort_order,forwarding_quote_items(id,item_type,item_name,currency,exchange_rate,rate,amount_cur,amount_krw,vat_amount_krw,is_vat_taxable,sort_order)'

function mapRow(d: Record<string, unknown>): Row {
  return {
    _key: crypto.randomUUID(),
    id: d.id as string,
    forwarder_name: (d.forwarder_name as string) ?? '',
    quote_date: (d.quote_date as string) ?? '',
    notes: (d.notes as string) ?? '',
    items: ((d.forwarding_quote_items as QuoteItem[]) ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }
}

export function ForwardingQuoteSection({ transactionId, isLocked }: { transactionId: string; isLocked: boolean }) {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function load() {
    const { data } = await supabase.from('forwarding_quotes')
      .select(SELECT_QUERY)
      .eq('transaction_id', transactionId).order('sort_order')
    setRows(data?.length ? data.map(d => mapRow(d as Record<string, unknown>)) : [])
    setLoaded(true)
  }

  useEffect(() => { load() }, [transactionId])

  function upd(key: string, field: keyof Omit<Row, '_key' | 'id'>, value: string) {
    setRows(p => p.map(r => r._key === key ? { ...r, [field]: value } : r))
    setSaved(false)
  }

  async function save() {
    setSaving(true)

    const validRows = rows.filter(r => r.forwarder_name)
    const currentIds = new Set(validRows.filter(r => r.id).map(r => r.id!))

    const { data: dbQuotes } = await supabase.from('forwarding_quotes')
      .select('id').eq('transaction_id', transactionId)
    const toDelete = (dbQuotes ?? []).map(q => q.id).filter((id: string) => !currentIds.has(id))
    if (toDelete.length) {
      await supabase.from('forwarding_quotes').delete().in('id', toDelete)
    }

    for (const [i, r] of validRows.entries()) {
      const payload = {
        transaction_id: transactionId,
        forwarder_name: r.forwarder_name,
        quote_date: r.quote_date || null,
        notes: r.notes || null,
        sort_order: i,
      }
      if (r.id) {
        await supabase.from('forwarding_quotes').update(payload).eq('id', r.id)
      } else {
        await supabase.from('forwarding_quotes').insert(payload)
      }
    }

    await load()
    setSaving(false)
    setSaved(true)
  }

  if (!loaded) return null

  // 컬럼: 포워더(+견적일 서브텍스트) | 항목 | 견적금액(KRW) | [삭제]
  const colSpan = isLocked ? 3 : 4

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">포워딩 견적</CardTitle>
        {!isLocked && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setRows(p => [...p, blank()]); setSaved(false) }}>
              <Plus className="h-4 w-4 mr-1" />행 추가
            </Button>
            <Button size="sm" onClick={save} disabled={saving || saved}>
              {saved ? '저장됨' : saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">포워더</TableHead>
              <TableHead>항목</TableHead>
              <TableHead className="text-right w-36">견적금액(KRW)</TableHead>
              {!isLocked && <TableHead className="w-8" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const q = r.items.reduce((s, item) => s + (item.amount_krw ?? 0), 0)
              const hasItems = r.items.length > 0

              // 잠금 + 세부항목 있음: 항목별 행 분리
              if (isLocked && hasItems) {
                const rowCount = r.items.length + 1  // 세부항목 + 합계행
                return (
                  <React.Fragment key={r._key}>
                    {r.items.map((item, idx) => (
                      <TableRow key={item.id}>
                        {idx === 0 && (
                          <TableCell rowSpan={rowCount} className="align-top text-sm px-3 py-2 border-r">
                            <div className="font-medium">{r.forwarder_name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{r.quote_date || '-'}</div>
                          </TableCell>
                        )}
                        <TableCell className="px-3 py-1 text-xs text-left">
                          <span className="font-medium">{item.item_name ?? '-'}</span>
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
                          {item.amount_krw != null ? formatKrw(item.amount_krw) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30">
                      <TableCell className="px-3 py-1.5 text-xs text-muted-foreground">합계</TableCell>
                      <TableCell className="text-right text-sm font-semibold font-mono px-3 py-1.5">
                        {q ? formatKrw(q) : '-'}
                      </TableCell>
                    </TableRow>
                    {r.notes && (
                      <TableRow className="border-t-0">
                        <TableCell colSpan={colSpan} className="px-3 pb-2 pt-0">
                          <p className="text-xs text-muted-foreground">메모: {r.notes}</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              }

              // 편집 모드 또는 세부항목 없음
              return (
                <React.Fragment key={r._key}>
                  <TableRow>
                    <TableCell className="p-1 align-top">
                      {isLocked ? (
                        <div>
                          <div className="text-sm px-2">{r.forwarder_name}</div>
                          <div className="text-xs text-muted-foreground px-2 mt-0.5">{r.quote_date || '-'}</div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Input className="h-7 text-xs" value={r.forwarder_name} onChange={e => upd(r._key, 'forwarder_name', e.target.value)} />
                          <Input type="date" className="h-7 text-xs" value={r.quote_date} onChange={e => upd(r._key, 'quote_date', e.target.value)} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="p-1 align-top">
                      {hasItems ? (
                        <ul className="space-y-0.5 px-1 py-0.5">
                          {r.items.map((item) => (
                            <li key={item.id} className="text-xs flex items-baseline gap-1.5">
                              <span className="font-medium">{item.item_name ?? '-'}</span>
                              {item.currency && item.currency !== 'KRW' && item.amount_cur != null && (
                                <span className="text-muted-foreground">{item.currency} {item.amount_cur.toLocaleString('ko-KR')}</span>
                              )}
                              {item.is_vat_taxable && (
                                <span className="text-blue-500 text-[10px]">VAT</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs px-2 text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="p-1">
                      <span className="text-sm px-2 block text-right">{q ? formatKrw(q) : '-'}</span>
                    </TableCell>
                    {!isLocked && (
                      <TableCell className="p-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => { setRows(p => p.filter(x => x._key !== r._key)); setSaved(false) }}
                          disabled={rows.length <= 1}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                  {(r.notes || !isLocked) && (
                    <TableRow key={`${r._key}-notes`} className="border-t-0">
                      <TableCell colSpan={colSpan} className="px-3 pb-2 pt-0">
                        {isLocked ? (
                          r.notes && <p className="text-xs text-muted-foreground">메모: {r.notes}</p>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground shrink-0">메모</span>
                            <Input className="h-6 text-xs" value={r.notes} placeholder="메모 입력" onChange={e => upd(r._key, 'notes', e.target.value)} />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-4 text-sm">
                  견적 데이터가 없습니다.{!isLocked && ' 행 추가 버튼을 눌러 추가하세요.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
