'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Trash2 } from 'lucide-react'

type Row = {
  _key: string
  spec: string; glove_type: string; color: string; size: string
  unit_price_usd: string; quantity: string; unit: string
}

function blank(): Row {
  return {
    _key: crypto.randomUUID(),
    spec: '', glove_type: '', color: '', size: '',
    unit_price_usd: '', quantity: '', unit: 'DZ',
  }
}

function dbToRow(d: Record<string, unknown>): Row {
  return {
    _key: crypto.randomUUID(),
    spec: String(d.spec ?? ''), glove_type: String(d.glove_type ?? ''),
    color: String(d.color ?? ''), size: String(d.size ?? ''),
    unit_price_usd: d.unit_price_usd != null ? String(d.unit_price_usd) : '',
    quantity: d.quantity != null ? String(d.quantity) : '',
    unit: String(d.unit ?? 'DZ'),
  }
}

export function ItemsEditTable({ transactionId, isLocked }: {
  transactionId: string
  isLocked: boolean
}) {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase
      .from('transaction_items')
      .select('spec,glove_type,color,size,unit_price_usd,quantity,unit,sort_order')
      .eq('transaction_id', transactionId)
      .order('sort_order')
      .then(({ data }) => {
        setRows(data?.length ? (data as Record<string, unknown>[]).map(dbToRow) : [])
        setLoaded(true)
      })
  }, [transactionId])

  function upd(key: string, field: keyof Omit<Row, '_key'>, value: string) {
    setRows((p) => p.map((r) => r._key === key ? { ...r, [field]: value } : r))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    await supabase.from('transaction_items').delete().eq('transaction_id', transactionId)
    const payload = rows
      .filter((r) => r.spec || r.quantity || r.unit_price_usd)
      .map((r, i) => ({
        transaction_id: transactionId,
        spec: r.spec || null, glove_type: r.glove_type || null,
        color: r.color || null, size: r.size || null,
        unit_price_usd: r.unit_price_usd ? parseFloat(r.unit_price_usd) : null,
        quantity: r.quantity ? parseInt(r.quantity) : null,
        unit: r.unit || 'DZ',
        sort_order: i,
      }))
    if (payload.length) await supabase.from('transaction_items').insert(payload)
    setSaving(false)
    setSaved(true)
  }

  const totalQty = rows.reduce((s, r) => s + (parseInt(r.quantity) || 0), 0)
  const totalUsd = rows.reduce((s, r) => s + (parseFloat(r.unit_price_usd) || 0) * (parseInt(r.quantity) || 0), 0)

  if (!loaded) return null

  const TEXT_COLS: (keyof Pick<Row, 'spec' | 'glove_type' | 'color' | 'size'>)[] = ['spec', 'glove_type', 'color', 'size']
  const COL_LABELS = ['사양', '종류', '색상', '사이즈']

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">품목 명세</CardTitle>
        {!isLocked && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setRows((p) => [...p, blank()]); setSaved(false) }}>
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
                {COL_LABELS.map((l) => <TableHead key={l}>{l}</TableHead>)}
                <TableHead className="text-right">단가(USD)</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead>단위</TableHead>
                <TableHead className="text-right">소계</TableHead>
                {!isLocked && <TableHead className="w-8" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const sub = (parseFloat(r.unit_price_usd) || 0) * (parseInt(r.quantity) || 0)
                return (
                  <TableRow key={r._key}>
                    {TEXT_COLS.map((f) => (
                      <TableCell key={f} className="p-1">
                        {isLocked
                          ? <span className="text-sm px-2">{r[f] || '-'}</span>
                          : <Input className="h-7 text-xs" value={r[f]} onChange={(e) => upd(r._key, f, e.target.value)} />}
                      </TableCell>
                    ))}
                    {(['unit_price_usd', 'quantity'] as const).map((f) => (
                      <TableCell key={f} className="p-1">
                        {isLocked
                          ? <span className="text-sm px-2 block text-right">{r[f] || '-'}</span>
                          : <Input className="h-7 text-xs text-right w-24" type="number" step={f === 'unit_price_usd' ? '0.01' : '1'} value={r[f]} onChange={(e) => upd(r._key, f, e.target.value)} />}
                      </TableCell>
                    ))}
                    <TableCell className="p-1">
                      {isLocked
                        ? <span className="text-sm px-2">{r.unit}</span>
                        : <Input className="h-7 text-xs w-14" value={r.unit} onChange={(e) => upd(r._key, 'unit', e.target.value)} />}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium pr-3">${sub.toFixed(2)}</TableCell>
                    {!isLocked && (
                      <TableCell className="p-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => { setRows((p) => p.filter((x) => x._key !== r._key)); setSaved(false) }}
                          disabled={rows.length <= 1}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
              {rows.length > 0 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={5} className="text-right text-sm">합계</TableCell>
                  <TableCell className="text-right text-sm">{totalQty.toLocaleString('ko-KR')}</TableCell>
                  <TableCell />
                  <TableCell className="text-right text-sm pr-3">${totalUsd.toFixed(2)}</TableCell>
                  {!isLocked && <TableCell />}
                </TableRow>
              )}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isLocked ? 8 : 9} className="text-center text-muted-foreground py-6 text-sm">
                    품목 데이터가 없습니다.{!isLocked && ' 행 추가 버튼을 눌러 추가하세요.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
