import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const [{ data: txs }, { data: interims }, { data: closings }] = await Promise.all([
    supabase
      .from('v_transaction_status')
      .select('round_no,round_label,order_no,import_amount_usd,margin_rate_pct,settlement_status,lc_open_date,customs_date,manufacturers(name)')
      .order('round_no'),
    supabase
      .from('interim_settlements')
      .select('confirmed_amount_krw,customs_exchange_rate,paid_date,is_paid,transactions(round_label,round_no)')
      .order('transaction_id'),
    supabase
      .from('closing_settlements')
      .select('confirmed_amount_krw,closing_date,bok_exchange_rate,is_paid,paid_date,transactions(round_label,round_no)')
      .order('transaction_id'),
  ])

  const wb = XLSX.utils.book_new()

  // 시트 1: 거래현황
  const txRows = (txs ?? []).map((t) => {
    const mfr = Array.isArray(t.manufacturers) ? t.manufacturers[0] : t.manufacturers
    return {
      '차수': t.round_no,
      '라벨': t.round_label,
      '발주번호': t.order_no ?? '',
      '제조사': (mfr as { name: string } | null)?.name ?? '',
      '수입금액(USD)': t.import_amount_usd ?? '',
      '마진율(%)': t.margin_rate_pct ?? '',
      '상태': t.settlement_status,
      'LC개설일': t.lc_open_date ?? '',
      '통관일': t.customs_date ?? '',
    }
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), '거래현황')

  // 시트 2: 중간정산 요약
  const intRows = (interims ?? []).map((s) => {
    const tx = Array.isArray(s.transactions) ? s.transactions[0] : s.transactions
    return {
      '차수': (tx as { round_no: number } | null)?.round_no ?? '',
      '라벨': (tx as { round_label: string } | null)?.round_label ?? '',
      '지급액(KRW)': s.confirmed_amount_krw ?? '',
      '통관환율': s.customs_exchange_rate ?? '',
      '지불완료': s.is_paid ? 'Y' : 'N',
      '정산일': s.paid_date ?? '',
    }
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(intRows), '중간정산')

  // 시트 3: 클로징정산 요약
  const clsRows = (closings ?? []).map((s) => {
    const tx = Array.isArray(s.transactions) ? s.transactions[0] : s.transactions
    return {
      '차수': (tx as { round_no: number } | null)?.round_no ?? '',
      '라벨': (tx as { round_label: string } | null)?.round_label ?? '',
      '최종정산액(KRW)': s.confirmed_amount_krw ?? '',
      '한국은행환율': s.bok_exchange_rate ?? '',
      '클로징일': s.closing_date ?? '',
      '지불완료': s.is_paid ? 'Y' : 'N',
      '정산일': s.paid_date ?? '',
    }
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clsRows), '클로징정산')

  const raw = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as number[]
  const blob = new Blob([new Uint8Array(raw)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  return new Response(blob, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="toei-a1-settlement-${today}.xlsx"`,
    },
  })
}
