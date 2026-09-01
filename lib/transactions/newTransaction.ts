import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_UNIT } from '@/lib/constants/units'
import { parseIntegerStrict, parseKrwAmount } from '@/lib/utils/number'
import type { ItemRow } from '@/components/transactions/ItemsInputSection'

export interface ContainerRow {
  _key: string
  container_no: string
  carrier: string
  etd: string
  eta: string
}

export interface DeliveryDateRow {
  _key: string
  date: string
}

export interface ForwardingDetailRow {
  _key: string
  item_name: string
  quote_amount_krw: string
  actual_amount_krw: string
  is_vat_taxable: boolean
}

export interface ForwardingRow {
  _key: string
  forwarder_name: string
  quote_date: string
  details: ForwardingDetailRow[]
}

const DEFAULT_FORWARDING_ITEMS = ['해상운임', '터미널 처리비(THC)', '서류발급비(D/O Fee)', '내륙운송비', '기타운임']

export function blankDetail(item_name = ''): ForwardingDetailRow {
  return {
    _key: crypto.randomUUID(), item_name,
    quote_amount_krw: '', actual_amount_krw: '', is_vat_taxable: false,
  }
}

export function blankContainer(): ContainerRow {
  return { _key: crypto.randomUUID(), container_no: '', carrier: '', etd: '', eta: '' }
}

export function blankForwarding(): ForwardingRow {
  return {
    _key: crypto.randomUUID(),
    forwarder_name: '오션마스터',
    quote_date: '',
    details: DEFAULT_FORWARDING_ITEMS.map((name) => blankDetail(name)),
  }
}

export interface NewTransactionForm {
  round_no: string
  round_label: string
  order_no: string
  manufacturer_id: string
  import_amount_usd: string
  lc_no: string
  lc_open_date: string
  customs_date: string
  customs_exchange_rate: string
  notes: string
}

export interface NewTransactionInput {
  form: NewTransactionForm
  items: ItemRow[]
  containers: ContainerRow[]
  forwardings: ForwardingRow[]
  deliveryDates: DeliveryDateRow[]
}

/**
 * 등록 전 검증. 통과하면 null.
 * 수량이 소수·음수면 저장 시 조용히 잘리거나 비어버리므로 여기서 막는다.
 */
export function validateNewTransaction(input: NewTransactionInput): string | null {
  const { form, items } = input
  if (!form.round_no || !form.round_label) return '차수 번호와 라벨은 필수입니다.'
  const badQty = items.find((r) => r.quantity.trim() !== '' && parseIntegerStrict(r.quantity) == null)
  if (badQty) {
    return `수량은 0 이상 정수만 입력할 수 있습니다: '${badQty.spec || '품목'}' 의 '${badQty.quantity}'`
  }
  return null
}

/** 거래 + 품목 + 컨테이너 + 포워딩 견적을 저장하고 새 거래 id 를 돌려준다. */
export async function createTransaction(
  supabase: SupabaseClient,
  input: NewTransactionInput,
): Promise<string> {
  const { form, items, containers, forwardings, deliveryDates } = input

  const { data, error } = await supabase.from('transactions').insert({
    round_no: parseInt(form.round_no),
    round_label: form.round_label,
    order_no: form.order_no || null,
    manufacturer_id: form.manufacturer_id || null,
    import_amount_usd: form.import_amount_usd ? parseFloat(form.import_amount_usd) : null,
    lc_no: form.lc_no || null,
    lc_open_date: form.lc_open_date || null,
    customs_date: form.customs_date || null,
    customs_exchange_rate: form.customs_exchange_rate ? parseFloat(form.customs_exchange_rate) : null,
    notes: form.notes || null,
    delivery_dates: deliveryDates.length > 0
      ? deliveryDates.map((d, i) => ({ seq: i + 1, date: d.date }))
      : null,
  }).select('id').single()
  if (error) throw error

  const transactionId = data.id as string

  const validItems = items.filter((r) => r.spec || r.quantity || r.unit_price_usd)
  if (validItems.length > 0) {
    await supabase.from('transaction_items').insert(validItems.map((r, i) => ({
      transaction_id: transactionId,
      spec: r.spec || null, glove_type: r.glove_type || null,
      color: r.color || null, size: r.size || null,
      unit_price_usd: r.unit_price_usd ? parseFloat(r.unit_price_usd) : null,
      quantity: r.quantity.trim() ? parseIntegerStrict(r.quantity) : null,
      unit: r.unit || DEFAULT_UNIT,
      sort_order: i,
    })))
  }

  const validContainers = containers.filter((r) => r.container_no || r.etd || r.eta)
  if (validContainers.length > 0) {
    await supabase.from('containers').insert(validContainers.map((r) => ({
      transaction_id: transactionId,
      container_no: r.container_no || null,
      carrier: r.carrier || null,
      etd: r.etd || null,
      eta: r.eta || null,
      api_type: 'manual' as const,
    })))
  }

  for (const [i, r] of forwardings.filter((f) => f.forwarder_name).entries()) {
    const { data: fq } = await supabase.from('forwarding_quotes').insert({
      transaction_id: transactionId,
      forwarder_name: r.forwarder_name,
      quote_date: r.quote_date || null,
      sort_order: i,
    }).select('id').single()
    if (!fq?.id) continue

    // 견적/실청구를 각각 한 행으로 저장한다. 0원 항목은 넣지 않는다.
    const itemRows = r.details.filter((d) => d.item_name).flatMap((d, j) => {
      const quote = parseKrwAmount(d.quote_amount_krw)
      const actual = parseKrwAmount(d.actual_amount_krw)
      return [
        ...(quote ? [{
          forwarding_quote_id: fq.id, item_type: 'quote', item_name: d.item_name,
          amount_krw: quote, is_vat_taxable: false, sort_order: j * 2,
        }] : []),
        ...(actual ? [{
          forwarding_quote_id: fq.id, item_type: 'invoice', item_name: d.item_name,
          amount_krw: actual, is_vat_taxable: d.is_vat_taxable, sort_order: j * 2 + 1,
        }] : []),
      ]
    })
    if (itemRows.length) await supabase.from('forwarding_quote_items').insert(itemRows)
  }

  return transactionId
}
