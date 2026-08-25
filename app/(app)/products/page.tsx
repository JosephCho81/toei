'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Download } from 'lucide-react'
import { DEFAULT_UNIT } from '@/lib/constants/units'
import { PRODUCT_SELECT, type Product } from '@/lib/products/useProducts'
import { sizeSequenceFor } from '@/lib/products/sizes'
import { GLOVE_TYPES } from '@/components/transactions/ItemDatalists'

type Row = {
  _key: string
  id?: string
  name: string
  glove_type: string
  color: string
  default_unit: string
  size_sequence: string   // 쉼표 구분 문자열로 편집
  is_active: boolean
}

function blank(): Row {
  return {
    _key: crypto.randomUUID(),
    name: '', glove_type: '', color: '',
    default_unit: DEFAULT_UNIT, size_sequence: 'S, M, L', is_active: true,
  }
}

function toRow(p: Product): Row {
  return {
    _key: crypto.randomUUID(),
    id: p.id,
    name: p.name,
    glove_type: p.glove_type ?? '',
    color: p.color ?? '',
    default_unit: p.default_unit || DEFAULT_UNIT,
    size_sequence: (p.size_sequence ?? []).join(', '),
    is_active: p.is_active,
  }
}

function parseSizes(v: string): string[] {
  return v.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
}

