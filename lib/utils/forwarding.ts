export function aggregateForwardingQuotes(
  quotes: Array<{
    forwarder_name: string
    forwarding_quote_items: Array<{
      item_type: string
      amount_krw: number | string | null
    }>
  }>
): Array<{
  forwarderName: string
  quoteAmountKrw: number
  actualAmountKrw: number
}> {
  return quotes.map(q => ({
    forwarderName: q.forwarder_name,
    quoteAmountKrw: q.forwarding_quote_items
      .filter(i => i.item_type === 'quote')
      .reduce((s, i) => s + Number(i.amount_krw ?? 0), 0),
    actualAmountKrw: q.forwarding_quote_items
      .filter(i => i.item_type === 'invoice')
      .reduce((s, i) => s + Number(i.amount_krw ?? 0), 0),
  }))
}
