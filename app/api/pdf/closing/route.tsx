import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { ClosingPdfDocument } from '@/lib/pdf/ClosingPdfTemplate'
import { buildClosingPdfData } from '@/lib/pdf/closingPdfData'

export async function GET(req: NextRequest) {
  const settlementId = new URL(req.url).searchParams.get('settlementId')
  if (!settlementId) {
    return NextResponse.json({ error: 'settlementId 파라미터가 필요합니다.' }, { status: 400 })
  }

  const built = await buildClosingPdfData(await createClient(), settlementId)
  if (!built) {
    return NextResponse.json({ error: '정산 데이터를 찾을 수 없습니다.' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(ClosingPdfDocument, { data: built.data }) as any)

  const filename = `closing-${built.roundLabel}-${built.issuedAt}.pdf`
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="closing-settlement.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
