/**
 * 포워딩은 물건을 받은 뒤에 청구가 오므로 견적은 볼 일이 없다 — 실청구만 공급가·부가세 포함 둘로 낸다
 * (담당자 2026-10-06). amount_krw 가 공급가, vat_amount_krw 가 그 항목의 부가세다.
 */
export function aggregateForwardingQuotes(
  quotes: Array<{
    forwarder_name: string
    forwarding_quote_items: Array<{
      item_type: string
      amount_krw: number | string | null
      vat_amount_krw: number | string | null
    }>
  }>
): Array<{
  forwarderName: string
  actualSupplyKrw: number
  actualWithVatKrw: number
}> {
  return quotes.map(q => {
    const invoice = q.forwarding_quote_items.filter(i => i.item_type === 'invoice')
    const supply = invoice.reduce((s, i) => s + Number(i.amount_krw ?? 0), 0)
    const vat = invoice.reduce((s, i) => s + Number(i.vat_amount_krw ?? 0), 0)
    return { forwarderName: q.forwarder_name, actualSupplyKrw: supply, actualWithVatKrw: supply + vat }
  })
}
