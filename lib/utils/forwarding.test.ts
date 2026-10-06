import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateForwardingQuotes } from './forwarding.ts'

test('포워딩은 청구 항목만 공급가·부가세 포함 둘로 합친다 — 견적 항목은 넣지 않는다', () => {
  const [r] = aggregateForwardingQuotes([{
    forwarder_name: 'A',
    forwarding_quote_items: [
      { item_type: 'quote', amount_krw: 999_999, vat_amount_krw: 99_999 },
      { item_type: 'invoice', amount_krw: '100000', vat_amount_krw: '10000' },
      { item_type: 'invoice', amount_krw: 50_000, vat_amount_krw: null },
    ],
  }])
  assert.deepEqual(r, { forwarderName: 'A', actualSupplyKrw: 150_000, actualWithVatKrw: 160_000 })
})
