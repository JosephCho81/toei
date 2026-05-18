import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: existing, error: fetchErr } = await supabase
      .from('interim_settlements')
      .select('notes')
      .eq('id', id)
      .single()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const newNotes = (existing.notes ?? '') + ' [확인완료]'

    const { error } = await supabase
      .from('interim_settlements')
      .update({ notes: newNotes })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
