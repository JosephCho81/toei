import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // AUTH_RESTORE: enable role check when auth is re-enabled (see proxy.ts)
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user || user.user_metadata?.role !== 'admin') {
  //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // }
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
