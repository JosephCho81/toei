type Item = {
  spec: string | null; size: string | null; quantity: number | null
  color: string | null; glove_type: string | null; unit: string | null
  unit_price_usd: number | null; sort_order: number
}

export type TxRow = {
  id: string; round_no: number; round_label: string; order_no: string | null
  lc_open_date: string | null; settlement_status: string; is_locked: boolean
  manufacturers: { name: string } | { name: string }[] | null
  transaction_items: Item[] | null
  containers: { etd: string | null; eta: string | null }[] | null
  delivery_dates: Array<{ seq: number; date: string }> | null
}

export interface ContainerRow {
  _key: string
  container_no: string
  carrier: string
  etd: string
  eta: string
}
