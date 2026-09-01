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
import { GLOVE_TYPES } from '@/components/transactions/ItemDatalists'
import {
  blankProductRow, importProductsFromTransactions, loadProductRows, saveProductRows,
  type ProductRow as Row,
} from '@/lib/products/masterRows'

export default function ProductsPage() {
  const [supabase] = useState(createClient)
  const [rows, setRows] = useState<Row[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setRows(await loadProductRows(supabase))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
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
    const errors = await saveProductRows(supabase, rows)
    await load()
    setSaving(false)
    if (errors.length) { setError(errors[0]); return }
    setSaved(true)
  }

  async function importFromTransactions() {
    setError(null); setMessage(null)
    try {
      const added = await importProductsFromTransactions(supabase, rows)
      if (!added.length) { setMessage('새로 가져올 품목이 없습니다.'); return }
      setRows((p) => [...p, ...added])
      setSaved(false)
      setMessage(`${added.length}건을 불러왔습니다. 확인 후 저장하세요.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
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
          <Button size="sm" variant="outline" onClick={() => { setRows((p) => [...p, blankProductRow()]); setSaved(false) }}>
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
