import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchUnipassCargo } from '@/lib/tracking/unipass'

/**
 * 유니패스 화물통관진행정보 조회 프록시.
 * 인증키가 브라우저로 새어나가면 안 되므로 서버에서만 호출한다.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, reason: 'error', message: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { blNo, cargoNo, blYear } = await request.json()
  const result = await fetchUnipassCargo({
    blNo: blNo ? String(blNo) : null,
    cargoNo: cargoNo ? String(cargoNo) : null,
    blYear: blYear ? String(blYear) : null,
    apiKey: process.env.UNIPASS_API_KEY_CARGO,
  })
  return NextResponse.json(result)
}
