import { NextRequest, NextResponse } from 'next/server'
import { detectCarrier } from '@/lib/tracking/prefixes'
import { getMaerskTracking } from '@/lib/api/maersk'
import { getHapagTracking } from '@/lib/api/hapag'

export async function POST(req: NextRequest) {
  const { containerNo } = await req.json()

  if (!containerNo || typeof containerNo !== 'string') {
    return NextResponse.json({ error: '컨테이너 번호가 필요합니다.' }, { status: 400 })
  }

  const normalized = containerNo.toUpperCase().replace(/\s/g, '')
  const carrierInfo = detectCarrier(normalized)

  if (carrierInfo.apiType === 'manual') {
    return NextResponse.json({
      apiSupported: false,
      carrier: carrierInfo.carrier,
      trackingUrl: carrierInfo.trackingUrl,
    })
  }

  try {
    let result
    if (carrierInfo.apiType === 'maersk_official') {
      result = await getMaerskTracking(normalized)
    } else if (carrierInfo.apiType === 'hapag_official') {
      result = await getHapagTracking(normalized)
    }

    return NextResponse.json({
      apiSupported: true,
      carrier: carrierInfo.carrier,
      ...result,
    })
  } catch (error) {
    console.error('Tracking API error:', error)
    return NextResponse.json({
      apiSupported: false,
      carrier: carrierInfo.carrier,
      trackingUrl: carrierInfo.trackingUrl,
      error: '자동 조회에 실패했습니다. 수기 입력을 이용해주세요.',
    })
  }
}
