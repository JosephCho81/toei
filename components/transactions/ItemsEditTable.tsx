'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/NumberInput'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DEFAULT_UNIT } from '@/lib/constants/units'
import { cn } from '@/lib/utils'
import {
  itemsTotalUsd, itemSubtotalUsd, compareAmount, formatDiffUsd,
  type AmountDiffStatus,
} from '@/lib/calculations/itemTotals'
import { parseIntegerStrict } from '@/lib/utils/number'
import { useProducts } from '@/lib/products/useProducts'
import { applyProduct, nextRowValues } from '@/lib/products/rowFill'
import { useGridNav } from '@/lib/hooks/useGridNav'
import { ItemDatalists, ITEM_DATALIST, listIdsForSpec } from './ItemDatalists'

type Row = {
  _key: string
  id?: string
  spec: string; glove_type: string; color: string; size: string
  unit_price_usd: string; quantity: string; unit: string
}

/** 토에이 측 자료 금액 대조행 */
type CheckRow = {
  _key: string
  id?: string
  label: string
  amount_usd: string
  note: string
}

function blank(): Row {
  return {
    _key: crypto.randomUUID(),
    spec: '', glove_type: '', color: '', size: '',
    unit_price_usd: '', quantity: '', unit: DEFAULT_UNIT,
  }
}

function blankCheck(): CheckRow {
  return { _key: crypto.randomUUID(), label: '토에이 입력금액', amount_usd: '', note: '' }
}

function dbToRow(d: Record<string, unknown>): Row {
  return {
    _key: crypto.randomUUID(),
    id: d.id as string,
    spec: String(d.spec ?? ''), glove_type: String(d.glove_type ?? ''),
    color: String(d.color ?? ''), size: String(d.size ?? ''),
    unit_price_usd: d.unit_price_usd != null ? String(d.unit_price_usd) : '',
    quantity: d.quantity != null ? String(d.quantity) : '',
    unit: String(d.unit ?? DEFAULT_UNIT),
  }
}

function dbToCheck(d: Record<string, unknown>): CheckRow {
  return {
    _key: crypto.randomUUID(),
    id: d.id as string,
    label: String(d.label ?? '토에이 입력금액'),
    amount_usd: d.amount_usd != null ? String(d.amount_usd) : '',
    note: String(d.note ?? ''),
  }
}

const usd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const DIFF_STYLES: Record<AmountDiffStatus, { row: string; text: string; icon: string }> = {
  match:    { row: 'bg-emerald-50/60 dark:bg-emerald-950/20', text: 'text-emerald-600', icon: '✅' },
  minor:    { row: 'bg-amber-50/60 dark:bg-amber-950/20',     text: 'text-amber-600',   icon: '⚠️' },
  mismatch: { row: 'bg-red-50/70 dark:bg-red-950/20',         text: 'text-red-600 font-semibold', icon: '🔴' },
  empty:    { row: '',                                        text: 'text-muted-foreground', icon: '' },
}

