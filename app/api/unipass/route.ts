import { NextResponse } from 'next/server'
import { fetchUnipassCargo } from '@/lib/tracking/unipass'

/**
 * 유니패스 화물통관진행정보 조회 프록시.
 * 인증키가 브라우저로 새어나가면 안 되므로 서버에서만 호출한다.
 */
export async function POST(request: Request) {
  // AUTH_RESTORE: 로그인이 꺼져 있는 동안(proxy.ts AUTH_DISABLED) 로그인 검사는 항상 401 을 내고
  // 로그인 화면도 /payments 로 튕겨, 직원이 B/L 조회를 할 방법이 없었다(2026-09-18).
  // 사내 전용이라 누구나 조회해도 된다는 담당자 결정. 로그인 복원 시 아래를 되살린다.
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) {
  //   return NextResponse.json({ ok: false, reason: 'error', message: '로그인이 필요합니다.' }, { status: 401 })
  // }

  const { blNo, cargoNo, blYear } = await request.json()
  const result = await fetchUnipassCargo({
    blNo: blNo ? String(blNo) : null,
    cargoNo: cargoNo ? String(cargoNo) : null,
    blYear: blYear ? String(blYear) : null,
    apiKey: process.env.UNIPASS_API_KEY_CARGO,
  })
  return NextResponse.json(result)
}
