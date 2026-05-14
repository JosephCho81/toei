import { NextRequest, NextResponse } from 'next/server'
import { getBokExchangeRate } from '@/lib/api/bok'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  if (!date || !/^\d{8}$/.test(date)) {
    return NextResponse.json({ error: 'date 파라미터가 필요합니다. (YYYYMMDD)' }, { status: 400 })
  }

  const isoDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`

  // 캐시 조회
  const supabase = await createClient()
  const { data: cached } = await supabase
    .from('exchange_rate_cache')
    .select('rate_krw')
    .eq('date', isoDate)
    .single()

  if (cached) {
    return NextResponse.json({ date: isoDate, rate: cached.rate_krw, source: 'cache' })
  }

  // 한국은행 API 조회
  const rate = await getBokExchangeRate(date)

  if (!rate) {
    return NextResponse.json({ error: '해당 날짜의 환율을 조회할 수 없습니다. (휴일 등)' }, { status: 404 })
  }

  // 캐시 저장
  await supabase.from('exchange_rate_cache').upsert({ date: isoDate, rate_krw: rate })

  return NextResponse.json(
    { date: isoDate, rate, source: 'bok_ecos' },
    { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate' } }
  )
}
