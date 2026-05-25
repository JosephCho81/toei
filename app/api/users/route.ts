import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin(): Promise<NextResponse | null> {
  // AUTH_RESTORE: uncomment body when auth is re-enabled (see proxy.ts)
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user || user.user_metadata?.role !== 'admin') {
  //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // }
  return null
}

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: data.users })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, role } = await req.json()
    if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { role: role ?? 'viewer' },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ user: data.user })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
