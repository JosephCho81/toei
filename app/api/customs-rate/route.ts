import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchCustomsRate } from '@/lib/tracking/customsRate'

/** 관세청 고시 통관환율 조회 프록시. 인증키는 서버에만 둔다. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, reason: 'error', message: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { customsDate, currency } = await request.json()
  const result = await fetchCustomsRate({
    customsDate: customsDate ? String(customsDate) : null,
    currency: currency ? String(currency) : 'USD',
    apiKey: process.env.UNIPASS_API_KEY_FXRATE,
  })
  return NextResponse.json(result)
}
