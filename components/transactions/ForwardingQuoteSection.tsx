'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Trash2 } from 'lucide-react'

type Row = {
  _key: string
  forwarder_name: string; quote_date: string; quote_amount_krw: string
  actual_amount_krw: string; notes: string
}

function blank(): Row {
  return { _key: crypto.randomUUID(), forwarder_name: '오션마스터', quote_date: '', quote_amount_krw: '', actual_amount_krw: '', notes: '' }
}

function formatKrw(v: number) {
  return v.toLocaleString('ko-KR') + '원'
}

export function ForwardingQuoteSection({ transactionId, isLocked }: { transactionId: string; isLocked: boolean }) {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('forwarding_quotes')
      .select('forwarder_name,quote_date,quote_amount_krw,actual_amount_krw,notes,sort_order')
      .eq('transaction_id', transactionId).order('sort_order')
      .then(({ data }) => {
        setRows(data?.length ? data.map(d => ({
          _key: crypto.randomUUID(),
          forwarder_name: d.forwarder_name ?? '', quote_date: d.quote_date ?? '',
          quote_amount_krw: d.quote_amount_krw?.toString() ?? '',
          actual_amount_krw: d.actual_amount_krw?.toString() ?? '',
          notes: d.notes ?? '',
        })) : [])
        setLoaded(true)
      })
  }, [transactionId])

  function upd(key: string, field: keyof Omit<Row, '_key'>, value: string) {
    setRows(p => p.map(r => r._key === key ? { ...r, [field]: value } : r))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    await supabase.from('forwarding_quotes').delete().eq('transaction_id', transactionId)
    const payload = rows.filter(r => r.forwarder_name).map((r, i) => ({
      transaction_id: transactionId,
      forwarder_name: r.forwarder_name,
      quote_date: r.quote_date || null,
      quote_amount_krw: r.quote_amount_krw ? parseInt(r.quote_amount_krw) : null,
      actual_amount_krw: r.actual_amount_krw ? parseInt(r.actual_amount_krw) : null,
      notes: r.notes || null,
      sort_order: i,
    }))
    if (payload.length) await supabase.from('forwarding_quotes').insert(payload)
    setSaving(false); setSaved(true)
  }

  if (!loaded) return null

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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>포워더</TableHead><TableHead>견적일</TableHead>
                <TableHead className="text-right">견적금액(KRW)</TableHead>
                <TableHead className="text-right">실청구액(KRW)</TableHead>
                <TableHead className="text-right">차이</TableHead>
                <TableHead>메모</TableHead>
                {!isLocked && <TableHead className="w-8" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const q = parseInt(r.quote_amount_krw) || 0
                const a = parseInt(r.actual_amount_krw) || 0
                const diff = a && q ? a - q : null
                return (
                  <TableRow key={r._key}>
                    <TableCell className="p-1">{isLocked ? <span className="text-sm px-2">{r.forwarder_name}</span> : <Input className="h-7 text-xs" value={r.forwarder_name} onChange={e => upd(r._key, 'forwarder_name', e.target.value)} />}</TableCell>
                    <TableCell className="p-1">{isLocked ? <span className="text-sm px-2">{r.quote_date||'-'}</span> : <Input type="date" className="h-7 text-xs" value={r.quote_date} onChange={e => upd(r._key, 'quote_date', e.target.value)} />}</TableCell>
                    <TableCell className="p-1">{isLocked ? <span className="text-sm px-2 block text-right">{q ? formatKrw(q) : '-'}</span> : <Input className="h-7 text-xs text-right w-28" type="number" value={r.quote_amount_krw} onChange={e => upd(r._key, 'quote_amount_krw', e.target.value)} />}</TableCell>
                    <TableCell className="p-1">{isLocked ? <span className="text-sm px-2 block text-right">{a ? formatKrw(a) : '-'}</span> : <Input className="h-7 text-xs text-right w-28" type="number" value={r.actual_amount_krw} onChange={e => upd(r._key, 'actual_amount_krw', e.target.value)} />}</TableCell>
                    <TableCell className={`text-right text-sm font-medium pr-2 ${diff == null ? '' : diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {diff == null ? '-' : `${diff > 0 ? '+' : ''}${formatKrw(diff)}${diff > 0 ? ' (초과)' : ' (절감)'}`}
                    </TableCell>
                    <TableCell className="p-1">{isLocked ? <span className="text-sm px-2">{r.notes||'-'}</span> : <Input className="h-7 text-xs" value={r.notes} onChange={e => upd(r._key, 'notes', e.target.value)} />}</TableCell>
                    {!isLocked && <TableCell className="p-1"><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setRows(p => p.filter(x => x._key !== r._key)); setSaved(false) }} disabled={rows.length <= 1}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>}
                  </TableRow>
                )
              })}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={isLocked ? 6 : 7} className="text-center text-muted-foreground py-4 text-sm">
                  견적 데이터가 없습니다.{!isLocked && ' 행 추가 버튼을 눌러 추가하세요.'}
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