export default function ProductsPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('products')
      .select(PRODUCT_SELECT).order('sort_order').order('name')
    if (err) setError(`품목 마스터를 불러오지 못했습니다: ${err.message}`)
    setRows(((data as Product[] | null) ?? []).map(toRow))
    setLoaded(true)
  }, [supabase])

  useEffect(() => {
    async function run() { await load() }
    run()
  }, [load])

  function upd(key: string, field: keyof Omit<Row, '_key' | 'id'>, value: string | boolean) {
    setRows((p) => p.map((r) => r._key === key ? { ...r, [field]: value } : r))
    setSaved(false)
  }

  async function save() {
    setSaving(true); setError(null)
    const valid = rows.filter((r) => r.name.trim())

    const keptIds = new Set(valid.filter((r) => r.id).map((r) => r.id!))
    const { data: dbRows } = await supabase.from('products').select('id')
    const toDelete = (dbRows ?? []).map((r) => r.id).filter((id: string) => !keptIds.has(id))
    if (toDelete.length) await supabase.from('products').delete().in('id', toDelete)

    const toInsert: Record<string, unknown>[] = []
    for (const [i, r] of valid.entries()) {
      const payload = {
        name: r.name.trim(),
        glove_type: r.glove_type.trim() || null,
        color: r.color.trim() || null,
        default_unit: r.default_unit.trim() || DEFAULT_UNIT,
        size_sequence: parseSizes(r.size_sequence).length
          ? parseSizes(r.size_sequence)
          : sizeSequenceFor(null, r.name),
        is_active: r.is_active,
        sort_order: i,
      }
      if (r.id) {
        const { error: err } = await supabase.from('products').update(payload).eq('id', r.id)
        if (err) { setError(err.message); setSaving(false); return }
      } else {
        toInsert.push(payload)
      }
    }
    if (toInsert.length) {
      const { error: err } = await supabase.from('products').insert(toInsert)
      if (err) { setError(err.message); setSaving(false); return }
    }

    await load()
    setSaving(false)
    setSaved(true)
  }

  /** 기존 거래 품목에서 마스터에 없는 품목명을 끌어온다(재질·색상은 최빈값). */
  async function importFromTransactions() {
    setError(null); setMessage(null)
    const { data, error: err } = await supabase
      .from('transaction_items')
      .select('spec,glove_type,color,unit')
      .not('spec', 'is', null)
      .limit(5000)
    if (err) { setError(err.message); return }

    const bySpec = new Map<string, { types: string[]; colors: string[]; units: string[] }>()
    for (const it of (data ?? []) as { spec: string; glove_type: string | null; color: string | null; unit: string | null }[]) {
      const key = it.spec.trim()
      if (!key) continue
      const entry = bySpec.get(key) ?? { types: [], colors: [], units: [] }
      if (it.glove_type) entry.types.push(it.glove_type)
      if (it.color) entry.colors.push(it.color)
      if (it.unit) entry.units.push(it.unit)
      bySpec.set(key, entry)
    }

    const mostCommon = (values: string[]): string =>
      [...values.reduce((m, v) => m.set(v, (m.get(v) ?? 0) + 1), new Map<string, number>())]
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

    const existing = new Set(rows.map((r) => r.name.trim().toLowerCase()))
    const added: Row[] = []
    for (const [name, entry] of bySpec) {
      if (existing.has(name.toLowerCase())) continue
      const glove_type = mostCommon(entry.types)
      added.push({
        ...blank(),
        name,
        glove_type,
        color: mostCommon(entry.colors),
        default_unit: mostCommon(entry.units) || DEFAULT_UNIT,
        size_sequence: sizeSequenceFor(null, name).join(', '),
      })
    }

    if (!added.length) { setMessage('새로 가져올 품목이 없습니다.'); return }
    setRows((p) => [...p, ...added])
    setSaved(false)
    setMessage(`${added.length}건을 불러왔습니다. 확인 후 저장하세요.`)
  }

  if (!loaded) return null

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">품목 마스터</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            거래 입력 시 선택 목록으로 쓰이며, 선택하면 재질·색상·단위가 자동 입력됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={importFromTransactions}>
            <Download className="h-4 w-4 mr-1" />거래 데이터에서 가져오기
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setRows((p) => [...p, blank()]); setSaved(false) }}>
            <Plus className="h-4 w-4 mr-1" />행 추가
          </Button>
          <Button size="sm" onClick={save} disabled={saving || saved}>
            {saved ? '저장됨' : saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-muted/40 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">품목 마스터 쓰는 법</p>
        <p>1. 여기에 자주 쓰는 품목을 등록해 둡니다 (품목명·재질·색상·단위·사이즈 순서).</p>
        <p>2. 거래 등록/수정의 품목 명세에서 <b>품목명 칸을 클릭</b>하면 등록한 목록이 뜨고, 고르면 재질·색상·단위가 자동으로 채워집니다.</p>
        <p>3. <b>행 추가</b>를 누르면 여기 적어둔 <b>사이즈 순서</b>대로 다음 사이즈가 자동 입력됩니다. XS 가 있는 품목만 순서에 &lsquo;XS&rsquo;를 넣어 주세요 (예: A1 라텍스 → <code>XS, S, M, L</code>).</p>
        <p>4. 사이즈·색상 드롭다운도 선택한 품목에 등록된 값만 보입니다. 목록에 없는 값도 직접 타이핑해 넣을 수 있습니다.</p>
        <p>5. 처음이라면 <b>거래 데이터에서 가져오기</b>로 기존 거래에 쓰인 품목을 한 번에 불러온 뒤 다듬으세요.</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      )}
      {message && (
        <div className="rounded-md border bg-muted/50 px-4 py-2 text-sm text-muted-foreground">{message}</div>
      )}

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>품목명 *</TableHead>
              <TableHead className="w-28">재질</TableHead>
              <TableHead className="w-32">색상</TableHead>
              <TableHead className="w-20">단위</TableHead>
              <TableHead className="w-40">사이즈 순서</TableHead>
              <TableHead className="w-16 text-center">사용</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r._key}>
                <TableCell className="p-1">
                  <Input className="h-8 text-sm" value={r.name} onChange={(e) => upd(r._key, 'name', e.target.value)} />
                </TableCell>
                <TableCell className="p-1">
                  <Input className="h-8 text-sm" list="dl-products-glove-type" value={r.glove_type}
                    onChange={(e) => upd(r._key, 'glove_type', e.target.value)} />
                </TableCell>
                <TableCell className="p-1">
                  <Input className="h-8 text-sm" value={r.color} onChange={(e) => upd(r._key, 'color', e.target.value)} />
                </TableCell>
                <TableCell className="p-1">
                  <Input className="h-8 text-sm" value={r.default_unit} onChange={(e) => upd(r._key, 'default_unit', e.target.value)} />
                </TableCell>
                <TableCell className="p-1">
                  <Input className="h-8 text-sm" value={r.size_sequence} placeholder="XS, S, M, L"
                    onChange={(e) => upd(r._key, 'size_sequence', e.target.value)} />
                </TableCell>
                <TableCell className="p-1 text-center">
                  <Checkbox checked={r.is_active} onCheckedChange={(v) => upd(r._key, 'is_active', !!v)} />
                </TableCell>
                <TableCell className="p-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => { setRows((p) => p.filter((x) => x._key !== r._key)); setSaved(false) }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                  등록된 품목이 없습니다. &lsquo;거래 데이터에서 가져오기&rsquo; 또는 &lsquo;행 추가&rsquo;로 등록하세요.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <datalist id="dl-products-glove-type">
        {GLOVE_TYPES.map((t) => <option key={t} value={t} />)}
      </datalist>
    </div>
  )
}
