import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
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
