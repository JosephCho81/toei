import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const admin = createAdminClient()

    const update: Record<string, unknown> = {}
    if (body.role !== undefined) update.user_metadata = { role: body.role }
    if (body.banned !== undefined) update.ban_duration = body.banned ? '87600h' : 'none'

    const { data, error } = await admin.auth.admin.updateUserById(id, update)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ user: data.user })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
