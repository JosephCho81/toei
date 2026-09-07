'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TABLE, TABLE_WRAP, TH, TD, THEAD_ROW, CENTER, zebra } from '@/components/ui/table-style'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { MasterTabs } from '@/components/masters/MasterTabs'

interface Manufacturer {
  id: string
  name: string
  name_aliases: string[]
  country: string
  notes: string | null
}

export default function ManufacturersPage() {
  const supabase = createClient()
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Manufacturer | null>(null)
  const [form, setForm] = useState({ name: '', country: 'JP', notes: '', name_aliases: '' })
  const [saving, setSaving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('manufacturers').select('*').order('name')
    setManufacturers(data ?? [])
  }, [supabase])

  useEffect(() => {
    async function run() { await load() }
    run()
  }, [load])

  function openNew() {
    setEditing(null)
    setForm({ name: '', country: 'JP', notes: '', name_aliases: '' })
    setShowForm(true)
  }

  function openEdit(m: Manufacturer) {
    setEditing(m)
    setForm({ name: m.name, country: m.country, notes: m.notes ?? '', name_aliases: m.name_aliases.join(', ') })
    setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    const aliases = form.name_aliases.split(',').map((s) => s.trim()).filter(Boolean)
    const payload = { name: form.name, country: form.country, notes: form.notes || null, name_aliases: aliases }

    if (editing) {
      await supabase.from('manufacturers').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('manufacturers').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function handleDelete(id: string) {
    setDeleteError(null)
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('manufacturer_id', id)
    if ((count ?? 0) > 0) {
      setDeleteError('이 제조사에 연결된 거래가 있어 삭제할 수 없습니다.')
      return
    }
    await supabase.from('manufacturers').delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <MasterTabs />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: '#1B5E20' }}>제조사 관리</h2>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />추가</Button>
      </div>

      {deleteError && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {deleteError}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editing ? '제조사 수정' : '새 제조사'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>이름 *</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>국가</Label>
                <Input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>별칭 (쉼표로 구분)</Label>
                <Input value={form.name_aliases} onChange={(e) => setForm((p) => ({ ...p, name_aliases: e.target.value }))} placeholder="하르텔레가, 하텔레 가" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>메모</Label>
                <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !form.name}>저장</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={TABLE_WRAP}>
        <table className={TABLE}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH}>이름</th>
              <th className={TH}>국가</th>
              <th className={TH}>별칭</th>
              <th className={TH}>메모</th>
              <th className={cn(TH, 'w-20')} />
            </tr>
          </thead>
          <tbody>
            {manufacturers.map((m, i) => (
              <tr key={m.id} className={cn('border-t', zebra(i))}>
                <td className={cn(TD, 'font-semibold')}>{m.name}</td>
                <td className={TD}>{m.country}</td>
                <td className={cn(TD, 'text-muted-foreground')}>{m.name_aliases.join(', ')}</td>
                <td className="px-3 py-2.5 align-middle text-muted-foreground">{m.notes ?? '-'}</td>
                <td className={cn(TD, CENTER)}>
                  <span className="inline-flex gap-1">
                    <button
                      type="button"
                      aria-label="수정"
                      onClick={() => openEdit(m)}
                      className="rounded-sm border bg-white p-1 text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="삭제"
                      onClick={() => handleDelete(m.id)}
                      className="rounded-sm border bg-white p-1 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {!manufacturers.length && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  등록된 제조사가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
