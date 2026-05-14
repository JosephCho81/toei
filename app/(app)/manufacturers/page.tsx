'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2 } from 'lucide-react'

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

  async function load() {
    const { data } = await supabase.from('manufacturers').select('*').order('name')
    setManufacturers(data ?? [])
  }

  useEffect(() => { load() }, [])

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
    if (!confirm('정말 삭제하시겠습니까?')) return
    await supabase.from('manufacturers').delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">제조사 관리</h2>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />추가</Button>
      </div>

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

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>국가</TableHead>
              <TableHead>별칭</TableHead>
              <TableHead>메모</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {manufacturers.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell>{m.country}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.name_aliases.join(', ')}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.notes ?? '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!manufacturers.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  등록된 제조사가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