export function ItemsEditTable({ transactionId, isLocked }: {
  transactionId: string
  isLocked: boolean
}) {
  const supabase = createClient()
  const { products } = useProducts()
  const { cellProps } = useGridNav('items-edit')
  const [rows, setRows] = useState<Row[]>([])
  const [checks, setChecks] = useState<CheckRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const [items, amountChecks] = await Promise.all([
        supabase
          .from('transaction_items')
          .select('id,spec,glove_type,color,size,unit_price_usd,quantity,unit,sort_order')
          .eq('transaction_id', transactionId)
          .order('sort_order'),
        supabase
          .from('transaction_amount_checks')
          .select('id,label,amount_usd,note,sort_order')
          .eq('transaction_id', transactionId)
          .order('sort_order'),
      ])
      if (!active) return
      setRows((items.data as Record<string, unknown>[] | null)?.map(dbToRow) ?? [])
      setChecks((amountChecks.data as Record<string, unknown>[] | null)?.map(dbToCheck) ?? [])
      setLoaded(true)
    }
    load()
    return () => { active = false }
  }, [transactionId])

  function upd(key: string, field: keyof Omit<Row, '_key' | 'id'>, value: string) {
    setRows((p) => p.map((r) => {
      if (r._key !== key) return r
      const next = { ...r, [field]: value }
      // 품목명을 마스터에서 고르면 재질·색상·단위를 자동으로 채운다
      return field === 'spec' ? { ...next, ...applyProduct(next, products) } : next
    }))
    setSaved(false)
  }

  function addRow() {
    setRows((p) => [...p, { ...blank(), ...nextRowValues(p, products) }])
    setSaved(false)
  }

  function updCheck(key: string, field: keyof Omit<CheckRow, '_key' | 'id'>, value: string) {
    setChecks((p) => p.map((c) => c._key === key ? { ...c, [field]: value } : c))
    setSaved(false)
  }

  async function save() {
    // 수량이 소수/음수면 parseInt 가 조용히 잘라 저장한다 — 저장 전에 막는다
    const badQty = rows.find((r) => r.quantity.trim() !== '' && parseIntegerStrict(r.quantity) == null)
    if (badQty) {
      toast.error(`수량은 0 이상 정수만 입력할 수 있습니다: '${badQty.spec || '품목'}' 의 '${badQty.quantity}'`)
      return
    }
    setSaving(true)
    const errors: string[] = []
    const check = (err: { message: string } | null) => { if (err) errors.push(err.message) }

    // ── 품목: id 보존 upsert (행 id가 바뀌면 감사로그·연결 데이터가 끊긴다)
    const validRows = rows.filter((r) => r.spec || r.quantity || r.unit_price_usd)
    const keptItemIds = new Set(validRows.filter((r) => r.id).map((r) => r.id!))
    const { data: dbItems } = await supabase.from('transaction_items')
      .select('id').eq('transaction_id', transactionId)
    const itemsToDelete = (dbItems ?? []).map((r) => r.id).filter((id: string) => !keptItemIds.has(id))
    if (itemsToDelete.length) {
      const { error } = await supabase.from('transaction_items').delete().in('id', itemsToDelete)
      check(error)
    }

    const itemsToInsert: Record<string, unknown>[] = []
    for (const [i, r] of validRows.entries()) {
      const payload = {
        spec: r.spec || null, glove_type: r.glove_type || null,
        color: r.color || null, size: r.size || null,
        unit_price_usd: r.unit_price_usd ? parseFloat(r.unit_price_usd) : null,
        quantity: r.quantity.trim() ? parseIntegerStrict(r.quantity) : null,
        unit: r.unit || DEFAULT_UNIT,
        sort_order: i,
      }
      if (r.id) {
        const { error } = await supabase.from('transaction_items').update(payload).eq('id', r.id)
        check(error)
      } else {
        itemsToInsert.push({ ...payload, transaction_id: transactionId })
      }
    }
    if (itemsToInsert.length) {
      const { error } = await supabase.from('transaction_items').insert(itemsToInsert)
      check(error)
    }

    // ── 대조금액
    const validChecks = checks.filter((c) => c.label.trim() || c.amount_usd || c.note.trim())
    const keptCheckIds = new Set(validChecks.filter((c) => c.id).map((c) => c.id!))
    const { data: dbChecks } = await supabase.from('transaction_amount_checks')
      .select('id').eq('transaction_id', transactionId)
    const checksToDelete = (dbChecks ?? []).map((c) => c.id).filter((id: string) => !keptCheckIds.has(id))
    if (checksToDelete.length) {
      const { error } = await supabase.from('transaction_amount_checks').delete().in('id', checksToDelete)
      check(error)
    }

    const checksToInsert: Record<string, unknown>[] = []
    for (const [i, c] of validChecks.entries()) {
      const payload = {
        label: c.label.trim() || '토에이 입력금액',
        amount_usd: c.amount_usd ? parseFloat(c.amount_usd) : null,
        note: c.note.trim() || null,
        sort_order: i,
      }
      if (c.id) {
        const { error } = await supabase.from('transaction_amount_checks').update(payload).eq('id', c.id)
        check(error)
      } else {
        checksToInsert.push({ ...payload, transaction_id: transactionId })
      }
    }
    if (checksToInsert.length) {
      const { error } = await supabase.from('transaction_amount_checks').insert(checksToInsert)
      check(error)
    }

    setSaving(false)
    if (errors.length) {
      toast.error(`저장 실패: ${errors[0]}`)
      return
    }
    setSaved(true)
    toast.success('저장했습니다')
  }

  const totalQty = rows.reduce((s, r) => s + (parseInt(r.quantity) || 0), 0)
  const totalUsd = itemsTotalUsd(rows)
  const diffs = checks.map((c) => ({ check: c, diff: compareAmount(totalUsd, c.amount_usd) }))
  const mismatches = diffs.filter((d) => d.diff.status === 'mismatch' || d.diff.status === 'minor')

  if (!loaded) return null

  const TEXT_COLS: (keyof Pick<Row, 'spec' | 'glove_type' | 'color' | 'size'>)[] = ['spec', 'glove_type', 'color', 'size']
  const COL_LABELS = ['품목', '종류', '색상', '사이즈']
  /** 품목을 고르면 그 품목에 등록된 사이즈·색상만 목록에 뜬다 */
  const datalistFor = (spec: string): Record<typeof TEXT_COLS[number], string> => {
    const lists = listIdsForSpec(products, spec)
    return {
      spec: ITEM_DATALIST.spec,
      glove_type: ITEM_DATALIST.gloveType,
      color: lists.color,
      size: lists.size,
    }
  }
  const totalCols = isLocked ? 8 : 9

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">품목 명세</CardTitle>
        {!isLocked && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" />행 추가
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setChecks((p) => [...p, blankCheck()]); setSaved(false) }}>
              <Plus className="h-4 w-4 mr-1" />대조금액 추가
            </Button>
            <Button size="sm" onClick={save} disabled={saving || saved}>
              {saved ? '저장됨' : saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ItemDatalists products={products} />
        {mismatches.length > 0 && (
          <div className="mx-4 mb-2 rounded-md border border-red-200 bg-red-50/70 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            품목 합계와 다른 입력금액이 {mismatches.length}건 있습니다. 차액 사유를 확인하세요.
          </div>
        )}
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
              {rows.map((r, rowIndex) => {
                const sub = itemSubtotalUsd(r)
                return (
                  <TableRow key={r._key}>
                    {TEXT_COLS.map((f, colIndex) => (
                      <TableCell key={f} className="p-1">
                        {isLocked
                          ? <span className="text-sm px-2">{r[f] || '-'}</span>
                          : <Input className="h-7 text-xs" value={r[f]} list={datalistFor(r.spec)[f]}
                              onChange={(e) => upd(r._key, f, e.target.value)}
                              {...cellProps(rowIndex, colIndex)} />}
                      </TableCell>
                    ))}
                    {(['unit_price_usd', 'quantity'] as const).map((f, i) => (
                      <TableCell key={f} className="p-1">
                        {isLocked
                          ? <span className="text-sm px-2 block text-right">{r[f] || '-'}</span>
                          : <NumberInput className="h-7 text-xs text-right w-24" value={r[f]}
                              onValueChange={(v) => upd(r._key, f, v)}
                              {...cellProps(rowIndex, 4 + i)} />}
                      </TableCell>
                    ))}
                    <TableCell className="p-1">
                      {isLocked
                        ? <span className="text-sm px-2">{r.unit}</span>
                        : <Input className="h-7 text-xs w-14" value={r.unit}
                            onChange={(e) => upd(r._key, 'unit', e.target.value)}
                            {...cellProps(rowIndex, 6)} />}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium pr-3">{usd(sub)}</TableCell>
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
                  <TableCell className="text-right text-sm pr-3">{usd(totalUsd)}</TableCell>
                  {!isLocked && <TableCell />}
                </TableRow>
              )}

              {/* 토에이 자료 대조행 — 합계 바로 아래 */}
              {diffs.map(({ check, diff }) => {
                const style = DIFF_STYLES[diff.status]
                return (
                  <TableRow key={check._key} className={cn('border-t-2', style.row)}>
                    <TableCell colSpan={4} className="p-1">
                      {isLocked
                        ? <span className="text-sm px-2">{check.label}</span>
                        : <Input className="h-7 text-xs" value={check.label}
                            placeholder="예: 토에이 입력금액"
                            onChange={(e) => updCheck(check._key, 'label', e.target.value)} />}
                    </TableCell>
                    <TableCell className="p-1" colSpan={2}>
                      {isLocked
                        ? <span className="text-sm px-2 block text-right">{check.amount_usd ? usd(parseFloat(check.amount_usd)) : '-'}</span>
                        : <NumberInput className="h-7 text-xs text-right font-mono"
                            value={check.amount_usd} placeholder="금액 입력(USD)"
                            onValueChange={(v) => updCheck(check._key, 'amount_usd', v)} />}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">USD</TableCell>
                    <TableCell className={cn('text-right text-sm pr-3 whitespace-nowrap', style.text)}>
                      {diff.status === 'empty'
                        ? '-'
                        : `${style.icon} ${formatDiffUsd(diff.diffUsd)}${diff.diffPct != null && diff.status !== 'match' ? ` (${diff.diffPct.toFixed(2)}%)` : ''}`}
                    </TableCell>
                    {!isLocked && (
                      <TableCell className="p-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => { setChecks((p) => p.filter((x) => x._key !== check._key)); setSaved(false) }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
              {diffs.map(({ check, diff }) => (
                (isLocked && !check.note) ? null : (
                  <TableRow key={`${check._key}-note`} className={cn('border-t-0', DIFF_STYLES[diff.status].row)}>
                    <TableCell colSpan={totalCols} className="px-3 pb-2 pt-0">
                      {isLocked ? (
                        <p className="text-xs text-muted-foreground">차액 사유: {check.note}</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">차액 사유</span>
                          <Input className="h-6 text-xs" value={check.note}
                            placeholder="차이가 나는 이유 / 검토 결과 입력"
                            onChange={(e) => updCheck(check._key, 'note', e.target.value)} />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              ))}

              {rows.length === 0 && checks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={totalCols} className="text-center text-muted-foreground py-6 text-sm">
                    품목 데이터가 없습니다.{!isLocked && ' 행 추가 버튼을 눌러 추가하세요.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {!isLocked && (
          <p className="px-4 py-2 text-xs text-muted-foreground">
            ↑·↓ 로 위아래 칸 이동, Tab 으로 오른쪽 이동. 품목을 고르면 종류·색상·단위가 자동 입력되고, 행 추가 시 사이즈가 순서대로 채워집니다.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
